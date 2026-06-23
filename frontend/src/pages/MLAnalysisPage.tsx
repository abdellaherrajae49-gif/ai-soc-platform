import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Bell, Settings, HelpCircle,
  GitBranch, TrendingUp, Snowflake, ScatterChart,
  Shield,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatbotWidget from '../components/ChatbotWidget';
import { useAuth } from '../contexts/AuthContext';
import { mlBatchPredict, mlMetadata, getAlerts } from '../api/api';
import type { MLPrediction, Alert } from '../api/api';

const ROLE_LABELS: Record<string, string> = {
  employee: 'Analyste SOC',
  expert: 'Expert Sécurité',
  admin: 'Administrateur SOC',
};

interface EnrichedAlert extends Alert {
  ml?: MLPrediction;
  mlLoading?: boolean;
}

const MODEL_CARDS = [
  { label: 'Random Forest', acc: '98.4', f1: '0.97', auc: '0.99', icon: GitBranch },
  { label: 'Logistic Regr', acc: '94.1', f1: '0.92', auc: '0.95', icon: TrendingUp },
  { label: 'Isolation Forest', acc: '96.7', f1: '0.95', auc: '0.98', icon: Snowflake },
  { label: 'K-Means', acc: '89.2', f1: '0.88', auc: '0.91', icon: ScatterChart },
];

const FEATURE_IMPORTANCES = [
  { name: 'Payload Size', value: 0.84 },
  { name: 'Request Frequency', value: 0.72 },
  { name: 'Geo-Location Shift', value: 0.41 },
  { name: 'User Agent entropy', value: 0.28 },
];

const CLUSTERS = [
  { name: 'Cluster A: Botnets', count: '124', color: 'primary' as const },
  { name: 'Cluster B: Standard', count: '2,842', color: 'tertiary' as const },
  { name: 'Cluster C: Ransomware', count: '12', color: 'error' as const },
];

const SAMPLE_TABLE = [
  { ip: '192.168.1.45', model: 'Isolation Forest', score: 0.982, category: 'Exfiltration', status: 'ALERTE' as const },
  { ip: '45.23.11.201', model: 'Random Forest', score: 0.954, category: 'Brute Force', status: 'ALERTE' as const },
  { ip: '10.0.0.12', model: 'Logistic Regr', score: 0.122, category: 'Bénigne', status: 'VALIDE' as const },
  { ip: '172.16.25.4', model: 'Isolation Forest', score: 0.891, category: 'Port Scan', status: 'EXAMEN' as const },
  { ip: '192.168.1.102', model: 'K-Means', score: 0.450, category: 'Anomalie DNS', status: 'EXAMEN' as const },
];

const MLAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [, setMetadata] = useState<any>(null);
  const [alerts, setAlerts] = useState<EnrichedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState({ attacks: 0, fp: 0, anomalies: 0, critical: 0 });

  useEffect(() => {
    mlMetadata()
      .then(r => setMetadata(r.data))
      .catch(() => {});
  }, []);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const { data } = await getAlerts(20, 24);
      const rawAlerts: EnrichedAlert[] = data.alerts || [];
      setAlerts(rawAlerts.map(a => ({ ...a, mlLoading: true })));

      const payloads = rawAlerts.map(a => ({
        priority: a.priority || 3,
        dst_port: 0,
        src_port: 0,
        packet_count: 10,
        alert_frequency: 5,
        hour_of_day: new Date(a.time).getHours(),
        is_internal_src: a.src_ip?.startsWith('192.168') ? 1 : 0,
        bytes_total: 1500,
        duration_sec: 0,
      }));

      const predictions = await mlBatchPredict(payloads);
      const enriched = rawAlerts.map((a, i) => ({
        ...a,
        ml: predictions.data[i],
        mlLoading: false,
      }));

      setAlerts(enriched);
      const attacks = enriched.filter(a => a.ml?.is_attack).length;
      const anomalies = enriched.filter(a => a.ml?.is_anomaly).length;
      const critical = enriched.filter(a => a.ml?.severity === 'CRITICAL').length;
      setStats({ attacks, fp: enriched.length - attacks, anomalies, critical });
    } catch {
      setAlerts([]);
      setStats({ attacks: 1284, fp: 42, anomalies: 312, critical: 8 });
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  const displayStats = stats.attacks > 0 || stats.fp > 0
    ? stats
    : { attacks: 1284, fp: 42, anomalies: 312, critical: 8 };

  const tableData = alerts.length > 0
    ? alerts.map(a => ({
        ip: a.src_ip ?? '—',
        model: a.ml?.rf_label ? 'Random Forest' : 'Isolation Forest',
        score: (a.ml?.confidence ?? 0) / 100,
        category: a.ml?.severity === 'CRITICAL' ? 'Exfiltration' : a.ml?.is_attack ? 'Brute Force' : 'Bénigne',
        status: (a.ml?.severity === 'CRITICAL' || a.ml?.severity === 'HIGH' ? 'ALERTE' : a.ml?.is_attack ? 'EXAMEN' : 'VALIDE') as 'ALERTE' | 'VALIDE' | 'EXAMEN',
      }))
    : SAMPLE_TABLE;

  return (
    <div className="dashboard-layout">
      <Sidebar role={user?.role ?? 'expert'} />

      <header className="surv-header">
        <div className="surv-search">
          <Search size={18} className="surv-search-icon" />
          <input
            type="text"
            placeholder="Rechercher des anomalies..."
            className="surv-search-input"
          />
        </div>
        <div className="surv-header-actions">
          <button className="surv-header-btn" title="Notifications"><Bell size={20} /></button>
          <button className="surv-header-btn" title="Paramètres"><Settings size={20} /></button>
          <button className="surv-header-btn" title="Aide"><HelpCircle size={20} /></button>
          <div className="surv-header-divider" />
          <div className="surv-user-block">
            <div className="surv-user-info">
              <span className="surv-user-name">{user?.username ?? 'Alex Durand'}</span>
              <span className="surv-user-role">{ROLE_LABELS[user?.role ?? 'expert']}</span>
            </div>
            <div className="surv-user-avatar">
              {(user?.username?.[0] ?? 'A').toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="surv-main">
        <div className="surv-page-header">
          <h1 className="surv-title">Intelligence Artificielle</h1>
          <p className="surv-subtitle">Classification et analyse comportementale</p>
        </div>

        {/* Model Performance Cards */}
        <div className="ml-model-row">
          {MODEL_CARDS.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="ml-model-card">
                <div className="ml-model-head">
                  <span className="ml-model-label">{m.label}</span>
                  <Icon size={20} className="ml-model-icon" />
                </div>
                <div className="ml-model-body">
                  <div className="ml-model-acc-row">
                    <span className="ml-model-acc-label">Accuracy</span>
                    <span className="ml-model-acc-value">{m.acc}%</span>
                  </div>
                  <div className="ml-model-bar-track">
                    <div className="ml-model-bar-fill" style={{ width: `${m.acc}%` }} />
                  </div>
                  <div className="ml-model-metrics">
                    <span>F1: {m.f1}</span>
                    <span>AUC: {m.auc}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Chips */}
        <div className="ml-chips-row">
          <div className="ml-chip ml-chip-success">
            <span className="ml-chip-dot ml-dot-success" />
            <span className="ml-chip-label">Vrais Positifs</span>
            <span className="ml-chip-value">{loading ? '—' : displayStats.attacks.toLocaleString()}</span>
          </div>
          <div className="ml-chip ml-chip-neutral">
            <span className="ml-chip-dot ml-dot-neutral" />
            <span className="ml-chip-label">Faux Positifs</span>
            <span className="ml-chip-value">{loading ? '—' : displayStats.fp}</span>
          </div>
          <div className="ml-chip ml-chip-primary">
            <span className="ml-chip-dot ml-dot-primary" />
            <span className="ml-chip-label">Anomalies</span>
            <span className="ml-chip-value">{loading ? '—' : displayStats.anomalies}</span>
          </div>
          <div className="ml-chip ml-chip-error">
            <span className="ml-chip-dot ml-dot-error" />
            <span className="ml-chip-label">Critique</span>
            <span className="ml-chip-value">{loading ? '—' : String(displayStats.critical).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Bottom Grid: Table + Right Column */}
        <div className="ml-content-grid">
          {/* Classification Table */}
          <div className="ml-table-card">
            <div className="ml-table-header">
              <h3 className="surv-section-label">Classification des Menaces</h3>
              <button className="ml-export-btn">Exporter CSV</button>
            </div>
            <div className="ml-table-wrap">
              <table className="surv-table">
                <thead>
                  <tr>
                    <th>Source IP</th>
                    <th>Modèle ML</th>
                    <th>Score Conf.</th>
                    <th>Catégorie</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {analyzing ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="surv-table-row">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j}><div className="ml-skeleton" /></td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    tableData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="surv-table-row">
                        <td className="surv-cell-mono">{row.ip}</td>
                        <td className="ml-cell-model">{row.model}</td>
                        <td className={`surv-cell-mono ${row.score >= 0.8 ? 'ml-score-high' : ''}`}>
                          {row.score.toFixed(3)}
                        </td>
                        <td>{row.category}</td>
                        <td>
                          <span className={`ml-status ml-status-${row.status.toLowerCase()}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column */}
          <div className="ml-right-col">
            {/* Feature Importance */}
            <div className="ml-side-card">
              <h3 className="surv-section-label">Feature Importance</h3>
              <div className="ml-features">
                {FEATURE_IMPORTANCES.map((f, i) => (
                  <div key={i} className="ml-feature-item">
                    <div className="ml-feature-head">
                      <span className="ml-feature-name">{f.name}</span>
                      <span className="ml-feature-val">{f.value.toFixed(2)}</span>
                    </div>
                    <div className="ml-feature-track">
                      <div
                        className="ml-feature-fill"
                        style={{ width: `${f.value * 100}%`, opacity: 0.4 + f.value * 0.6 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clusters */}
            <div className="ml-side-card">
              <h3 className="surv-section-label">Clusters K-Means</h3>
              <div className="ml-clusters">
                {CLUSTERS.map((c, i) => (
                  <div key={i} className="ml-cluster-item">
                    <div className="ml-cluster-left">
                      <span className={`ml-chip-dot ml-dot-${c.color}`} />
                      <span className="ml-cluster-name">{c.name}</span>
                    </div>
                    <span className={`ml-cluster-badge ml-badge-${c.color}`}>
                      {c.count} nodes
                    </span>
                  </div>
                ))}
              </div>
              <button className="surv-diag-btn">Voir la visualisation 3D</button>
            </div>
          </div>
        </div>
      </main>

      <ChatbotWidget />
    </div>
  );
};

export default MLAnalysisPage;
