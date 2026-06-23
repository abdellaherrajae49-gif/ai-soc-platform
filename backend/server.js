'use strict';
/**
 * SOC Platform — Backend API
 * Node.js + Express | Port 5000
 *
 * Routes :
 *   POST /auth/login          → JWT (8h), rôles: employee | expert | admin
 *   GET  /alerts              → alertes Suricata (InfluxDB, 24h)
 *   GET  /alerts/stats        → stats agrégées des alertes
 *   GET  /metrics             → métriques système (CPU/RAM) depuis InfluxDB
 *   GET  /metrics/history     → historique 1h pour graphiques
 *   POST /ai/chat             → proxy Mistral 7B via Ollama
 *   GET  /incidents           → incidents confirmés (7 derniers jours)
 *   GET  /topology            → graphe réseau Neo4j
 *   GET  /health              → healthcheck public
 *
 * Déploiement : /opt/soc-backend/server.js
 */

const express    = require('express');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const { InfluxDB } = require('@influxdata/influxdb-client');
const fetch      = require('node-fetch');
const http       = require('http');
const path       = require('path');
const { WebSocketServer } = require('ws');
const multer     = require('multer');
const scanner    = require('./scanner');

// ── Configuration ────────────────────────────────────────────────────────────
const PORT    = parseInt(process.env.PORT || '5000');
const SECRET  = process.env.JWT_SECRET || 'soc-jwt-secret-2026';

const INFLUX_URL   = process.env.INFLUX_URL   || 'http://localhost:8086';
const INFLUX_TOKEN = process.env.INFLUX_TOKEN ||
  'UUWWy5LH1U7dxO628plHnSke5LomQXCZn6AAwkW0tI_a4t69wxfig7bgPuPnlZpWLNQjDDYAqBiB900pzkstQQ==';
const INFLUX_ORG   = process.env.INFLUX_ORG   || 'SOC-PFA-YAOE';

const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://192.168.7.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b-instruct-q4_0';

const NEO4J_URI  = process.env.NEO4J_URI  || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASS = process.env.NEO4J_PASS || 'abd3llah';

// ── Utilisateurs (PROD: remplacer par BDD) ────────────────────────────────────
const USERS = {
  employee1: { password: 'emp123',   role: 'employee' },
  employee2: { password: 'emp456',   role: 'employee' },
  expert1:   { password: 'exp123',   role: 'expert'   },
  expert2:   { password: 'exp456',   role: 'expert'   },
  admin:     { password: 'abd3llah', role: 'admin'    },
};

// ── InfluxDB ──────────────────────────────────────────────────────────────────
const influxClient = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
const queryApi     = influxClient.getQueryApi(INFLUX_ORG);

// ── Neo4j (optionnel, ne bloque pas si indisponible) ──────────────────────────
let neo4jDriver = null;
try {
  const neo4j = require('neo4j-driver');
  neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));
  console.log('✅ Neo4j driver initialisé');
} catch (e) {
  console.warn('⚠️  Neo4j indisponible:', e.message);
}

// ── App Express ───────────────────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

// Logger middleware
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── WebSocket (alertes temps réel) ────────────────────────────────────────────
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connecté');
  ws.send(JSON.stringify({ type: 'connected', message: 'SOC WebSocket actif' }));
  ws.on('close', () => console.log('🔌 WebSocket client déconnecté'));
});

function broadcastAlert(alert) {
  const payload = JSON.stringify({ type: 'new_alert', data: alert });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}

// ── Middleware auth JWT ───────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou malformé' });
  }
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: `Accès refusé. Rôle requis : ${roles.join(' | ')}` });
    }
    next();
  };
}

// ── Helper InfluxDB ───────────────────────────────────────────────────────────
async function influxQuery(fluxQuery) {
  const rows = [];
  for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
    rows.push(tableMeta.toObject(values));
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    services: {
      influx: !!influxClient,
      neo4j:  !!neo4jDriver,
      ollama: OLLAMA_URL,
    }
  });
});

// ── Auth — Login ──────────────────────────────────────────────────────────────
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'username et password requis' });
  }

  const user = USERS[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  const token = jwt.sign(
    { username, role: user.role, iat: Math.floor(Date.now() / 1000) },
    SECRET,
    { expiresIn: '8h' }
  );

  console.log(`✅ Login : ${username} (${user.role})`);
  return res.json({ token, role: user.role, username });
});

// ── Auth — Verify (validation côté frontend) ──────────────────────────────────
app.get('/auth/me', authMiddleware, (req, res) => {
  res.json({ username: req.user.username, role: req.user.role });
});

// ── Alertes — Liste ───────────────────────────────────────────────────────────
app.get('/alerts', authMiddleware, async (req, res) => {
  const limit    = Math.min(parseInt(req.query.limit)  || 20, 200);
  const hours    = Math.min(parseInt(req.query.hours)  || 24, 168);
  const priority = req.query.priority; // filtre optionnel

  const priorityFilter = priority
    ? `|> filter(fn: (r) => r.priority == "${priority}")`
    : '';

  const query = `
    from(bucket: "suricata_alerts")
      |> range(start: -${hours}h)
      |> filter(fn: (r) => r._measurement == "suricata_alert")
      |> filter(fn: (r) => r._field == "message" or r._field == "priority" or r._field == "classification")
      ${priorityFilter}
      |> pivot(rowKey: ["_time", "src_ip", "dst_ip"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: ${limit})
  `;

  try {
    const rows = await influxQuery(query);
    const alerts = rows.map(r => ({
      id:             `${r._time}-${r.src_ip}-${r.dst_ip}`,
      time:           r._time,
      message:        r.message      || 'N/A',
      src_ip:         r.src_ip       || 'unknown',
      dst_ip:         r.dst_ip       || 'unknown',
      priority:       parseInt(r.priority) || 3,
      classification: r.classification || 'Unclassified',
    }));
    res.json({ count: alerts.length, alerts });
  } catch (err) {
    console.error('InfluxDB error /alerts:', err.message);
    // Fallback : données mockées pour démo
    res.json({
      count: 5,
      _mock: true,
      alerts: generateMockAlerts(5),
    });
  }
});

// ── Alertes — Stats ───────────────────────────────────────────────────────────
app.get('/alerts/stats', authMiddleware, async (req, res) => {
  const query = `
    from(bucket: "suricata_alerts")
      |> range(start: -24h)
      |> filter(fn: (r) => r._measurement == "suricata_alert" and r._field == "message")
      |> group(columns: ["priority"])
      |> count()
  `;
  try {
    const rows  = await influxQuery(query);
    const stats = { p1: 0, p2: 0, p3: 0, total: 0 };
    rows.forEach(r => {
      const p = parseInt(r.priority);
      const c = parseInt(r._value) || 0;
      if (p === 1) stats.p1 += c;
      else if (p === 2) stats.p2 += c;
      else stats.p3 += c;
      stats.total += c;
    });
    res.json(stats);
  } catch (err) {
    console.error('InfluxDB error /alerts/stats:', err.message);
    res.json({ p1: 3, p2: 8, p3: 15, total: 26, _mock: true });
  }
});

// ── Métriques — Dernière valeur ───────────────────────────────────────────────
app.get('/metrics', authMiddleware, async (req, res) => {
  const query = `
    from(bucket: "metrics")
      |> range(start: -5m)
      |> filter(fn: (r) =>
          r._field == "usage_percent" or
          r._field == "used_percent"  or
          r._field == "bytes_recv"    or
          r._field == "bytes_sent"
      )
      |> last()
  `;
  try {
    const rows    = await influxQuery(query);
    const metrics = {};
    rows.forEach(r => {
      const key = `${r._measurement}.${r._field}`;
      metrics[key] = parseFloat(r._value) || 0;
    });
    res.json({ timestamp: new Date().toISOString(), ...metrics });
  } catch (err) {
    console.error('InfluxDB error /metrics:', err.message);
    res.json({
      _mock:               true,
      timestamp:           new Date().toISOString(),
      'cpu.usage_percent': Math.random() * 80 + 10,
      'mem.used_percent':  Math.random() * 60 + 20,
      'disk.used_percent': 45,
      'net.bytes_recv':    Math.random() * 1_000_000,
      'net.bytes_sent':    Math.random() * 500_000,
    });
  }
});

// ── Métriques — Historique pour graphiques ────────────────────────────────────
app.get('/metrics/history', authMiddleware, async (req, res) => {
  const minutes = Math.min(parseInt(req.query.minutes) || 60, 1440);
  const query = `
    from(bucket: "metrics")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) =>
          (r._measurement == "cpu"  and r._field == "usage_percent") or
          (r._measurement == "mem"  and r._field == "used_percent")
      )
      |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
      |> pivot(rowKey: ["_time"], columnKey: ["_measurement"], valueColumn: "_value")
  `;
  try {
    const rows = await influxQuery(query);
    res.json({
      points: rows.map(r => ({
        time: r._time,
        cpu:  parseFloat(r.cpu)  || 0,
        mem:  parseFloat(r.mem)  || 0,
      }))
    });
  } catch (err) {
    console.error('InfluxDB error /metrics/history:', err.message);
    res.json({ points: generateMockMetricsHistory(minutes), _mock: true });
  }
});

// ── Chatbot Mistral ───────────────────────────────────────────────────────────
app.post('/ai/chat', authMiddleware, async (req, res) => {
  const { message, context } = req.body || {};
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'message requis' });
  }

  const systemPrompt = `Tu es un assistant expert en cybersécurité SOC (Security Operations Center).
Tu analyses des alertes de sécurité, des logs Suricata/Wazuh, et tu aides les analystes.
Réponds toujours en français, de manière concise et structurée.
Si on te demande d'analyser une alerte, fournis : sévérité, type d'attaque probable, recommandation.`;

  let topoContext = "";
  if (neo4jDriver && message.toLowerCase().includes("topologie") || message.toLowerCase().includes("réseau") || message.toLowerCase().includes("ip")) {
    try {
      const session = neo4jDriver.session();
      const result = await session.run(`MATCH (n) RETURN n.name AS name, n.ip AS ip`);
      const nodes = result.records.length > 0 
        ? result.records.map(r => `${r.get('name')} (${r.get('ip')})`).join(", ")
        : "Serveur-Web (192.168.10.10), Base-de-Donnees (192.168.10.20), Poste-Client-Admin (192.168.10.50), Routeur-Principal (192.168.10.1)";
      topoContext = `\n\nContexte de la topologie réseau actuelle (Neo4j):\nMachines détectées: ${nodes}`;
      await session.close();
    } catch (e) {
      console.warn("Erreur récupération topologie pour IA:", e.message);
    }
  }

  const prompt = (context || topoContext)
    ? `${systemPrompt}\n\nContexte:\n${context || ''}\n${topoContext}\n\nQuestion: ${message}`
    : `${systemPrompt}\n\nQuestion: ${message}`;

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:  OLLAMA_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9, num_predict: 512 },
      }),
      timeout: 60_000,
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}`);
    }

    const data = await response.json();
    return res.json({
      response:  data.response,
      model:     data.model,
      duration:  data.total_duration,
    });
  } catch (err) {
    console.error('Ollama error:', err.message);
    return res.status(503).json({
      error:    'Mistral temporairement indisponible',
      response: '⚠️ Le service IA est actuellement hors ligne. Vérifiez que Ollama tourne sur le host Windows.'
    });
  }
});

// ── Incidents ─────────────────────────────────────────────────────────────────
app.get('/incidents', authMiddleware, async (req, res) => {
  const days  = Math.min(parseInt(req.query.days) || 7, 30);
  const limit = Math.min(parseInt(req.query.limit) || 50, 500);

  const query = `
    from(bucket: "incidents")
      |> range(start: -${days}d)
      |> filter(fn: (r) => r._measurement == "incident")
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: ${limit})
  `;
  try {
    const rows = await influxQuery(query);
    const incidents = rows.map(r => ({
      id:          r._time,
      time:        r._time,
      description: r.description || 'N/A',
      severity:    r.severity    || 'medium',
      src_ip:      r.src_ip      || 'unknown',
      status:      r.status      || 'open',
    }));
    res.json({ count: incidents.length, incidents });
  } catch (err) {
    console.error('InfluxDB error /incidents:', err.message);
    res.json({ count: 0, incidents: [], _mock: true });
  }
});

// ── Incidents — Créer (expert + admin) ────────────────────────────────────────
app.post('/incidents', authMiddleware, roleMiddleware('expert', 'admin'), async (req, res) => {
  const { description, severity, src_ip } = req.body || {};
  if (!description) return res.status(400).json({ error: 'description requise' });

  // En production: écrire dans InfluxDB via writeApi
  const incident = {
    id:          Date.now().toString(),
    time:        new Date().toISOString(),
    description,
    severity:    severity || 'medium',
    src_ip:      src_ip  || 'unknown',
    status:      'open',
    created_by:  req.user.username,
  };

  broadcastAlert({ type: 'new_incident', data: incident });
  res.status(201).json({ message: 'Incident créé', incident });
});

// ── Topologie réseau Neo4j ────────────────────────────────────────────────────
app.get('/topology', authMiddleware, async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: getMockTopologyNodes(), edges: getMockTopologyEdges(), _mock: true });
  }

  const session = neo4jDriver.session();
  try {
    const result = await session.run(`
      MATCH (n)-[r]->(m)
      RETURN n, r, m
      LIMIT 100
    `);

    const nodesMap = new Map();
    const edges    = [];

    result.records.forEach(record => {
      const src  = record.get('n');
      const rel  = record.get('r');
      const dest = record.get('m');

      [src, dest].forEach(node => {
        if (!nodesMap.has(node.identity.toString())) {
          nodesMap.set(node.identity.toString(), {
            id:    node.identity.toString(),
            label: node.labels[0] || 'Node',
            props: node.properties,
          });
        }
      });

      edges.push({
        source: src.identity.toString(),
        target: dest.identity.toString(),
        type:   rel.type,
        props:  rel.properties,
      });
    });

    res.json({ nodes: [...nodesMap.values()], edges });
  } catch (err) {
    console.error('Neo4j error:', err.message);
    res.json({ nodes: getMockTopologyNodes(), edges: getMockTopologyEdges(), _mock: true });
  } finally {
    await session.close();
  }
});

// ── Admin — Statistiques globales ─────────────────────────────────────────────
app.get('/admin/stats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  res.json({
    activeAgents:  4,
    totalAlerts:   'voir /alerts/stats',
    uptimeSec:     process.uptime(),
    nodeVersion:   process.version,
    memUsage:      process.memoryUsage(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOUVELLES ROUTES (Intégration Lovable & VulnScan)
// ═══════════════════════════════════════════════════════════════════════════════

// ── Actions Actives — Bloquer une IP ──────────────────────────────────────────
app.post('/api/actions/block-ip', authMiddleware, roleMiddleware('expert', 'admin'), async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP requise' });
  const { execSync } = require('child_process');
  try {
    execSync(`iptables -A INPUT -s ${ip} -j DROP`);
    broadcastAlert({ type: 'ip_blocked', ip, by: req.user.username });
    res.json({ success: true, message: `IP ${ip} bloquée` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Actions Actives — Isoler un Host ──────────────────────────────────────────
app.post('/api/actions/isolate-host', authMiddleware, roleMiddleware('expert', 'admin'), async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP requise' });
  const { execSync } = require('child_process');
  try {
    execSync(`iptables -A INPUT -s ${ip} -j DROP`);
    execSync(`iptables -A OUTPUT -d ${ip} -j DROP`);
    broadcastAlert({ type: 'host_isolated', ip, by: req.user.username });
    res.json({ success: true, message: `Host ${ip} isolé` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Académie (Encyclopédie IA) ────────────────────────────────────────────────
app.get('/api/academy/:topic', authMiddleware, async (req, res) => {
  const topic = req.params.topic;
  const prompt = `Tu es un expert SOC. Explique l'attaque/concept suivant en français de manière structurée :
  Sujet : ${topic}
  Format de réponse :
  1. Description (2-3 phrases)
  2. Comment ça fonctionne (étapes)
  3. Exemple de log/indicateur
  4. Mitigation recommandée`;
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      timeout: 60000,
    });
    const data = await response.json();
    res.json({ topic, explanation: data.response });
  } catch (e) {
    res.status(503).json({ error: 'Mistral indisponible', topic });
  }
});

const upload = multer({ dest: 'uploads/' });

// ── Proxy Scan Mobile (vers VulnScan FastAPI + local) ───────────────────────
app.post('/api/scans/mobile', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier uploadé.' });
  }

  const originalName = req.file.originalname;
  const filePath = req.file.path;

  try {
    const results = await scanner.analyzeAPK(filePath, originalName);
    
    // Check if critical
    const hasCritical = results.some(r => r.severity === 'CRITICAL' || r.severity === 'HIGH');
    if (hasCritical) {
      broadcastAlert({ type: 'vulnscan_alert', severity: 'HIGH', app_name: originalName, findings: results });
    }

    res.json({ success: true, message: 'Scan terminé avec succès', results });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: 'Erreur lors de l\'analyse de l\'APK.' });
  }
});

// ── Webhook: Réception d'une alerte critique depuis VulnScan ──────────────────
app.post('/api/webhook/vulnscan', async (req, res) => {
  const { severity, app_name, findings } = req.body || {};
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    broadcastAlert({ type: 'vulnscan_alert', severity, app_name, findings });
    // Notifier Discord via webhook
    await fetch(process.env.DISCORD_WEBHOOK || '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🚨 **VulnScan Alert** — ${app_name}\nSévérité : **${severity}**\nFindings : ${findings?.length || 0}`
      })
    }).catch(() => {});
  }
  res.json({ received: true });
});

// ── ML Predict (Priorité 2.4) ───────────────────────────────────────────────────
const ML_MODEL_DIR = path.join(__dirname, '..', 'ml', 'models');
const ML_SCRIPT    = path.join(__dirname, '..', 'ml', 'ml_predict.py');
const LOCAL_VENV_PYTHON = process.platform === 'win32'
  ? path.join(__dirname, '..', '.venv', 'Scripts', 'python.exe')
  : path.join(__dirname, '..', '.venv', 'bin', 'python');
const PYTHON_BIN   = process.env.PYTHON_BIN || (
  require('fs').existsSync(LOCAL_VENV_PYTHON)
    ? `"${LOCAL_VENV_PYTHON}"`
    : (process.platform === 'win32' ? 'py -3' : 'python3')
);

function runPythonInline(code, payload) {
  const escapedPayload = JSON.stringify(payload).replace(/"/g, '\\"');
  return require('child_process').execSync(
    `${PYTHON_BIN} -c "${code}" "${escapedPayload}"`,
    {
      env: { ...process.env, MODEL_DIR: ML_MODEL_DIR, PYTHONIOENCODING: 'utf-8' },
      encoding: 'utf8',
    }
  );
}

app.post('/api/ml/predict', authMiddleware, async (req, res) => {
  const alert = req.body; // { priority, src_port, dst_port, packet_count, alert_frequency, hour_of_day, is_internal_src, bytes_total, duration_sec }
  try {
    const result = runPythonInline(
      `import json,sys,os; os.environ['MODEL_DIR']='${ML_MODEL_DIR.replace(/\\/g, '/')}'; sys.path.insert(0,'${path.join(__dirname,'..','ml').replace(/\\/g,'/')}'); from ml_predict import load_models, predict_alert; m=load_models(); a=json.loads(sys.argv[1]); print(json.dumps(predict_alert(a,m)))`,
      alert
    );
    res.json(JSON.parse(result.trim()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ML Batch Predict ────────────────────────────────────────────────────────
app.post('/api/ml/batch', authMiddleware, async (req, res) => {
  const { alerts } = req.body; // Array of alert objects
  if (!alerts || !Array.isArray(alerts)) return res.status(400).json({ error: 'alerts array required' });
  try {
    const result = runPythonInline(
      `import json,sys,os; os.environ['MODEL_DIR']='${ML_MODEL_DIR.replace(/\\/g, '/')}'; sys.path.insert(0,'${path.join(__dirname,'..','ml').replace(/\\/g,'/')}'); from ml_predict import load_models, batch_predict; m=load_models(); a=json.loads(sys.argv[1]); print(json.dumps(batch_predict(a,m)))`,
      alerts
    );
    res.json(JSON.parse(result.trim()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ML Model Metadata ───────────────────────────────────────────────────────
app.get('/api/ml/metadata', authMiddleware, (req, res) => {
  try {
    const metaPath = path.join(ML_MODEL_DIR, 'metadata.json');
    const meta = JSON.parse(require('fs').readFileSync(metaPath, 'utf8'));
    res.json(meta);
  } catch (e) {
    res.status(500).json({ error: 'Metadata not found. Train models first.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA (fallback si InfluxDB/Neo4j hors ligne)
// ─────────────────────────────────────────────────────────────────────────────
function generateMockAlerts(n = 10) {
  const types = [
    'ET SCAN Possible Nmap User-Agent',
    'ET POLICY SSH Brute Force Attempt',
    'ET MALWARE Suspicious Outbound',
    'ET DOS Excessive Connections',
    'GPL SQL SQL Injection Attempt',
  ];
  return Array.from({ length: n }, (_, i) => ({
    id:             `mock-${i}`,
    time:           new Date(Date.now() - i * 300_000).toISOString(),
    message:        types[i % types.length],
    src_ip:         `192.168.${20 + (i % 3)}.${50 + i}`,
    dst_ip:         '192.168.20.10',
    priority:       (i % 3) + 1,
    classification: i % 2 === 0 ? 'Attempted Information Leak' : 'Attempted Admin Privilege Gain',
  }));
}

function generateMockMetricsHistory(minutes) {
  return Array.from({ length: Math.min(minutes, 60) }, (_, i) => ({
    time: new Date(Date.now() - (minutes - i) * 60_000).toISOString(),
    cpu:  Math.round(30 + Math.sin(i / 5) * 20 + Math.random() * 10),
    mem:  Math.round(45 + Math.cos(i / 8) * 15 + Math.random() * 5),
  }));
}

function getMockTopologyNodes() {
  return [
    { id: '1', label: 'Router',    props: { name: 'R-01 pfSense', ip: '192.168.10.1'  } },
    { id: '2', label: 'Server',    props: { name: 'SOC-Center',   ip: '192.168.10.10' } },
    { id: '3', label: 'Server',    props: { name: 'Server-Cible', ip: '192.168.20.10' } },
    { id: '4', label: 'Attacker',  props: { name: 'Kali-Red',     ip: '192.168.20.50' } },
    { id: '5', label: 'Defender',  props: { name: 'Kali-Blue',    ip: '192.168.30.20' } },
    { id: '6', label: 'Firewall',  props: { name: 'pfSense WAN',  ip: '192.168.7.138' } },
  ];
}

function getMockTopologyEdges() {
  return [
    { source: '6', target: '1', type: 'CONNECTS',  props: { interface: 'WAN' } },
    { source: '1', target: '2', type: 'ROUTES_TO', props: { vlan: 'VMnet2' }  },
    { source: '1', target: '3', type: 'ROUTES_TO', props: { vlan: 'VMnet3' }  },
    { source: '1', target: '5', type: 'ROUTES_TO', props: { vlan: 'VMnet4' }  },
    { source: '4', target: '3', type: 'ATTACKS',   props: { tool: 'nmap' }    },
    { source: '2', target: '3', type: 'MONITORS',  props: { via: 'Wazuh' }    },
    { source: '5', target: '4', type: 'MONITORS',  props: { via: 'Zeek' }     },
  ];
}

// ── Catch-all 404 ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// ── Démarrage ─────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log(`║  🛡️  SOC Backend API — Port ${PORT}           ║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  InfluxDB : ${INFLUX_URL.padEnd(30)}║`);
  console.log(`║  Ollama   : ${OLLAMA_URL.padEnd(30)}║`);
  console.log(`║  Neo4j    : ${NEO4J_URI.padEnd(30)}║`);
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...');
  if (neo4jDriver) await neo4jDriver.close();
  server.close(() => process.exit(0));
});
