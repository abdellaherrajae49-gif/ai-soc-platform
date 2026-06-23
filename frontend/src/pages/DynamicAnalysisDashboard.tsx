import React, { useState } from 'react';
import {
  Activity, Globe, HardDrive, AlertTriangle,
  Clock, Cpu, RefreshCw, ChevronLeft, Shield,
} from 'lucide-react';

/* ── Mock Dynamic Data ──────────────────────────────────────────────── */
const DYNAMIC_RISK = { label: 'High', score: 62, color: '#ef4444' };

const ANOMALIES = [
  'javax.crypto.Cipher: key=a3f1...c8d2, iv=00000000',
  'java.net.URL.openConnection: unencrypted HTTP',
  'javax.crypto.SecretKeyFactory: iterations=1000 (low)',
  'java.net.Socket: Tor-like exit node',
  'android.telephony.TelephonyManager: IMEI harvested',
];

const API_CALLS = [
  { name: 'javax.crypto.Cipher',             detail: 'key=a3f1...c8d2, iv=00000000', tag: 'crypto' },
  { name: 'java.net.URL.openConnection',     detail: 'unencrypted HTTP',              tag: 'network' },
  { name: 'javax.crypto.SecretKeyFactory',   detail: 'iterations=1000 (low)',         tag: 'crypto' },
  { name: 'java.net.Socket',                 detail: 'Tor-like exit node',            tag: 'network' },
  { name: 'android.telephony.TelephonyManager', detail: 'IMEI harvested',            tag: 'network' },
];

const NETWORK_FLOWS = [
  {
    host: 'analytics.example.com',
    ip: '93.184.216.34:80',
    proto: 'HTTP',
    size: '512 B',
    status: 'SUSPICIOUS',
    reason: 'Unencrypted HTTP exfiltration',
  },
  {
    host: 'api.firebase.com',
    ip: '142.250.80.46:443',
    proto: 'HTTPS',
    size: '4096 B',
    status: 'CLEAN',
    reason: null,
  },
];

const FILE_OPS = [
  { path: '/sdcard/user_data.log',     op: 'WRITE', size: '2048 B', status: 'warn', note: 'Plaintext PII written to external storage' },
  { path: '/data/data/com.app/prefs',  op: 'READ',  size: '256 B',  status: 'ok',   note: 'Clean' },
];

const TAG_COLORS: Record<string, { bg: string; color: string }> = {
  crypto:  { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
  network: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
};

interface DynamicAnalysisDashboardProps {
  filename: string;
  onBack: () => void;
}

const DynamicAnalysisDashboard: React.FC<DynamicAnalysisDashboardProps> = ({ filename, onBack }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const ringR = 44;
  const ringCirc = 2 * Math.PI * ringR;
  const ringFilled = (DYNAMIC_RISK.score / 100) * ringCirc;

  return (
    <div className="dyn-container">
      {/* Header */}
      <div className="dyn-header-bar">
        <div className="dyn-header-title">
          <Activity size={24} style={{ color: 'var(--accent-cyan)' }} />
          <div>
            <h2>Dynamic Analysis</h2>
            <p>Runtime behavior monitoring — API hooks, network flows, file I/O</p>
          </div>
        </div>
        <div className="dyn-header-actions">
          <button className="btn-secondary" onClick={onBack}>
            <ChevronLeft size={14} /> Static Report
          </button>
          <button className="btn-secondary" onClick={handleRefresh}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Simulated notice */}
      <div className="dyn-notice">
        <AlertTriangle size={16} style={{ color: '#fbbf24' }} />
        <span>Simulated results — set <code>DYNAMIC_ENABLED=true</code> in backend env and connect an Android device for real analysis.</span>
      </div>

      {/* Summary Cards */}
      <div className="dyn-summary-grid">
        {/* Risk Card */}
        <div className="dyn-risk-card">
          <div>
            <p className="dyn-card-label">DYNAMIC RISK</p>
            <p className="dyn-risk-label" style={{ color: DYNAMIC_RISK.color }}>{DYNAMIC_RISK.label}</p>
            <p className="dyn-risk-score">{DYNAMIC_RISK.score} / 100</p>
          </div>
          <div className="dyn-risk-ring">
            <svg width="100" height="100" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={ringR} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r={ringR} fill="none"
                stroke={DYNAMIC_RISK.color} strokeWidth="10"
                strokeDasharray={`${ringFilled} ${ringCirc}`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ filter: `drop-shadow(0 0 8px ${DYNAMIC_RISK.color})` }}
              />
              <text x="60" y="65" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800">{DYNAMIC_RISK.score}</text>
            </svg>
          </div>
        </div>

        {/* API Calls */}
        <div className="dyn-stat-card">
          <div className="dyn-stat-icon"><Cpu size={18} /></div>
          <p className="dyn-card-label">API CALLS</p>
          <p className="dyn-stat-value">{API_CALLS.length}</p>
        </div>

        {/* Network Flows */}
        <div className="dyn-stat-card">
          <div className="dyn-stat-icon"><Globe size={18} /></div>
          <p className="dyn-card-label">NETWORK FLOWS</p>
          <p className="dyn-stat-value">{NETWORK_FLOWS.length}</p>
          <p className="dyn-stat-sub">{NETWORK_FLOWS.filter(f => f.status === 'SUSPICIOUS').length} suspicious</p>
        </div>

        {/* Duration */}
        <div className="dyn-stat-card">
          <div className="dyn-stat-icon"><Clock size={18} /></div>
          <p className="dyn-card-label">DURATION</p>
          <p className="dyn-stat-value">22s</p>
          <p className="dyn-stat-sub">emulator-5554 (simulated)</p>
        </div>
      </div>

      {/* Detected Anomalies */}
      <div className="dyn-card">
        <div className="dyn-card-header-row">
          <AlertTriangle size={16} style={{ color: '#ef4444' }} />
          <span>DETECTED ANOMALIES ({ANOMALIES.length})</span>
        </div>
        <div className="dyn-anomalies-list">
          {ANOMALIES.map((a, i) => (
            <div key={i} className="dyn-anomaly-item">
              <span className="dyn-anomaly-arrow">▶</span>
              <code>{a}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Runtime API Calls */}
      <div className="dyn-card">
        <div className="dyn-card-header-row">
          <Cpu size={16} style={{ color: 'var(--accent-cyan)' }} />
          <span>RUNTIME API CALLS</span>
        </div>
        <div className="dyn-api-list">
          {API_CALLS.map((call, i) => (
            <div key={i} className="dyn-api-item">
              <div className="dyn-api-icon">
                {call.tag === 'crypto' ? '🔐' : '🌐'}
              </div>
              <div className="dyn-api-info">
                <span className="dyn-api-name">{call.name}</span>
                <span className="dyn-api-detail">{call.detail}</span>
              </div>
              <span
                className="dyn-tag-badge"
                style={{ background: TAG_COLORS[call.tag].bg, color: TAG_COLORS[call.tag].color }}
              >
                {call.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Network Flows */}
      <div className="dyn-card">
        <div className="dyn-card-header-row">
          <Globe size={16} style={{ color: 'var(--accent-blue)' }} />
          <span>NETWORK FLOWS</span>
        </div>
        <div className="dyn-network-list">
          {NETWORK_FLOWS.map((flow, i) => (
            <div key={i} className={`dyn-network-item ${flow.status === 'SUSPICIOUS' ? 'net-suspicious' : 'net-clean'}`}>
              <div>
                <span className={`dyn-net-dot ${flow.status === 'SUSPICIOUS' ? 'dot-red' : 'dot-green'}`} />
              </div>
              <div className="dyn-net-info">
                <span className="dyn-net-host">{flow.host}</span>
                <span className="dyn-net-detail">{flow.ip} · {flow.proto} · {flow.size}</span>
                {flow.reason && <span className="dyn-net-reason">{flow.reason}</span>}
              </div>
              <span className={`dyn-net-badge ${flow.status === 'SUSPICIOUS' ? 'nbadge-sus' : 'nbadge-clean'}`}>
                {flow.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* File System Operations */}
      <div className="dyn-card">
        <div className="dyn-card-header-row">
          <HardDrive size={16} style={{ color: 'var(--accent-purple)' }} />
          <span>FILE SYSTEM OPERATIONS</span>
        </div>
        <table className="dyn-file-table">
          <thead>
            <tr>
              <th>PATH</th>
              <th>OP</th>
              <th>SIZE</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {FILE_OPS.map((f, i) => (
              <tr key={i}>
                <td><code>{f.path}</code></td>
                <td><span className="dyn-op-badge">{f.op}</span></td>
                <td>{f.size}</td>
                <td>
                  {f.status === 'warn'
                    ? <span className="file-status-warn">⚠ {f.note}</span>
                    : <span className="file-status-ok">✓ {f.note}</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DynamicAnalysisDashboard;
