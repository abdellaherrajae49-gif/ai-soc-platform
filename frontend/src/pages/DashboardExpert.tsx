import React, { useState } from 'react';
import { Activity, TrendingUp, Search, Cpu, Zap } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AlertCard from '../components/AlertCard';
import MetricsChart from '../components/MetricsChart';
import ChatbotWidget from '../components/ChatbotWidget';
import { useAlerts, useMetrics, useIncidents } from '../hooks/useSOC';

const DashboardExpert: React.FC = () => {
  const { alerts, loading: alertsLoading, stats } = useAlerts(30);
  const { metricsHistory } = useMetrics();
  const { incidents, loading: incLoading } = useIncidents(7);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'alerts' | 'incidents'>('alerts');

  const filteredAlerts = alerts.filter(a =>
    !search ||
    a.message.toLowerCase().includes(search.toLowerCase()) ||
    a.src_ip.includes(search) ||
    a.dst_ip.includes(search)
  );

  return (
    <div className="dashboard-layout">
      <Sidebar role="expert" />
      <main className="dashboard-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <Activity size={22} />
              Tableau de Bord Expert
            </h1>
            <p className="page-subtitle">Analyse avancée · Métriques · Corrélation d'alertes</p>
          </div>
          <div className="header-badge">
            <span className="badge badge-expert">🔬 Expert</span>
          </div>
        </div>

        {/* KPI Row */}
        <div className="stats-row">
          <div className="stat-card stat-critical">
            <div className="stat-icon"><Zap size={20} /></div>
            <div>
              <div className="stat-value">{stats?.p1 ?? '—'}</div>
              <div className="stat-label">Critiques (P1)</div>
            </div>
          </div>
          <div className="stat-card stat-high">
            <div className="stat-icon"><TrendingUp size={20} /></div>
            <div>
              <div className="stat-value">{stats?.total ?? '—'}</div>
              <div className="stat-label">Total alertes 24h</div>
            </div>
          </div>
          <div className="stat-card stat-medium">
            <div className="stat-icon"><Cpu size={20} /></div>
            <div>
              <div className="stat-value">{incidents.length}</div>
              <div className="stat-label">Incidents (7j)</div>
            </div>
          </div>
          <div className="stat-card stat-info">
            <div className="stat-icon"><Activity size={20} /></div>
            <div>
              <div className="stat-value">
                {stats && stats.total > 0
                  ? `${((stats.p1 / stats.total) * 100).toFixed(0)}%`
                  : '—'}
              </div>
              <div className="stat-label">Taux critique</div>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="charts-row">
          <div className="section-card chart-card">
            <h2 className="section-title">📈 Métriques Système (1h)</h2>
            <MetricsChart data={metricsHistory} />
          </div>

          <div className="section-card incidents-mini">
            <h2 className="section-title">⚡ Incidents Récents</h2>
            {incLoading ? (
              <div className="loading-state"><span className="spinner" /> Chargement…</div>
            ) : incidents.length === 0 ? (
              <div className="empty-state-sm">Aucun incident</div>
            ) : (
              <div className="incidents-list">
                {incidents.slice(0, 5).map(inc => (
                  <div key={inc.id} className={`incident-row severity-${inc.severity}`}>
                    <div className="incident-dot" />
                    <div className="incident-info">
                      <p className="incident-desc">{inc.description}</p>
                      <span className="incident-meta">
                        {inc.src_ip} · {new Date(inc.time).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <span className={`badge-severity ${inc.severity}`}>{inc.severity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs: Alerts | Incidents */}
        <div className="section-card">
          <div className="section-header">
            <div className="tabs">
              <button
                id="tab-alerts"
                className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
                onClick={() => setActiveTab('alerts')}
              >
                🔔 Alertes ({filteredAlerts.length})
              </button>
              <button
                id="tab-incidents"
                className={`tab ${activeTab === 'incidents' ? 'active' : ''}`}
                onClick={() => setActiveTab('incidents')}
              >
                ⚡ Incidents ({incidents.length})
              </button>
            </div>
            {activeTab === 'alerts' && (
              <div className="search-bar">
                <Search size={14} />
                <input
                  id="alert-search"
                  type="text"
                  placeholder="Rechercher IP, message…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>

          {activeTab === 'alerts' ? (
            alertsLoading ? (
              <div className="loading-state"><span className="spinner" /> Chargement…</div>
            ) : (
              <div className="alerts-list">
                {filteredAlerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            )
          ) : (
            <div className="alerts-list">
              {incidents.map(inc => (
                <div key={inc.id} className={`incident-full severity-${inc.severity}`}>
                  <div className="incident-header">
                    <span className={`badge-severity ${inc.severity}`}>{inc.severity.toUpperCase()}</span>
                    <span className={`incident-status status-${inc.status}`}>{inc.status}</span>
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
        </div>
      </main>

      {/* Chatbot Mistral (expert only) */}
      <ChatbotWidget />
    </div>
  );
};

export default DashboardExpert;
