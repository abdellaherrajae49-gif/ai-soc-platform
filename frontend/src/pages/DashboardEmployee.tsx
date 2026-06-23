import React, { useState } from 'react';
import { AlertCircle, Bell, Shield, Info } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AlertCard from '../components/AlertCard';
import { useAlerts, useMetrics } from '../hooks/useSOC';
import { useAuth } from '../contexts/AuthContext';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

const DashboardEmployee: React.FC = () => {
  const { user } = useAuth();
  const { alerts, loading: alertsLoading, stats } = useAlerts(10);
  const { metrics } = useMetrics();
  const [filter, setFilter] = useState<number | undefined>();
  
  useScrollAnimation();

  const filteredAlerts = filter
    ? alerts.filter(a => a.priority === filter)
    : alerts;

  return (
    <div className="dashboard-layout">
      <Sidebar role={user?.role ?? 'employee'} />
      <main className="dashboard-main">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <Bell size={22} />
              Tableau de Bord — Surveillance
            </h1>
            <p className="page-subtitle">Vue en lecture seule des alertes actives</p>
          </div>
          <div className="header-badge">
            <span className="badge badge-employee">👤 Employee</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card stat-critical">
            <div className="stat-icon"><AlertCircle size={20} /></div>
            <div>
              <div className="stat-value">{stats?.p1 ?? '—'}</div>
              <div className="stat-label">Priorité 1 — Critique</div>
            </div>
          </div>
          <div className="stat-card stat-high">
            <div className="stat-icon"><Shield size={20} /></div>
            <div>
              <div className="stat-value">{stats?.p2 ?? '—'}</div>
              <div className="stat-label">Priorité 2 — Haute</div>
            </div>
          </div>
          <div className="stat-card stat-medium">
            <div className="stat-icon"><Info size={20} /></div>
            <div>
              <div className="stat-value">{stats?.p3 ?? '—'}</div>
              <div className="stat-label">Priorité 3 — Moyenne</div>
            </div>
          </div>
          <div className="stat-card stat-total">
            <div className="stat-icon"><Bell size={20} /></div>
            <div>
              <div className="stat-value">{stats?.total ?? '—'}</div>
              <div className="stat-label">Total alertes (24h)</div>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="section-card animate-on-scroll">
          <h2 className="section-title">⚡ État du Système</h2>
          <div className="system-status-grid">
            <div className="status-item">
              <span className="status-label">CPU</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${metrics?.['cpu.usage_percent'] ?? 0}%`,
                    background: (metrics?.['cpu.usage_percent'] ?? 0) > 80 ? '#ef4444' : '#00d4ff' }}
                />
              </div>
              <span className="status-val">{(metrics?.['cpu.usage_percent'] ?? 0).toFixed(1)}%</span>
            </div>
            <div className="status-item">
              <span className="status-label">RAM</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${metrics?.['mem.used_percent'] ?? 0}%`,
                    background: (metrics?.['mem.used_percent'] ?? 0) > 85 ? '#ef4444' : '#7c3aed' }}
                />
              </div>
              <span className="status-val">{(metrics?.['mem.used_percent'] ?? 0).toFixed(1)}%</span>
            </div>
            <div className="status-item">
              <span className="status-label">Disque</span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${metrics?.['disk.used_percent'] ?? 0}%`,
                    background: '#10b981' }}
                />
              </div>
              <span className="status-val">{(metrics?.['disk.used_percent'] ?? 0).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="section-card animate-on-scroll">
          <div className="section-header">
            <h2 className="section-title">🔔 Alertes Suricata (24h)</h2>
            <div className="filter-pills">
              {[undefined, 1, 2, 3].map(p => (
                <button
                  key={p ?? 'all'}
                  id={`filter-p${p ?? 'all'}`}
                  className={`filter-pill ${filter === p ? 'active' : ''}`}
                  onClick={() => setFilter(p)}
                >
                  {p ? `P${p}` : 'Tous'}
                </button>
              ))}
            </div>
          </div>

          {alertsLoading ? (
            <div className="loading-state">
              <span className="spinner" />
              Chargement des alertes…
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="empty-state">
              <Shield size={40} />
              <p>Aucune alerte — Système sécurisé</p>
            </div>
          ) : (
            <div className="alerts-list">
              {filteredAlerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} readOnly />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardEmployee;
