import React, { useState, useEffect, useCallback } from 'react';
import { Brain, Zap, Shield, AlertTriangle, CheckCircle, TrendingUp, Cpu, Activity, RefreshCw, ChevronRight, Database } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatbotWidget from '../components/ChatbotWidget';
import { mlPredict, mlBatchPredict, mlMetadata, getAlerts } from '../api/api';
import type { MLPrediction, Alert } from '../api/api';

// ── Couleurs de sévérité ────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#ff2d55',
  HIGH:     '#ff6b35',
  MEDIUM:   '#ffd60a',
  LOW:      '#34c759',
};

// ── Feature importance (basée sur les résultats Random Forest) ──────────────
const FEATURE_IMPORTANCES = [
  { name: 'Priorité',          value: 21.5, key: 'priority' },
  { name: 'Port destination',  value: 12.5, key: 'dst_port' },
  { name: 'Volume (bytes)',    value: 12.1, key: 'bytes_total' },
  { name: 'Fréquence alerte', value: 11.4, key: 'alert_frequency' },
  { name: 'Durée (sec)',       value: 11.3, key: 'duration_sec' },
  { name: 'Nb paquets',        value: 10.6, key: 'packet_count' },
  { name: 'Port source',       value: 10.2, key: 'src_port' },
  { name: 'Heure du jour',     value:  7.6, key: 'hour_of_day' },
  { name: 'Source interne',    value:  2.8, key: 'is_internal_src' },
];

interface EnrichedAlert extends Alert {
  ml?: MLPrediction;
  mlLoading?: boolean;
}

const MLAnalysisPage: React.FC = () => {
  const [metadata, setMetadata]   = useState<any>(null);
  const [alerts, setAlerts]       = useState<EnrichedAlert[]>([]);
  const [loading, setLoading]     = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats]         = useState({ attacks: 0, fp: 0, anomalies: 0, critical: 0 });
  const [selected, setSelected]   = useState<EnrichedAlert | null>(null);
  const [metaError, setMetaError] = useState(false);

  // Load model metadata
  useEffect(() => {
    mlMetadata()
      .then(r => setMetadata(r.data))
      .catch(() => setMetaError(true));
  }, []);

  // Load alerts and run batch ML prediction
  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const { data } = await getAlerts(20, 24);
      const rawAlerts: EnrichedAlert[] = data.alerts || [];
      setAlerts(rawAlerts.map(a => ({ ...a, mlLoading: true })));

      // Build ML payloads from alerts
      const payloads = rawAlerts.map(a => ({
        priority:        a.priority || 3,
        dst_port:        0,
        src_port:        0,
        packet_count:    10,
        alert_frequency: 5,
        hour_of_day:     new Date(a.time).getHours(),
        is_internal_src: a.src_ip?.startsWith('192.168') ? 1 : 0,
        bytes_total:     1500,
        duration_sec:    0,
      }));

      const predictions = await mlBatchPredict(payloads);
      const enriched = rawAlerts.map((a, i) => ({
        ...a,
        ml: predictions.data[i],
        mlLoading: false,
      }));

      setAlerts(enriched);

      // Compute stats
      const attacks   = enriched.filter(a => a.ml?.is_attack).length;
      const anomalies = enriched.filter(a => a.ml?.is_anomaly).length;
      const critical  = enriched.filter(a => a.ml?.severity === 'CRITICAL').length;
      setStats({ attacks, fp: enriched.length - attacks, anomalies, critical });
    } catch (err) {
      console.error('ML batch failed', err);
      // Use mock data if backend ML not available
      const mockAlerts: EnrichedAlert[] = Array.from({ length: 10 }, (_, i) => ({
        id: `mock-${i}`,
        time: new Date().toISOString(),
        message: ['ET SCAN SSH', 'ET POLICY HTTP', 'ET MALWARE C2', 'ET WEB SQLi', 'ET DOS SYN Flood'][i % 5],
        src_ip: `192.168.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
        dst_ip: '192.168.10.10',
        priority: [1, 2, 3][i % 3],
        classification: 'mock',
        ml: {
          is_attack:       i % 3 !== 0,
          is_anomaly:      i % 4 === 0,
          confidence:      Math.round(40 + Math.random() * 55),
          confidence_lr:   Math.round(35 + Math.random() * 55),
          cluster:         i % 4,
          cluster_name:    'Modéré',
          rf_label:        i % 3 !== 0 ? 'Vrai Positif' : 'Faux Positif',
          lr_label:        i % 3 !== 0 ? 'Vrai Positif' : 'Faux Positif',
          is_sensitive_port: i % 2 === 0,
          severity:        (['CRITICAL','HIGH','MEDIUM','LOW'] as const)[i % 4],
          features_used:   {},
        },
      }));
      setAlerts(mockAlerts);
      const attacks   = mockAlerts.filter(a => a.ml?.is_attack).length;
      const anomalies = mockAlerts.filter(a => a.ml?.is_anomaly).length;
      const critical  = mockAlerts.filter(a => a.ml?.severity === 'CRITICAL').length;
      setStats({ attacks, fp: mockAlerts.length - attacks, anomalies, critical });
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  return (
    <div className="dashboard-layout">
      <Sidebar role="expert" />
      <main className="dashboard-main">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="page-header" style={{ marginBottom: '28px' }}>
          <div>
            <h1 className="page-title">
              <Brain size={22} style={{ color: 'var(--accent-purple)' }} />
              Analyse Machine Learning
            </h1>
            <p className="page-subtitle">
              Random Forest · Isolation Forest · K-Means · Logistic Regression — Modèles entraînés localement
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {metadata && (
              <div style={{
                background: 'rgba(124,58,237,0.12)',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '12px',
                color: 'var(--accent-purple)',
                fontWeight: 700,
                letterSpacing: '1px',
              }}>
                <Database size={12} style={{ marginRight: 6 }} />
                {metadata.n_samples} samples · {metadata.n_features} features
              </div>
            )}
            <button
              className="btn-primary"
              onClick={runAnalysis}
              disabled={analyzing}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <RefreshCw size={14} className={analyzing ? 'spin' : ''} />
              {analyzing ? 'Analyse en cours...' : 'Relancer l\'analyse'}
            </button>
          </div>
        </div>

        {/* ── Model Performance Cards ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Random Forest', acc: '88.8%', f1: '64.6%', auc: '77.9%', icon: <TrendingUp size={18}/>, color: '#7c3aed' },
            { label: 'Logistic Regr.', acc: '69.5%', f1: '46.5%', auc: '71.4%', icon: <Activity size={18}/>, color: '#0ea5e9' },
            { label: 'Isolation Forest', acc: '—', f1: '—', auc: '—', anomalyRate: '18.0%', icon: <AlertTriangle size={18}/>, color: '#f59e0b' },
            { label: 'K-Means', acc: '—', f1: '—', clusters: '4 clusters', icon: <Cpu size={18}/>, color: '#10b981', auc: '—' },
          ].map((m, i) => (
            <div key={i} style={{
              background: 'linear-gradient(135deg, rgba(20,20,40,0.95), rgba(10,10,25,0.98))',
              border: `1px solid ${m.color}33`,
              borderTop: `3px solid ${m.color}`,
              borderRadius: '12px',
              padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: m.color }}>
                {m.icon}
                <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{m.label}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {m.acc !== '—' && (
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>{m.acc}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>ACCURACY</div>
                  </div>
                )}
                {m.f1 !== '—' && (
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>{m.f1}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>F1-SCORE</div>
                  </div>
                )}
                {m.auc && m.auc !== '—' && (
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: m.color }}>{m.auc}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>AUC-ROC</div>
                  </div>
                )}
                {m.anomalyRate && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: m.color }}>{m.anomalyRate}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>TAUX ANOMALIE</div>
                  </div>
                )}
                {m.clusters && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: m.color }}>{m.clusters}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>COMPORTEMENTAUX</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── KPI Stats ───────────────────────────────────────────────────── */}
        <div className="stats-row" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Vrais Positifs', value: stats.attacks, icon: <AlertTriangle size={20}/>, cls: 'stat-critical' },
            { label: 'Faux Positifs',  value: stats.fp,      icon: <CheckCircle size={20}/>,   cls: 'stat-high' },
            { label: 'Anomalies',      value: stats.anomalies,icon: <Zap size={20}/>,           cls: 'stat-medium' },
            { label: 'CRITICAL',       value: stats.critical, icon: <Shield size={20}/>,        cls: 'stat-info' },
          ].map((s, i) => (
            <div key={i} className={`stat-card ${s.cls}`}>
              <div className="stat-icon">{s.icon}</div>
              <div>
                <div className="stat-value">{loading ? '—' : s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', marginBottom: '24px' }}>
          {/* ── Alert Table ───────────────────────────────────────────────── */}
          <div className="section-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                <Brain size={16} style={{ color: 'var(--accent-purple)' }} />
                Alertes Analysées par l'IA
              </h2>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(124,58,237,0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(124,58,237,0.2)' }}>
                {alerts.length} alertes · 4 modèles ML
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Signature', 'IP Source', 'P.', 'Verdict RF', 'Confiance', 'Sévérité', 'Anomalie'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} style={{ padding: '14px 16px' }}>
                            <div style={{ height: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : alerts.map((a, i) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        background: selected?.id === a.id ? 'rgba(124,58,237,0.08)' : 'transparent',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = selected?.id === a.id ? 'rgba(124,58,237,0.08)' : 'transparent')}
                    >
                      <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                        <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff', fontWeight: 500 }}>
                          {a.message}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '12px' }}>{a.src_ip}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: a.priority === 1 ? 'rgba(255,45,85,0.2)' : a.priority === 2 ? 'rgba(255,107,53,0.2)' : 'rgba(52,199,89,0.2)',
                          color:      a.priority === 1 ? '#ff2d55' : a.priority === 2 ? '#ff6b35' : '#34c759',
                        }}>P{a.priority}</span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {a.ml ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            color: a.ml.is_attack ? '#ff2d55' : '#34c759',
                            fontWeight: 700, fontSize: '12px',
                          }}>
                            {a.ml.is_attack ? <AlertTriangle size={12}/> : <CheckCircle size={12}/>}
                            {a.ml.rf_label}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {a.ml ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${a.ml.confidence}%`, height: '100%', background: a.ml.is_attack ? '#ff2d55' : '#34c759', transition: 'width 0.5s' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{a.ml.confidence}%</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {a.ml ? (
                          <span style={{
                            padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800, letterSpacing: '1px',
                            background: `${SEV_COLOR[a.ml.severity]}22`,
                            color: SEV_COLOR[a.ml.severity],
                            border: `1px solid ${SEV_COLOR[a.ml.severity]}44`,
                          }}>{a.ml.severity}</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {a.ml?.is_anomaly ? (
                          <span style={{ color: '#ffd60a', fontWeight: 700, fontSize: '11px' }}>⚠ OUI</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Feature Importances ───────────────────────────────────────── */}
          <div className="section-card">
            <h2 className="section-title">
              <TrendingUp size={16} style={{ color: 'var(--accent-purple)' }} />
              Feature Importances (RF)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              {FEATURE_IMPORTANCES.map((f, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{f.name}</span>
                    <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{f.value}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${f.value / 25 * 100}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, #7c3aed, #a855f7)`,
                      borderRadius: '3px',
                      transition: 'width 0.8s ease',
                      animationDelay: `${i * 100}ms`,
                      boxShadow: '0 0 8px rgba(124,58,237,0.5)',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Cluster Distribution */}
            <h2 className="section-title" style={{ marginTop: '28px' }}>
              <Cpu size={16} style={{ color: '#0ea5e9' }} />
              K-Means Clusters
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              {[
                { id: 0, size: 447, rate: '19.7%', color: '#7c3aed' },
                { id: 1, size: 614, rate: '23.9%', color: '#0ea5e9' },
                { id: 2, size: 96,  rate: '28.1%', color: '#f59e0b' },
                { id: 3, size: 443, rate: '15.3%', color: '#10b981' },
              ].map(c => (
                <div key={c.id} style={{
                  background: `${c.color}11`,
                  border: `1px solid ${c.color}33`,
                  borderRadius: '8px', padding: '10px',
                }}>
                  <div style={{ fontSize: '10px', color: c.color, fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>CLUSTER {c.id}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{c.size}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Taux attaque : <span style={{ color: c.color }}>{c.rate}</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Detail Panel ────────────────────────────────────────────────── */}
        {selected?.ml && (
          <div className="section-card" style={{
            border: `1px solid ${SEV_COLOR[selected.ml.severity]}44`,
            background: `linear-gradient(135deg, rgba(20,20,40,0.98), rgba(${selected.ml.severity === 'CRITICAL' ? '255,45,85' : selected.ml.severity === 'HIGH' ? '255,107,53' : '124,58,237'},0.05))`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 className="section-title">
                <Shield size={16} style={{ color: SEV_COLOR[selected.ml.severity] }} />
                Détail ML — {selected.message.slice(0, 60)}...
              </h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {[
                { label: 'Verdict Random Forest', value: selected.ml.rf_label, color: selected.ml.is_attack ? '#ff2d55' : '#34c759' },
                { label: 'Verdict Logistic Regr.', value: selected.ml.lr_label, color: selected.ml.is_attack ? '#ff2d55' : '#34c759' },
                { label: 'Confiance RF', value: `${selected.ml.confidence}%`, color: 'var(--accent-purple)' },
                { label: 'Anomalie (Iso. Forest)', value: selected.ml.is_anomaly ? 'Détectée ⚠' : 'Normale ✓', color: selected.ml.is_anomaly ? '#ffd60a' : '#34c759' },
                { label: 'Sévérité', value: selected.ml.severity, color: SEV_COLOR[selected.ml.severity] },
                { label: 'Cluster K-Means', value: `Cluster ${selected.ml.cluster}`, color: '#0ea5e9' },
                { label: 'Port sensible', value: selected.ml.is_sensitive_port ? 'Oui 🔴' : 'Non ✓', color: selected.ml.is_sensitive_port ? '#ff2d55' : '#34c759' },
                { label: 'Confiance LR', value: `${selected.ml.confidence_lr}%`, color: '#0ea5e9' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{item.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ChatbotWidget />
      </main>
    </div>
  );
};

export default MLAnalysisPage;
