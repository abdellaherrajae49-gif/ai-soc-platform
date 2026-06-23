import React from 'react';
import {
  Search, Bell, Settings, HelpCircle, Filter, MoreVertical,
  AlertOctagon, AlertTriangle, AlertCircle, BarChart3,
  CheckCircle, ExternalLink, Shield,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useAlerts, useMetrics } from '../hooks/useSOC';
import { useAuth } from '../contexts/AuthContext';
import type { Alert } from '../api/api';

const SAMPLE_ALERTS: Alert[] = [
  { id: 'AL-9283-F', time: '2026-06-23T14:23:45', message: 'Brute Force Attempt: SSH', src_ip: '192.168.10.45', dst_ip: '10.0.0.1 (WebSrv)', priority: 1, classification: 'Attempted Administrator Privilege Gain' },
  { id: 'AL-9284-S', time: '2026-06-23T14:15:10', message: 'Port Scanning Detected', src_ip: '172.16.54.12', dst_ip: 'Subnet-A-All', priority: 2, classification: 'Network Scan' },
  { id: 'AL-9285-T', time: '2026-06-23T13:58:22', message: 'Unusual Traffic Peak', src_ip: '10.0.4.52', dst_ip: 'WAN-Gateway', priority: 3, classification: 'Anomalous Traffic' },
  { id: 'AL-9286-D', time: '2026-06-23T13:45:00', message: 'Unauthorized DB Access', src_ip: '10.0.1.99', dst_ip: 'DB-Server-PROD', priority: 1, classification: 'Unauthorized Access' },
  { id: 'AL-9287-U', time: '2026-06-23T13:12:30', message: 'DNS Tunneling Suspected', src_ip: '192.168.4.11', dst_ip: '8.8.8.8 (Google)', priority: 2, classification: 'Potential DNS Tunneling' },
];

const PRIORITY_CONFIG: Record<number, { label: string; cls: string }> = {
  1: { label: 'CRITIQUE', cls: 'critical' },
  2: { label: 'ÉLEVÉ',    cls: 'high' },
  3: { label: 'MOYEN',    cls: 'medium' },
};

const ROLE_LABELS: Record<string, string> = {
  employee: 'Analyste SOC',
  expert:   'Expert Sécurité',
  admin:    'Administrateur SOC',
};

const DashboardEmployee: React.FC = () => {
  const { user } = useAuth();
  const { alerts, loading: alertsLoading, stats } = useAlerts(10);
  const { metrics } = useMetrics();

  const displayAlerts = alerts.length > 0 ? alerts : SAMPLE_ALERTS;
  const displayStats = stats ?? { p1: 12, p2: 28, p3: 64, total: 104 };

  const cpuVal = metrics?.['cpu.usage_percent'] ?? 42;
  const ramVal = metrics?.['mem.used_percent'] ?? 68;
  const diskVal = metrics?.['disk.used_percent'] ?? 14;

  const formatTime = (time: string) => {
    try {
      const d = new Date(time);
      if (isNaN(d.getTime())) return time;
      return `Aujourd'hui, ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return time;
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar role={user?.role ?? 'employee'} />

      <header className="surv-header">
        <div className="surv-search">
          <Search size={18} className="surv-search-icon" />
          <input
            type="text"
            placeholder="Rechercher une menace, un IP ou un log..."
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
              <span className="surv-user-name">{user?.username ?? 'Alex Durand'}</span>
              <span className="surv-user-role">{ROLE_LABELS[user?.role ?? 'employee'] ?? 'Chef Analyste SOC'}</span>
            </div>
            <div className="surv-user-avatar">
              {(user?.username?.[0] ?? 'A').toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="surv-main">
        <div className="surv-page-header">
          <h1 className="surv-title">Surveillance Active</h1>
          <p className="surv-subtitle">Surveillance des menaces en temps réel</p>
        </div>

        <div className="surv-kpi-row">
          <div className="surv-kpi-card">
            <div className="surv-kpi-icon surv-kpi-critical">
              <AlertOctagon size={24} />
            </div>
            <div>
              <span className="surv-kpi-label surv-text-critical">Critique</span>
              <span className="surv-kpi-value">{displayStats.p1}</span>
            </div>
          </div>
          <div className="surv-kpi-card">
            <div className="surv-kpi-icon surv-kpi-high">
              <AlertTriangle size={24} />
            </div>
            <div>
              <span className="surv-kpi-label surv-text-high">Élevé</span>
              <span className="surv-kpi-value">{displayStats.p2}</span>
            </div>
          </div>
          <div className="surv-kpi-card">
            <div className="surv-kpi-icon surv-kpi-medium">
              <AlertCircle size={24} />
            </div>
            <div>
              <span className="surv-kpi-label surv-text-medium">Moyen</span>
              <span className="surv-kpi-value">{displayStats.p3}</span>
            </div>
          </div>
          <div className="surv-kpi-card">
            <div className="surv-kpi-icon surv-kpi-total">
              <BarChart3 size={24} />
            </div>
            <div>
              <span className="surv-kpi-label surv-text-total">Total Menaces</span>
              <span className="surv-kpi-value">{displayStats.total}</span>
            </div>
          </div>
        </div>

        <div className="surv-content-grid">
          <div className="surv-table-card">
            <div className="surv-table-header">
              <h3 className="surv-section-label">Alertes Récentes</h3>
              <div className="surv-table-actions">
                <button className="surv-icon-btn" title="Filtrer"><Filter size={16} /></button>
                <button className="surv-icon-btn" title="Plus"><MoreVertical size={16} /></button>
              </div>
            </div>
            <div className="surv-table-wrap">
              <table className="surv-table">
                <thead>
                  <tr>
                    <th>Priorité</th>
                    <th>Signature</th>
                    <th>Horodatage</th>
                    <th>Source</th>
                    <th>Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {alertsLoading ? (
                    <tr>
                      <td colSpan={5} className="surv-table-loading">
                        <span className="spinner" /> Chargement des alertes…
                      </td>
                    </tr>
                  ) : displayAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="surv-table-empty">
                        <Shield size={32} />
                        <span>Aucune alerte — Système sécurisé</span>
                      </td>
                    </tr>
                  ) : (
                    displayAlerts.map(a => {
                      const cfg = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG[3];
                      return (
                        <tr key={a.id} className="surv-table-row">
                          <td>
                            <span className={`surv-chip surv-chip-${cfg.cls}`}>{cfg.label}</span>
                          </td>
                          <td>
                            <p className="surv-sig-name">{a.message}</p>
                            <p className="surv-sig-id">ID: {a.id}</p>
                          </td>
                          <td className="surv-cell-time">{formatTime(a.time)}</td>
                          <td className="surv-cell-mono">{a.src_ip}</td>
                          <td className="surv-cell-mono">{a.dst_ip}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surv-health-card">
            <div className="surv-health-header">
              <h3 className="surv-section-label">Santé du Système</h3>
              <span className="surv-health-status">
                <span className="surv-health-dot" />
                Opérationnel
              </span>
            </div>

            <div className="surv-health-meters">
              <div className="surv-meter">
                <div className="surv-meter-head">
                  <span className="surv-meter-label">Utilisation CPU</span>
                  <span className="surv-meter-val">{Number(cpuVal).toFixed(0)}%</span>
                </div>
                <div className="surv-meter-track">
                  <div className="surv-meter-fill surv-meter-primary" style={{ width: `${cpuVal}%` }} />
                </div>
              </div>
              <div className="surv-meter">
                <div className="surv-meter-head">
                  <span className="surv-meter-label">Utilisation RAM</span>
                  <span className="surv-meter-val">{Number(ramVal).toFixed(0)}%</span>
                </div>
                <div className="surv-meter-track">
                  <div className="surv-meter-fill surv-meter-primary" style={{ width: `${ramVal}%` }} />
                </div>
              </div>
              <div className="surv-meter">
                <div className="surv-meter-head">
                  <span className="surv-meter-label">Stockage Disque</span>
                  <span className="surv-meter-val">{Number(diskVal).toFixed(0)}%</span>
                </div>
                <div className="surv-meter-track">
                  <div className="surv-meter-fill surv-meter-green" style={{ width: `${diskVal}%` }} />
                </div>
              </div>
            </div>

            <div className="surv-services">
              <h4 className="surv-services-title">Services Actifs</h4>
              <div className="surv-services-grid">
                {['Moteur IDS', 'SIEM Core', 'Log Aggreg', 'Analytic AI'].map(s => (
                  <div key={s} className="surv-service-item">
                    <CheckCircle size={16} className="surv-service-check" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="surv-diag-btn">
              <ExternalLink size={16} />
              Voir Diagnostic Complet
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardEmployee;
