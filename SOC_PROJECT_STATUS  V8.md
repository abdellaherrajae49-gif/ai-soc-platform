# 🛡️ SOC PLATFORM — STATUS COMPLET & PLAN D'ACTION
> **Date : 23 Juin 2026 — Version 8.0**
> **Objectif : Tout terminer aujourd'hui**

---

## 📊 PROGRESSION GLOBALE

```
Infrastructure réseau    ██████░░░░  60%
Services SOC             █████████░  92%
Sécurité & IDS           ████████░░  80%
Dashboards Grafana       ██████░░░░  60%
IA & ML                  █████░░░░░  50%
Frontend & Backend       █████░░░░░  50%
Notifications Discord    ███████░░░  65%
VPN & Tunnels            ███░░░░░░░  30%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESSION TOTALE : ~67% 🚀
```

---

## ✅ CE QUI EST FAIT

### Infrastructure & Réseau
- [x] R-01 pfSense Primary — WAN/LAN/DMZ/A3/pfsync configuré
- [x] DHCP sur LAN/DMZ/A3
- [x] NAT Outbound automatique
- [x] OpenVPN Server (UDP 1194, AES-256-GCM, PKI Easy-RSA)
- [x] Suricata IDS sur pfSense (WAN + DMZ + LAN, règles ET Open)
- [x] Firewall rules Allow to any

### SOC-Center (192.168.10.10 / 192.168.7.174)
- [x] InfluxDB 2.7.0 — 5 buckets actifs (metrics, suricata_alerts, logs, incidents, wazuh_events)
- [x] Grafana — 6 dashboards (Sécurité, VMs, Global, Réseau, Incidents, VPN)
- [x] Telegraf → InfluxDB (CPU/RAM/Disk/Net toutes les 10s)
- [x] Suricata 8.0.3 (ens37 + ens33)
- [x] Wazuh Manager 4.14.5 (agents: SOC-Center, Kali-Red, Kali-Blue, Server-Cible)
- [x] Fail2Ban
- [x] Node.js + Express backend (port 5000) — JWT, WebSocket, routes complètes
- [x] Neo4j Community (port 7474/7687)
- [x] rsyslog serveur UDP 514
- [x] **suricata-to-influx.py → service systemd** (converti aujourd'hui ✅)
- [x] analyze.py (Mistral, analyse groupée par corrélations)
- [x] discord_bot.py (notifications temps réel, boutons Bloquer/Ignorer, timer 3 min)
- [x] ML pipeline : train_models.py, ml_predict.py, generate_dataset.py, dataset_alerts.csv

### Server-Cible (192.168.20.10 / 192.168.7.181)
- [x] Apache2 (port 80, page vulnérable XSS/SQLi)
- [x] OpenSSH (cible brute-force, testuser/password123)
- [x] Telegraf → InfluxDB SOC-Center
- [x] Wazuh Agent → Wazuh Manager
- [x] Suricata 8.0.3 (ens37, intra-DMZ)
- [x] **rsyslog client → SOC-Center:514** (validé aujourd'hui ✅)
  - Config : `/etc/rsyslog.d/60-suricata-fastlog.conf`
  - imfile polling fast.log → local6 → forward UDP 514
  - AppArmor corrigé, état imfile nettoyé
  - Testé end-to-end : tcpdump + grep syslog SOC-Center ✅

### Kali-Red (192.168.20.50)
- [x] nmap, hydra, hping3, metasploit, arpspoof, yersinia
- [x] Scripts `/opt/red-team/` (port_scan.sh, brute_ssh.sh, dos_flood.sh, arp_spoof.sh)
- [x] Test validé : scan nmap → alerte Suricata → InfluxDB → Grafana ✅

### Kali-Blue (192.168.30.20)
- [x] Zeek 8.0.5 (eth2)
- [x] ntopng (Docker, port 3001)
- [x] Wazuh Agent

### IA — Ollama + Mistral
- [x] Ollama sur hôte Windows (GTX 1650, CUDA 13.2)
- [x] mistral:7b-instruct-q4_0 téléchargé
- [x] OLLAMA_HOST=0.0.0.0:11434 exposé réseau
- [x] analyze.py optimisé (analyse groupée, corrélations)
- [x] Test : 8 alertes → score 9/10 → recommandation blocage ✅

### Discord Bot
- [x] Application Discord créée (SOC-Center#3560)
- [x] Bot token récupéré
- [x] Bot invité sur serveur STABLEX
- [x] Channel #soc-alerts + webhook configuré
- [x] discord_bot.py déployé sur SOC-Center
- [x] Notifications temps réel avec embeds colorés par priorité
- [x] Boutons 🔴 Bloquer IP / ✅ Ignorer
- [x] Timer 3 min → blocage automatique iptables

### Backend Node.js (/opt/soc-backend/server.js)
- [x] POST /auth/login (JWT 8h, rôles employee/expert/admin)
- [x] GET /auth/me
- [x] GET /alerts (InfluxDB, filtres limit/hours/priority)
- [x] GET /alerts/stats
- [x] GET /metrics + /metrics/history
- [x] POST /ai/chat (proxy Ollama/Mistral)
- [x] GET /incidents + POST /incidents
- [x] GET /topology (Neo4j)
- [x] GET /admin/stats
- [x] WebSocket (alertes temps réel)
- [x] Fallback mock data si InfluxDB/Neo4j hors ligne

---

## ❌ CE QUI RESTE À FAIRE — PAR PRIORITÉ

---

### 🔴 PRIORITÉ 1 — Backend (30 min)

#### 1.1 Ajouter les 4 routes manquantes dans server.js

```javascript
// À ajouter dans /opt/soc-backend/server.js

// ROUTE 1 : Bloquer une IP via iptables
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

// ROUTE 2 : Isoler un host (bloquer tout trafic entrant/sortant)
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

// ROUTE 3 : Encyclopédie cyber (Mistral)
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

// ROUTE 4 : Webhook VulnScan
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
```

**Commande pour appliquer :**
```bash
# Sur SOC-Center
nano /opt/soc-backend/server.js
# Ajouter les 4 routes avant la ligne "app.use((_req, res) => {"
# Puis :
cd /opt/soc-backend && node server.js &
```

---

### 🔴 PRIORITÉ 2 — ML Pipeline (45 min)

#### 2.1 Vérifier l'état des modèles

```bash
# Sur SOC-Center
ls -la /opt/soc-ai/models/
python3 /opt/soc-ai/ml_predict.py
```

#### 2.2 Si les modèles ne sont pas entraînés

```bash
cd /opt/soc-ai
python3 generate_dataset.py
python3 train_models.py
```

#### 2.3 Intégrer ml_predict.py dans le pipeline d'alerte

Modifier `discord_bot.py` pour appeler `ml_predict.py` avant d'envoyer l'alerte Discord :

```python
# Dans discord_bot.py, dans la fonction monitor_alerts()
# Avant d'envoyer l'embed, appeler :
import subprocess
result = subprocess.run(
    ['python3', '/opt/soc-ai/ml_predict.py', '--ip', a['src_ip'], '--sig', a['message']],
    capture_output=True, text=True
)
ml_score = result.stdout.strip()  # ex: "MALICIOUS (0.94)"
# Ajouter ml_score dans l'embed Discord
embed.add_field(name="🤖 ML Score", value=ml_score, inline=True)
```

#### 2.4 Ajouter route ML dans server.js

```javascript
app.post('/api/ml/predict', authMiddleware, async (req, res) => {
  const { src_ip, message, priority } = req.body;
  const { execSync } = require('child_process');
  try {
    const result = execSync(
      `python3 /opt/soc-ai/ml_predict.py --ip "${src_ip}" --sig "${message}" --priority ${priority}`
    ).toString();
    res.json({ prediction: result.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

---

### 🔴 PRIORITÉ 3 — Discord Bot Fix (20 min)

#### 3.1 Fix déduplication (alertes en rafale)

```python
# Remplacer dans discord_bot.py :
# sent_alerts = set()  →  supprimer
# Ajouter :
last_alert_per_ip = {}  # IP → timestamp dernier envoi
ALERT_COOLDOWN = 60     # secondes

# Dans get_new_alerts(), après avoir construit alert_id :
src_ip = record.values.get('src_ip', '')
now = datetime.now(timezone.utc).timestamp()
if src_ip in last_alert_per_ip and (now - last_alert_per_ip[src_ip]) < ALERT_COOLDOWN:
    continue
last_alert_per_ip[src_ip] = now
```

#### 3.2 Convertir discord_bot.py en service systemd

```bash
sudo tee /etc/systemd/system/soc-discord-bot.service > /dev/null << 'EOF'
[Unit]
Description=SOC Discord Bot
After=network.target suricata-influx.service

[Service]
Type=simple
User=root
ExecStart=/usr/bin/python3 /opt/soc-ai/discord_bot.py
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable soc-discord-bot
sudo systemctl start soc-discord-bot
sudo systemctl status soc-discord-bot
```

---

### 🔴 PRIORITÉ 4 — Frontend React (2-3h)

> Dossier : `D:\Abdellah\PFA\frontend\src`
> Backend URL : `http://192.168.7.174:5000`

#### 4.1 Routes manquantes à ajouter dans App.tsx ✅ (déjà fait)

Les routes `/academy`, `/scanner`, `/response` sont déjà dans App.tsx.

#### 4.2 CyberAcademyPage.tsx — Encyclopédie

```tsx
// D:\Abdellah\PFA\frontend\src\pages\CyberAcademyPage.tsx
import React, { useState } from 'react';

const TOPICS = {
  'Attaques Réseau': {
    Actives: ['MITM', 'DHCP Spoofing', 'ARP Spoofing', 'DNS Spoofing'],
    Passives: ['Sniffing', 'DNS Poisoning', 'Traffic Analysis'],
  },
  'Attaques Web': ['XSS', 'CSRF', 'XXE', 'SQL Injection', 'LFI/RFI'],
  'Attaques Mobile': ['Insecure Storage', 'Reverse Engineering', 'Man-in-the-App'],
  'Scan & Reconnaissance': ['Nmap', 'Masscan', 'OS Fingerprinting'],
};

const CyberAcademyPage: React.FC = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchExplanation = async (topic: string) => {
    setSelected(topic);
    setLoading(true);
    setExplanation('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://192.168.7.174:5000/api/academy/${encodeURIComponent(topic)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setExplanation(data.explanation || 'Aucune réponse');
    } catch {
      setExplanation('❌ Erreur : Mistral indisponible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cyber-academy">
      <h1>📚 Encyclopédie Cybersécurité</h1>
      <div className="academy-layout">
        <div className="topic-tree">
          {Object.entries(TOPICS).map(([category, subtopics]) => (
            <div key={category} className="category">
              <h3>{category}</h3>
              {Array.isArray(subtopics)
                ? subtopics.map(t => (
                    <button key={t} onClick={() => fetchExplanation(t)}
                      className={selected === t ? 'active' : ''}>{t}</button>
                  ))
                : Object.entries(subtopics).map(([sub, items]) => (
                    <div key={sub}>
                      <h4>{sub}</h4>
                      {items.map(t => (
                        <button key={t} onClick={() => fetchExplanation(t)}
                          className={selected === t ? 'active' : ''}>{t}</button>
                      ))}
                    </div>
                  ))
              }
            </div>
          ))}
        </div>
        <div className="explanation-panel">
          {loading && <div className="loading">🤖 Mistral analyse...</div>}
          {!loading && explanation && (
            <div className="explanation">
              <h2>🔍 {selected}</h2>
              <pre>{explanation}</pre>
            </div>
          )}
          {!loading && !explanation && (
            <div className="placeholder">← Sélectionnez un sujet pour obtenir une explication IA</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CyberAcademyPage;
```

#### 4.3 VulnerabilityScannerPage.tsx

```tsx
// D:\Abdellah\PFA\frontend\src\pages\VulnerabilityScannerPage.tsx
import React, { useState, useRef } from 'react';

interface Finding { severity: string; title: string; description: string; }

const VulnerabilityScannerPage: React.FC = () => {
  const [file, setFile]         = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults]   = useState<Finding[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setResults([]);
    // Simuler un scan (remplacer par appel réel à vulnscan FastAPI)
    await new Promise(r => setTimeout(r, 2000));
    setResults([
      { severity: 'CRITICAL', title: 'Hardcoded API Key', description: 'Clé API trouvée en clair dans le code source' },
      { severity: 'HIGH',     title: 'Insecure Storage',  description: 'Données sensibles stockées sans chiffrement' },
      { severity: 'MEDIUM',   title: 'Weak Crypto',       description: 'Utilisation de MD5 pour le hashage' },
    ]);
    setScanning(false);
  };

  const severityColor = (s: string) =>
    s === 'CRITICAL' ? '#ff4444' : s === 'HIGH' ? '#ff8800' : s === 'MEDIUM' ? '#ffcc00' : '#44ff44';

  return (
    <div className="vuln-scanner">
      <h1>🔍 Scanner de Vulnérabilités</h1>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".apk,.ipa,.zip"
          onChange={e => setFile(e.target.files?.[0] || null)} hidden />
        {file ? <p>📦 {file.name}</p> : <p>📂 Glissez un fichier APK/IPA ici ou cliquez</p>}
      </div>
      <button onClick={handleScan} disabled={!file || scanning} className="scan-btn">
        {scanning ? '⏳ Scan en cours...' : '🚀 Lancer le Scan'}
      </button>
      {results.length > 0 && (
        <div className="results">
          <h2>📋 Résultats ({results.length} findings)</h2>
          <table>
            <thead><tr><th>Sévérité</th><th>Titre</th><th>Description</th></tr></thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i}>
                  <td><span style={{ color: severityColor(r.severity), fontWeight: 'bold' }}>{r.severity}</span></td>
                  <td>{r.title}</td>
                  <td>{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => {
            const csv = results.map(r => `${r.severity},${r.title},${r.description}`).join('\n');
            const blob = new Blob([`Severity,Title,Description\n${csv}`], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'vuln_report.csv'; a.click();
          }}>📥 Exporter CSV</button>
        </div>
      )}
    </div>
  );
};

export default VulnerabilityScannerPage;
```

#### 4.4 IncidentResponsePage.tsx

```tsx
// D:\Abdellah\PFA\frontend\src\pages\IncidentResponsePage.tsx
import React, { useState, useEffect } from 'react';

interface Alert { id: string; time: string; message: string; src_ip: string; dst_ip: string; priority: number; classification: string; }

const IncidentResponsePage: React.FC = () => {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [toasts, setToasts]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('http://192.168.7.174:5000/alerts?limit=20&hours=24', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => { setAlerts(d.alerts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToasts(t => [...t, msg]);
    setTimeout(() => setToasts(t => t.slice(1)), 3000);
  };

  const blockIP = async (ip: string) => {
    try {
      await fetch('http://192.168.7.174:5000/api/actions/block-ip', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      showToast(`✅ IP ${ip} bloquée avec succès`);
    } catch { showToast(`❌ Erreur blocage ${ip}`); }
  };

  const isolateHost = async (ip: string) => {
    try {
      await fetch('http://192.168.7.174:5000/api/actions/isolate-host', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      showToast(`🔒 Host ${ip} isolé`);
    } catch { showToast(`❌ Erreur isolation ${ip}`); }
  };

  const priorityColor = (p: number) => p === 1 ? '#ff4444' : p === 2 ? '#ff8800' : '#44aaff';
  const priorityLabel = (p: number) => p === 1 ? '🚨 CRITIQUE' : p === 2 ? '⚠️ HAUTE' : 'ℹ️ INFO';

  return (
    <div className="incident-response">
      <h1>🚨 Réponse aux Incidents</h1>
      <div className="toast-container">
        {toasts.map((t, i) => <div key={i} className="toast">{t}</div>)}
      </div>
      {loading ? <div>Chargement...</div> : (
        <div className="alerts-list">
          {alerts.map(a => (
            <div key={a.id} className="alert-card" style={{ borderLeft: `4px solid ${priorityColor(a.priority)}` }}>
              <div className="alert-header">
                <span className="priority-badge" style={{ color: priorityColor(a.priority) }}>
                  {priorityLabel(a.priority)}
                </span>
                <span className="alert-time">{new Date(a.time).toLocaleTimeString()}</span>
              </div>
              <div className="alert-message">{a.message}</div>
              <div className="alert-meta">
                <span>📍 {a.src_ip} → {a.dst_ip}</span>
                <span>🏷️ {a.classification}</span>
              </div>
              <div className="alert-actions">
                <button className="btn-block" onClick={() => blockIP(a.src_ip)}>
                  🔴 Block IP {a.src_ip}
                </button>
                <button className="btn-isolate" onClick={() => isolateHost(a.src_ip)}>
                  🟠 Isolate Host
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IncidentResponsePage;
```

#### 4.5 Sidebar.tsx — Ajouter les nouvelles routes

```tsx
// Ajouter dans la sidebar existante :
import { Shield, Radar, BookOpen, AlertTriangle } from 'lucide-react';

// Dans le tableau des nav items, ajouter :
{ path: '/academy',  label: 'Encyclopédie',        icon: BookOpen,      roles: ['employee', 'expert', 'admin'] },
{ path: '/scanner',  label: 'Scanner Vulnérabilités', icon: Radar,      roles: ['expert', 'admin'] },
{ path: '/response', label: 'Réponse Incidents',   icon: AlertTriangle, roles: ['expert', 'admin'] },
```

---

### 🟡 PRIORITÉ 5 — Nettoyage données (10 min)

#### 5.1 Purger les données de test dans InfluxDB

```bash
# Sur SOC-Center (IRRÉVERSIBLE — vérifier avant de lancer)
curl -s -X POST "http://localhost:8086/api/v2/delete?org=SOC-PFA-YAOE&bucket=suricata_alerts" \
  -H "Authorization: Token UUWWy5LH1U7dxO628plHnSke5LomQXCZn6AAwkW0tI_a4t69wxfig7bgPuPnlZpWLNQjDDYAqBiB900pzkstQQ==" \
  -H "Content-Type: application/json" \
  -d '{"start":"2026-01-01T00:00:00Z","stop":"2026-12-31T00:00:00Z","predicate":"classification=\"Test\""}'
```

#### 5.2 Nettoyer fast.log sur Server-Cible

```bash
# Sur Server-Cible
sudo systemctl stop rsyslog
sudo truncate -s 0 /var/log/suricata/fast.log
sudo rm -f /var/spool/rsyslog/imfile-state:264221:*
sudo systemctl start rsyslog
```

---

### 🟡 PRIORITÉ 6 — VMs restantes (1-2h selon disponibilité RAM)

#### 6.1 Ressources A3 (192.168.30.11) — la plus rapide

```bash
# Sur la VM Ressources A3 (Ubuntu Server 22.04)
# 1. IP statique
sudo tee /etc/netplan/00-installer-config.yaml > /dev/null << 'EOF'
network:
  ethernets:
    ens33:
      dhcp4: false
      addresses: [192.168.30.11/24]
      gateway4: 192.168.30.1
      nameservers:
        addresses: [8.8.8.8]
  version: 2
EOF
sudo netplan apply

# 2. Samba
sudo apt install -y samba
sudo tee /etc/samba/smb.conf > /dev/null << 'EOF'
[global]
workgroup = WORKGROUP
[partage]
path = /srv/samba/partage
read only = no
browsable = yes
EOF
sudo mkdir -p /srv/samba/partage
sudo systemctl enable --now smbd

# 3. Telegraf → InfluxDB SOC-Center
# (copier la config de Server-Cible en changeant l'hostname)

# 4. Wazuh Agent
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | apt-key add -
echo "deb https://packages.wazuh.com/4.x/apt/ stable main" | tee /etc/apt/sources.list.d/wazuh.list
apt update && apt install -y wazuh-agent
WAZUH_MANAGER='192.168.10.10' WAZUH_AGENT_NAME='Ressources-A3' apt install wazuh-agent
systemctl enable --now wazuh-agent
```

#### 6.2 R-02 pfSense Secondary — CARP HA

```
1. Créer VM pfSense CE — même config interfaces que R-01 (VMnet0/2/3/4/5)
2. pfSense WebGUI R-02 → System > High Availability > Enable pfsync
   - pfsync interface : VMnet5 (192.168.99.2/30)
   - Synchronize peer IP : 192.168.99.1
3. Sur R-01 : System > High Availability
   - Enable XMLRPC Sync → R-02 IP : 192.168.99.2
4. Firewall > Virtual IPs > Add CARP :
   - LAN  VIP : 192.168.10.254 (password: carpsync)
   - DMZ  VIP : 192.168.20.254
   - A3   VIP : 192.168.30.254
5. Test failover : éteindre R-01 → vérifier que R-02 prend le relai < 1 sec
```

---

### 🟢 PRIORITÉ 7 — Tests End-to-End finaux (30 min)

```bash
# Test 1 : Pipeline complet Kali-Red → Discord
# Sur Kali-Red :
bash /opt/red-team/port_scan.sh
# Vérifier : alerte dans #soc-alerts Discord ✓

# Test 2 : Bouton Block IP Discord
# Cliquer 🔴 sur l'alerte → vérifier iptables sur SOC-Center :
sudo iptables -L INPUT | grep 192.168.20.50

# Test 3 : Bot systemd survit au reboot
sudo reboot
# Après reboot :
sudo systemctl status soc-discord-bot
sudo systemctl status suricata-influx

# Test 4 : Frontend complet
# npm run dev sur Windows → tester login admin/abd3llah
# Tester /academy → sélectionner "Nmap" → vérifier réponse Mistral
# Tester /response → cliquer "Block IP"
# Tester /scanner → drag & drop fichier

# Test 5 : Analyse Mistral sur vraies alertes
cd /opt/soc-ai && python3 analyze.py
```

---

### 🟢 PRIORITÉ 8 — Documentation finale (1h)

- [ ] Mettre à jour le rapport (V8.0) avec tous les changements du 23 juin
- [ ] Schéma architecture Draw.io final
- [ ] Slides de présentation (attaque → détection → réponse → rapport)
- [ ] Manuel utilisateur par rôle (Employee/Expert/Admin)
- [ ] Snapshots VMware de toutes les VMs configurées

---

## 🗓️ PLAN DE LA JOURNÉE

| Heure | Tâche | Durée |
|-------|-------|-------|
| Maintenant | Routes manquantes server.js (block-ip, isolate-host, academy, webhook) | 30 min |
| +30 min | ML Pipeline — vérifier modèles + intégration discord_bot | 45 min |
| +1h15 | Discord bot fix déduplication + systemd | 20 min |
| +1h35 | Frontend — CyberAcademy + VulnScanner + IncidentResponse + Sidebar | 2h |
| +3h35 | Nettoyage InfluxDB + fast.log | 10 min |
| +3h45 | Ressources A3 VM | 45 min |
| +4h30 | Tests end-to-end complets | 30 min |
| +5h | R-02 CARP HA (si temps) | 1h |
| +6h | Documentation finale | 1h |

---

## 📋 CREDENTIALS RAPIDES

| Service | URL | User | Pass |
|---------|-----|------|------|
| pfSense | http://192.168.10.1 | admin | pfsense |
| Grafana | http://192.168.7.174:3000 | admin | — |
| InfluxDB | http://192.168.7.174:8086 | admin | — |
| Neo4j | http://192.168.7.174:7474 | neo4j | abd3llah |
| SOC Backend | http://192.168.7.174:5000 | — | — |
| Login admin | /auth/login | admin | abd3llah |
| Login expert | /auth/login | expert1 | exp123 |
| Login employee | /auth/login | employee1 | emp123 |
| SSH SOC-Center | 192.168.7.174:22 | abdellah | — |
| SSH Server-Cible | 192.168.7.181:22 | abdellah | — |
| SSH Kali-Red | 192.168.7.182:22 | root | — |
| SSH Kali-Blue | 192.168.7.148:22 | root | — |

---

## ⚠️ POINTS CRITIQUES À NE PAS OUBLIER

1. **suricata-to-influx** → service `suricata-influx.service` (PAS `suricata-to-influx.service` qui était le doublon supprimé)
2. **discord_bot.py** → pas encore en systemd — à faire AVANT tout reboot
3. **server.js** → pas encore lancé en service systemd — tourne manuellement
4. **fast.log** → contient encore les lignes de test du debug — à purger avant démo
5. **InfluxDB** → contient des données classification=Test — à purger avant démo
6. **Ollama** → doit tourner sur le host Windows avant de tester /ai/chat et /api/academy

---

*Document généré le 23 Juin 2026 — SOC Platform v8.0*
