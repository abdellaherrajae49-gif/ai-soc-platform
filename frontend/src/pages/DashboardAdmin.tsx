import React, { useState } from 'react';
import { Settings, Users, Globe, Database, Server, RefreshCw, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AlertCard from '../components/AlertCard';
import MetricsChart from '../components/MetricsChart';
import NetworkTopology from '../components/NetworkTopology';
import ChatbotWidget from '../components/ChatbotWidget';
import { useAlerts, useMetrics, useIncidents, useTopology } from '../hooks/useSOC';
import { createIncident } from '../api/api';

const DashboardAdmin: React.FC = () => {
  const { alerts, loading: alertsLoading, stats, refetch: refetchAlerts } = useAlerts(50);
  const { metrics, metricsHistory, refetch: refetchMetrics } = useMetrics();
  const { incidents, loading: incLoading, refetch: refetchInc } = useIncidents(30);
  const { nodes, edges, loading: topoLoading } = useTopology();

  const [activeTab, setActiveTab] = useState<'alerts' | 'incidents' | 'topology' | 'system'>('alerts');
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [newInc, setNewInc] = useState({ description: '', severity: 'medium', src_ip: '' });
  const [incSubmitting, setIncSubmitting] = useState(false);

  const handleRefreshAll = () => {
    refetchAlerts();
    refetchMetrics();
    refetchInc();
  };

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncSubmitting(true);
    try {
      await createIncident(newInc);
      setShowNewIncident(false);
      setNewInc({ description: '', severity: 'medium', src_ip: '' });
      refetchInc();
    } catch (err) {
      alert('Erreur lors de la création de l\'incident');
    } finally {
      setIncSubmitting(false);
    }
  };

  const agents = [
    { name: 'SOC-Center', ip: '192.168.10.10', status: 'online', role: 'SIEM/IDS' },
    { name: 'Server-Cible', ip: '192.168.20.10', status: 'online', role: 'Target' },
    { name: 'Kali-Blue', ip: '192.168.30.20', status: 'online', role: 'Defender' },
    { name: 'Kali-Red', ip: '192.168.20.50', status: 'online', role: 'Attacker' },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar role="admin" />
      <main className="dashboard-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <Settings size={22} />
              Tableau de Bord Administrateur
            </h1>
            <p className="page-subtitle">Vue complète — Alertes · Métriques · Topologie · Agents</p>
          </div>
          <div className="header-actions">
            <span className="badge badge-admin">👑 Admin</span>
            <button id="refresh-all" className="btn-secondary" onClick={handleRefreshAll}>
              <RefreshCw size={14} /> Actualiser
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-row stats-5">
          <div className="stat-card stat-critical">
            <div className="stat-value">{stats?.p1 ?? '—'}</div>
            <div className="stat-label">🔴 Critiques (P1)</div>
          </div>
          <div className="stat-card stat-high">
            <div className="stat-value">{stats?.p2 ?? '—'}</div>
            <div className="stat-label">🟠 Hautes (P2)</div>
          </div>
          <div className="stat-card stat-medium">
            <div className="stat-value">{stats?.total ?? '—'}</div>
            <div className="stat-label">📊 Total (24h)</div>
          </div>
          <div className="stat-card stat-info">
            <div className="stat-value">{incidents.length}</div>
            <div className="stat-label">⚡ Incidents (30j)</div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-value">{agents.filter(a => a.status === 'online').length}/{agents.length}</div>
            <div className="stat-label">🟢 Agents actifs</div>
          </div>
        </div>

        {/* Metrics + Agents row */}
        <div className="charts-row">
          <div className="section-card chart-card-lg">
            <h2 className="section-title">📈 Métriques Temps Réel (CPU / RAM)</h2>
            <MetricsChart data={metricsHistory} />
            <div className="metrics-snapshot">
              <div className="metric-pill">
                <Server size={12} />
                CPU {(metrics?.['cpu.usage_percent'] ?? 0).toFixed(1)}%
              </div>
              <div className="metric-pill">
                <Database size={12} />
                RAM {(metrics?.['mem.used_percent'] ?? 0).toFixed(1)}%
              </div>
              <div className="metric-pill">
                <Globe size={12} />
                Disk {(metrics?.['disk.used_percent'] ?? 0).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="section-card agents-card">
            <h2 className="section-title">
              <Users size={16} />
              Agents Wazuh
            </h2>
            {agents.map(agent => (
              <div key={agent.ip} className="agent-row">
                <div className={`agent-dot ${agent.status}`} />
                <div className="agent-info">
                  <span className="agent-name">{agent.name}</span>
                  <span className="agent-ip">{agent.ip}</span>
                </div>
                <span className="agent-role">{agent.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Tabs */}
        <div className="section-card animate-on-scroll">
          <div className="section-header">
            <div className="tabs">
              {(['alerts', 'incidents', 'topology', 'system'] as const).map(tab => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  className={`tab ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {{ alerts: '🔔 Alertes', incidents: '⚡ Incidents', topology: '🗺️ Topologie', system: '⚙️ Système' }[tab]}
                </button>
              ))}
            </div>
            {activeTab === 'incidents' && (
              <button id="new-incident-btn" className="btn-primary btn-sm" onClick={() => setShowNewIncident(true)}>
                <Plus size={13} /> Nouvel Incident
              </button>
            )}
          </div>

          {/* Tab: Alerts */}
          {activeTab === 'alerts' && (
            alertsLoading ? (
              <div className="loading-state"><span className="spinner" /> Chargement…</div>
            ) : (
              <div className="alerts-list">
                {alerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            )
          )}

          {/* Tab: Incidents */}
          {activeTab === 'incidents' && (
            <>
              {showNewIncident && (
                <form className="incident-form" onSubmit={handleCreateIncident} id="new-incident-form">
                  <h3>Créer un incident</h3>
                  <div className="form-row">
                    <input
                      id="inc-desc"
                      className="form-input"
                      placeholder="Description de l'incident"
                      value={newInc.description}
                      onChange={e => setNewInc(p => ({ ...p, description: e.target.value }))}
                      required
                    />
                    <select
                      id="inc-severity"
                      className="form-input form-select"
                      value={newInc.severity}
                      onChange={e => setNewInc(p => ({ ...p, severity: e.target.value }))}
                    >
                      {['low', 'medium', 'high', 'critical'].map(s => (
                        <option key={s} value={s}>{s.toUpperCase()}</option>
                      ))}
                    </select>
                    <input
                      id="inc-ip"
                      className="form-input"
                      placeholder="IP source (opt.)"
                      value={newInc.src_ip}
                      onChange={e => setNewInc(p => ({ ...p, src_ip: e.target.value }))}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={incSubmitting}>
                      {incSubmitting ? <><span className="spinner" /> Création…</> : 'Créer'}
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setShowNewIncident(false)}>
                      Annuler
                    </button>
                  </div>
                </form>
              )}
              {incLoading ? (
                <div className="loading-state"><span className="spinner" /> Chargement…</div>
              ) : (
                <div className="alerts-list">
                  {incidents.map(inc => (
                    <div key={inc.id} className={`incident-full severity-${inc.severity}`}>
                      <div className="incident-header">
                        <span className={`badge-severity ${inc.severity}`}>{inc.severity.toUpperCase()}</span>
                        <span className="incident-status">{inc.status}</span>
                      </div>
                      <p className="incident-desc-full">{inc.description}</p>
                      <div className="incident-footer">
                        <span>📍 {inc.src_ip}</span>
                        <span>🕐 {new Date(inc.time).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tab: Topology */}
          {activeTab === 'topology' && (
            topoLoading ? (
              <div className="loading-state"><span className="spinner" /> Chargement du graphe…</div>
            ) : (
              <NetworkTopology nodes={nodes} edges={edges} />
            )
          )}

          {/* Tab: System */}
          {activeTab === 'system' && (
            <div className="system-info-grid">
              <div className="sysinfo-card">
                <h3>🛡️ Suricata IDS</h3>
                <div className="sysinfo-row"><span>Version</span><span>8.0.3</span></div>
                <div className="sysinfo-row"><span>Interfaces</span><span>ens33 + ens37</span></div>
                <div className="sysinfo-row"><span>Statut</span><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>● Actif</span></div>
              </div>
              <div className="sysinfo-card">
                <h3>📊 Wazuh SIEM</h3>
                <div className="sysinfo-row"><span>Version</span><span>4.14.5</span></div>
                <div className="sysinfo-row"><span>Agents</span><span>4 connectés</span></div>
                <div className="sysinfo-row"><span>Statut</span><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>● Actif</span></div>
              </div>
              <div className="sysinfo-card">
                <h3>🤖 Mistral IA</h3>
                <div className="sysinfo-row"><span>Modèle</span><span>7B Q4_0</span></div>
                <div className="sysinfo-row"><span>GPU</span><span>GTX 1650 4GB</span></div>
                <div className="sysinfo-row"><span>Endpoint</span><span>:11434</span></div>
              </div>
              <div className="sysinfo-card">
                <h3>🗃️ InfluxDB</h3>
                <div className="sysinfo-row"><span>Version</span><span>2.7.0</span></div>
                <div className="sysinfo-row"><span>Buckets</span><span>6 actifs</span></div>
                <div className="sysinfo-row"><span>Org</span><span>SOC-PFA-YAOE</span></div>
              </div>
            </div>
          )}
        </div>
      </main>

      <ChatbotWidget />
    </div>
  );
};

export default DashboardAdmin;
