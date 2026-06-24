import React, { useState } from 'react';
import {
  Search, Bell, Settings, HelpCircle, Download, Plus,
  AlertOctagon, AlertTriangle, Zap, Clock, Network,
  Server, Monitor, Database, Cloud, MoreVertical,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Sidebar from '../components/Sidebar';
import ChatbotWidget from '../components/ChatbotWidget';
import { useAlerts, useMetrics, useIncidents } from '../hooks/useSOC';
import { createIncident } from '../api/api';
import { useAuth } from '../contexts/AuthContext';

const ROLE_LABELS: Record<string, string> = {
  employee: 'Analyste SOC',
  expert: 'Expert Sécurité',
  admin: 'Administrateur SOC',
};

interface WazuhAgent {
  name: string;
  ip: string;
  status: 'online' | 'offline';
  role: string;
  icon: React.ReactNode;
}

const AGENTS: WazuhAgent[] = [
  { name: 'SRV-PROD-01', ip: '10.0.1.42', status: 'online', role: 'WEB-SERVER', icon: <Server size={18} /> },
  { name: 'WKST-MARKT-04', ip: '192.168.1.12', status: 'online', role: 'END-USER', icon: <Monitor size={18} /> },
  { name: 'DB-REPLICA-09', ip: '10.0.5.118', status: 'online', role: 'DATABASE', icon: <Database size={18} /> },
  { name: 'SRV-LEGACY-OLD', ip: '172.16.0.4', status: 'offline', role: 'DEPRECATED', icon: <Server size={18} /> },
  { name: 'AWS-PROXY-01', ip: '54.212.0.1', status: 'online', role: 'GATEWAY', icon: <Cloud size={18} /> },
];

interface ActivityLog {
  timestamp: string;
  source: string;
  event: string;
  status: 'SUCCESS' | 'INFO' | 'ALERT';
}

const SAMPLE_LOGS: ActivityLog[] = [
  { timestamp: '2023-11-24 14:22:01', source: 'SRV-PROD-01', event: 'Mise à jour des règles de détection d\'intrusion complétée', status: 'SUCCESS' },
  { timestamp: '2023-11-24 14:18:45', source: 'System Kernel', event: 'Rotation des logs hebdomadaires effectuée', status: 'INFO' },
  { timestamp: '2023-11-24 14:15:20', source: 'WKST-MARKT-04', event: 'Échec de tentative de connexion SSH (3 tentatives)', status: 'ALERT' },
];

const SAMPLE_CHART_DATA = Array.from({ length: 20 }, (_, i) => ({
  time: `${String(8 + Math.floor(i / 3)).padStart(2, '0')}:${String((i * 10) % 60).padStart(2, '0')}`,
  cpu: 15 + Math.sin(i * 0.5) * 12 + Math.random() * 8,
  mem: 35 + Math.cos(i * 0.3) * 8 + Math.random() * 5,
}));

const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="adm-chart-tooltip">
      <p className="adm-chart-tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="adm-chart-tooltip-val">
          {p.name}: <strong>{p.value.toFixed(1)}%</strong>
        </p>
      ))}
    </div>
  );
};

const DashboardAdmin: React.FC = () => {
  const { user } = useAuth();
  const { stats, refetch: refetchAlerts } = useAlerts(50);
  const { metrics, metricsHistory, refetch: refetchMetrics } = useMetrics();
  const { incidents, refetch: refetchInc } = useIncidents(30);

  const [showNewIncident, setShowNewIncident] = useState(false);
  const [newInc, setNewInc] = useState({ description: '', severity: 'medium', src_ip: '' });
  const [incSubmitting, setIncSubmitting] = useState(false);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncSubmitting(true);
    try {
      await createIncident(newInc);
      setShowNewIncident(false);
      setNewInc({ description: '', severity: 'medium', src_ip: '' });
      refetchInc();
    } catch {
      alert('Erreur lors de la création de l\'incident');
    } finally {
      setIncSubmitting(false);
    }
  };

  const handleExport = () => {
    refetchAlerts();
    refetchMetrics();
    refetchInc();
  };

  const cpuVal = metrics?.['cpu.usage_percent'] ?? 24.2;
  const ramUsedPercent = metrics?.['mem.used_percent'] ?? 40;
  const ramUsedGB = ((ramUsedPercent / 100) * 32).toFixed(1);
  const diskVal = metrics?.['disk.used_percent'] ?? 44;
  const diskMBs = (diskVal * 3.2).toFixed(0);

  const chartData = metricsHistory.length > 0
    ? metricsHistory.map(p => ({
        time: new Date(p.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        cpu: Math.round(p.cpu * 10) / 10,
        mem: Math.round(p.mem * 10) / 10,
      }))
    : SAMPLE_CHART_DATA;

  const onlineAgents = AGENTS.filter(a => a.status === 'online').length;

  const statusClass = (s: ActivityLog['status']) =>
    s === 'SUCCESS' ? 'adm-status-success' : s === 'INFO' ? 'adm-status-info' : 'adm-status-alert';

  const agentRoleClass = (agent: WazuhAgent) => {
    if (agent.status === 'offline') return 'adm-agent-badge-muted';
    if (agent.role === 'WEB-SERVER' || agent.role === 'GATEWAY') return 'adm-agent-badge-tertiary';
    if (agent.role === 'END-USER') return 'adm-agent-badge-secondary';
    if (agent.role === 'DATABASE') return 'adm-agent-badge-primary';
    return 'adm-agent-badge-muted';
  };

  return (
    <div className="dashboard-layout">
      <Sidebar role={user?.role ?? 'admin'} />

      <header className="surv-header">
        <div className="surv-search">
          <Search size={18} className="surv-search-icon" />
          <input
            type="text"
            placeholder="Rechercher un agent, IP..."
            className="surv-search-input"
          />
        </div>
        <div className="surv-header-actions">
          <button className="surv-header-btn" title="Notifications">
            <Bell size={20} />
          </button>
          <button className="surv-header-btn" title="Paramètres">
            <Settings size={20} />
          </button>
          <button className="surv-header-btn" title="Aide">
            <HelpCircle size={20} />
          </button>
          <div className="surv-header-divider" />
          <div className="surv-user-block">
            <div className="surv-user-info">
              <span className="surv-user-name">{user?.username ?? 'Admin'}</span>
              <span className="surv-user-role">{ROLE_LABELS[user?.role ?? 'admin']}</span>
            </div>
            <div className="surv-user-avatar">
              {(user?.username?.[0] ?? 'A').toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="surv-main">
        <div className="adm-content">
          {/* Page Header */}
          <div className="adm-page-header">
            <div>
              <h1 className="surv-title">Console d'Administration</h1>
              <p className="surv-subtitle">Gestion des agents et télémétrie système</p>
            </div>
            <div className="adm-header-actions">
              <button className="adm-btn-secondary" onClick={handleExport}>
                <Download size={16} />
                Exporter
              </button>
              <button className="adm-btn-primary" onClick={() => setShowNewIncident(true)}>
                <Plus size={16} />
                Nouvel Agent
              </button>
            </div>
          </div>

          {/* KPI Row */}
          <div className="adm-kpi-row">
            <div className="adm-kpi-card">
              <div className="adm-kpi-top">
                <span className="adm-kpi-label adm-text-error">CRITIQUES</span>
                <div className="adm-kpi-icon-box adm-kpi-icon-error">
                  <AlertOctagon size={18} />
                </div>
              </div>
              <div className="adm-kpi-bottom">
                <span className="adm-kpi-value">{stats?.p1 ?? 12}</span>
                <span className="adm-kpi-trend adm-trend-up">
                  +2 <ArrowUp size={12} />
                </span>
              </div>
            </div>

            <div className="adm-kpi-card">
              <div className="adm-kpi-top">
                <span className="adm-kpi-label adm-text-tertiary">HAUTES</span>
                <div className="adm-kpi-icon-box adm-kpi-icon-tertiary">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="adm-kpi-bottom">
                <span className="adm-kpi-value">{stats?.p2 ?? 45}</span>
                <span className="adm-kpi-note">stable</span>
              </div>
            </div>

            <div className="adm-kpi-card">
              <div className="adm-kpi-top">
                <span className="adm-kpi-label adm-text-muted">TOTAL 24H</span>
                <div className="adm-kpi-icon-box adm-kpi-icon-default">
                  <Zap size={18} />
                </div>
              </div>
              <div className="adm-kpi-bottom">
                <span className="adm-kpi-value">{stats?.total ? (stats.total >= 1000 ? `${(stats.total / 1000).toFixed(1)}k` : stats.total) : '1.2k'}</span>
                <span className="adm-kpi-trend adm-trend-down">
                  -8% <ArrowDown size={12} />
                </span>
              </div>
            </div>

            <div className="adm-kpi-card">
              <div className="adm-kpi-top">
                <span className="adm-kpi-label adm-text-muted">INCIDENTS 30J</span>
                <div className="adm-kpi-icon-box adm-kpi-icon-default">
                  <Clock size={18} />
                </div>
              </div>
              <div className="adm-kpi-bottom">
                <span className="adm-kpi-value">{incidents.length || 328}</span>
                <span className="adm-kpi-note">historique</span>
              </div>
            </div>

            <div className="adm-kpi-card">
              <div className="adm-kpi-top">
                <span className="adm-kpi-label adm-text-primary">AGENTS</span>
                <div className="adm-kpi-icon-box adm-kpi-icon-primary">
                  <Network size={18} />
                </div>
              </div>
              <div className="adm-kpi-bottom">
                <span className="adm-kpi-value">{AGENTS.length}</span>
                <span className="adm-kpi-note adm-text-tertiary">{onlineAgents} online</span>
              </div>
            </div>
          </div>

          {/* Middle Row: Telemetry + Agents */}
          <div className="adm-middle-grid">
            {/* Telemetry Card */}
            <div className="adm-card adm-telemetry-card">
              <div className="adm-card-header">
                <div>
                  <h3 className="adm-card-title">Métriques Télémétrie</h3>
                  <p className="adm-card-subtitle">Performance temps réel du cluster</p>
                </div>
                <div className="adm-chart-legend">
                  <div className="adm-legend-item">
                    <span className="adm-legend-dot adm-dot-cpu" />
                    <span>CPU</span>
                  </div>
                  <div className="adm-legend-item">
                    <span className="adm-legend-dot adm-dot-ram" />
                    <span>RAM</span>
                  </div>
                </div>
              </div>

              <div className="adm-chart-container">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="admCpuGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4648d4" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4648d4" stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="admMemGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={v => `${v}%`}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="cpu"
                      name="CPU"
                      stroke="#4648d4"
                      strokeWidth={2.5}
                      fill="url(#admCpuGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#4648d4', strokeWidth: 0 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mem"
                      name="RAM"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      fill="url(#admMemGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="adm-metric-pills">
                <div className="adm-metric-pill">
                  <span className="adm-pill-label">CPU Usage</span>
                  <span className="adm-pill-value adm-text-primary">{cpuVal.toFixed ? cpuVal.toFixed(1) : cpuVal}%</span>
                </div>
                <div className="adm-metric-pill">
                  <span className="adm-pill-label">RAM Usage</span>
                  <span className="adm-pill-value adm-text-tertiary">{ramUsedGB} / 32 GB</span>
                </div>
                <div className="adm-metric-pill">
                  <span className="adm-pill-label">Disk I/O</span>
                  <span className="adm-pill-value">{diskMBs} MB/s</span>
                </div>
                <div className="adm-metric-pill">
                  <span className="adm-pill-label">Network</span>
                  <span className="adm-pill-value">1.2 Gbps</span>
                </div>
              </div>
            </div>

            {/* Agents Card */}
            <div className="adm-card adm-agents-card">
              <div className="adm-agents-header">
                <h3 className="adm-card-title">Agents (Wazuh)</h3>
                <button className="adm-icon-btn">
                  <MoreVertical size={18} />
                </button>
              </div>

              <div className="adm-agents-list">
                {AGENTS.map(agent => (
                  <div
                    key={agent.ip}
                    className={`adm-agent-row ${agent.status === 'offline' ? 'adm-agent-offline' : ''}`}
                  >
                    <div className="adm-agent-icon-wrap">
                      <div className={`adm-agent-icon-box ${agent.status === 'offline' ? 'adm-agent-icon-muted' : 'adm-agent-icon-active'}`}>
                        {agent.icon}
                      </div>
                      <div className={`adm-agent-dot ${agent.status === 'online' ? 'adm-dot-online' : 'adm-dot-offline'}`} />
                    </div>
                    <div className="adm-agent-info">
                      <div className="adm-agent-name-row">
                        <span className={`adm-agent-name ${agent.status === 'offline' ? 'adm-agent-name-muted' : ''}`}>
                          {agent.name}
                        </span>
                        <span className={`adm-agent-badge ${agentRoleClass(agent)}`}>
                          {agent.role}
                        </span>
                      </div>
                      <div className="adm-agent-meta">
                        <span className="adm-agent-ip">{agent.ip}</span>
                        <span className={`adm-agent-status ${agent.status === 'offline' ? 'adm-agent-status-off' : ''}`}>
                          <span className={`adm-agent-status-dot ${agent.status === 'online' ? 'adm-dot-green' : 'adm-dot-gray'}`} />
                          {agent.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="adm-agents-footer">
                <button className="adm-agents-footer-btn">Voir tous les agents</button>
              </div>
            </div>
          </div>

          {/* Activity Table */}
          <div className="adm-card adm-activity-card">
            <div className="adm-activity-header">
              <h3 className="adm-card-title">Activités Système Récentes</h3>
              <span className="adm-telemetry-ok">Télémétrie OK</span>
            </div>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Horodatage</th>
                    <th>Source</th>
                    <th>Événement</th>
                    <th className="adm-th-right">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {SAMPLE_LOGS.map((log, i) => (
                    <tr key={i} className={`adm-table-row ${log.status === 'ALERT' ? 'adm-row-alert' : ''}`}>
                      <td className="adm-cell-mono">{log.timestamp}</td>
                      <td className="adm-cell-source">{log.source}</td>
                      <td>{log.event}</td>
                      <td className="adm-td-right">
                        <span className={`adm-status-badge ${statusClass(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* New Incident Modal */}
        {showNewIncident && (
          <div className="adm-modal-overlay" onClick={() => setShowNewIncident(false)}>
            <div className="adm-modal" onClick={e => e.stopPropagation()}>
              <h3 className="adm-modal-title">Créer un incident</h3>
              <form onSubmit={handleCreateIncident} className="adm-modal-form">
                <input
                  className="adm-modal-input"
                  placeholder="Description de l'incident"
                  value={newInc.description}
                  onChange={e => setNewInc(p => ({ ...p, description: e.target.value }))}
                  required
                />
                <select
                  className="adm-modal-input adm-modal-select"
                  value={newInc.severity}
                  onChange={e => setNewInc(p => ({ ...p, severity: e.target.value }))}
                >
                  {['low', 'medium', 'high', 'critical'].map(s => (
                    <option key={s} value={s}>{s.toUpperCase()}</option>
                  ))}
                </select>
                <input
                  className="adm-modal-input"
                  placeholder="IP source (optionnel)"
                  value={newInc.src_ip}
                  onChange={e => setNewInc(p => ({ ...p, src_ip: e.target.value }))}
                />
                <div className="adm-modal-actions">
                  <button type="submit" className="adm-btn-primary" disabled={incSubmitting}>
                    {incSubmitting ? <><span className="spinner" /> Création…</> : 'Créer'}
                  </button>
                  <button type="button" className="adm-btn-secondary" onClick={() => setShowNewIncident(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <ChatbotWidget />
    </div>
  );
};

export default DashboardAdmin;
