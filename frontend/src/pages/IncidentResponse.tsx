import React, { useState, useEffect } from 'react';
import {
  Shield, AlertTriangle, Crosshair, Terminal,
  CheckCircle, Ban, Wifi, Download, RefreshCw,
  Clock, Activity,
} from 'lucide-react';
import api from '../api/api';
import { useAlerts } from '../hooks/useSOC';

interface Incident {
  id: string;
  time: string;
  description: string;
  severity: string;
  src_ip: string;
  status: string;
  findings?: string;
}

interface ActionLog {
  id: string;
  time: string;
  action: string;
  ip: string;
  status: 'success' | 'error';
  message: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'var(--accent-red)',
  high:     'var(--accent-orange)',
  medium:   'var(--accent-yellow)',
  low:      'var(--accent-green)',
};

function exportPDF(incidents: Incident[], logs: ActionLog[]) {
  // Simple CSV export (PDF requires jsPDF lib)
  const rows = [
    'RAPPORT RÉPONSE AUX INCIDENTS SOC — ' + new Date().toLocaleString('fr-FR'),
    '',
    '=== INCIDENTS ===',
    'ID,Temps,Description,Sévérité,IP Source,Statut',
    ...incidents.map(i =>
      `"${i.id}","${new Date(i.time).toLocaleString('fr-FR')}","${i.description}","${i.severity}","${i.src_ip}","${i.status}"`
    ),
    '',
    '=== ACTIONS EFFECTUÉES ===',
    'Temps,Action,IP,Statut,Message',
    ...logs.map(l =>
      `"${l.time}","${l.action}","${l.ip}","${l.status}","${l.message}"`
    ),
  ].join('\n');
  const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `rapport-soc-${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export const IncidentResponse: React.FC = () => {
  const [incidents,  setIncidents]  = useState<Incident[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const { alerts } = useAlerts(10);

  // Also expose top 5 critical/high alerts as actionable incidents
  const alertIncidents: Incident[] = alerts
    .filter(a => a.priority <= 2)
    .slice(0, 5)
    .map(a => ({
      id:          a.id,
      time:        a.time,
      description: a.message,
      severity:    a.priority === 1 ? 'critical' : 'high',
      src_ip:      a.src_ip,
      status:      'open',
    }));

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/incidents?limit=15&days=30');
      setIncidents(response.data.incidents || []);
    } catch {
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIncidents(); }, []);

  const handleAction = async (
    action: 'block-ip' | 'isolate-host',
    ip: string,
    incidentId: string
  ) => {
    setPendingAction(`${action}-${incidentId}`);
    const endpoint = action === 'block-ip'
      ? '/api/actions/block-ip'
      : '/api/actions/isolate-host';

    const label = action === 'block-ip' ? 'Blocage IP iptables' : 'Isolation réseau hôte';

    try {
      const res = await api.post(endpoint, { ip });
      const log: ActionLog = {
        id:      Date.now().toString(),
        time:    new Date().toLocaleTimeString('fr-FR'),
        action:  label,
        ip,
        status:  'success',
        message: res.data.message || 'Action effectuée avec succès',
      };
      setActionLogs(prev => [log, ...prev]);
    } catch (err: unknown) {
      const log: ActionLog = {
        id:      Date.now().toString(),
        time:    new Date().toLocaleTimeString('fr-FR'),
        action:  label,
        ip,
        status:  'error',
        message: (err as { response?: { data?: { error?: string } } })?.response?.data?.error
                 || '⚠️ Firewall inaccessible ou droits insuffisants',
      };
      setActionLogs(prev => [log, ...prev]);
    } finally {
      setPendingAction(null);
    }
  };

  const allIncidents = [...incidents, ...alertIncidents].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  return (
    <div className="incident-response-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Crosshair size={22} /> Réponse aux Incidents
          </h1>
          <p className="page-subtitle">
            Actions en temps réel · Blocage IP · Isolation réseau · Export rapport
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(incidents.length > 0 || actionLogs.length > 0) && (
            <button
              id="export-rapport"
              className="btn-secondary"
              onClick={() => exportPDF(allIncidents, actionLogs)}
            >
              <Download size={14} /> Export Rapport
            </button>
          )}
          <button id="refresh-incidents" className="btn-secondary" onClick={fetchIncidents}>
            <RefreshCw size={14} /> Actualiser
          </button>
          <span className="badge badge-expert">🔬 Expert</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat-card stat-critical">
          <div className="stat-icon"><AlertTriangle size={20} /></div>
          <div>
            <div className="stat-value">{allIncidents.filter(i => i.severity === 'critical').length}</div>
            <div className="stat-label">🔴 Critiques</div>
          </div>
        </div>
        <div className="stat-card stat-high">
          <div className="stat-icon"><Activity size={20} /></div>
          <div>
            <div className="stat-value">{allIncidents.filter(i => i.severity === 'high').length}</div>
            <div className="stat-label">🟠 Hautes</div>
          </div>
        </div>
        <div className="stat-card stat-total">
          <div className="stat-icon"><Shield size={20} /></div>
          <div>
            <div className="stat-value">{allIncidents.length}</div>
            <div className="stat-label">Total incidents</div>
          </div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-icon"><CheckCircle size={20} /></div>
          <div>
            <div className="stat-value">{actionLogs.filter(l => l.status === 'success').length}</div>
            <div className="stat-label">Actions effectuées</div>
          </div>
        </div>
      </div>

      <div className="ir-grid">
        {/* Left: Incident Timeline */}
        <div className="section-card ir-main">
          <h2 className="section-title">
            <Clock size={16} /> Fil des Incidents
          </h2>

          {loading ? (
            <div className="loading-state"><span className="spinner" /> Chargement…</div>
          ) : allIncidents.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={40} />
              <p>Aucun incident actif — Réseau sécurisé</p>
            </div>
          ) : (
            <div className="alerts-list">
              {allIncidents.map(incident => {
                const color = SEVERITY_COLORS[incident.severity] || 'var(--accent-yellow)';
                const isPending = (id: string) => pendingAction === id;
                return (
                  <div
                    key={incident.id}
                    className="ir-card"
                    style={{ borderLeftColor: color }}
                  >
                    {/* Discord-style header */}
                    <div className="ir-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Shield size={14} style={{ color }} />
                        <span style={{ fontWeight: 700, color, fontSize: 13 }}>
                          🚨 SOC Alert Bot
                        </span>
                        <span className="ir-app-badge">APP</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                          {new Date(incident.time).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <span className={`badge-severity ${incident.severity}`}>
                        {incident.severity.toUpperCase()}
                      </span>
                    </div>

                    {/* Body */}
                    <div className="ir-card-body">
                      <p style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                        {incident.description}
                      </p>

                      <div className="ir-meta-grid">
                        <div>
                          <span className="ir-meta-label">IP Source</span>
                          <code className="ir-ip">{incident.src_ip}</code>
                        </div>
                        <div>
                          <span className="ir-meta-label">Statut</span>
                          <span style={{ color: incident.status === 'open' ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight: 600, fontSize: 12 }}>
                            {incident.status === 'open' ? '● Ouvert' : '✓ Résolu'}
                          </span>
                        </div>
                        {incident.findings && (
                          <div style={{ gridColumn: '1/-1' }}>
                            <span className="ir-meta-label">Findings ML</span>
                            <code style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{incident.findings}</code>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="ir-actions">
                        <button
                          id={`block-${incident.id}`}
                          className="btn-action-danger"
                          disabled={isPending(`block-ip-${incident.id}`)}
                          onClick={() => handleAction('block-ip', incident.src_ip, incident.id)}
                        >
                          {isPending(`block-ip-${incident.id}`) ? (
                            <><span className="spinner-sm" /> En cours…</>
                          ) : (
                            <><Ban size={13} /> Bloquer IP (iptables)</>
                          )}
                        </button>
                        <button
                          id={`isolate-${incident.id}`}
                          className="btn-action-warn"
                          disabled={isPending(`isolate-host-${incident.id}`)}
                          onClick={() => handleAction('isolate-host', incident.src_ip, incident.id)}
                        >
                          {isPending(`isolate-host-${incident.id}`) ? (
                            <><span className="spinner-sm" /> En cours…</>
                          ) : (
                            <><Wifi size={13} /> Isoler l'hôte</>
                          )}
                        </button>
                        <button
                          id={`terminal-${incident.id}`}
                          className="btn-action-info"
                          onClick={() => {
                            alert(`SSH: ssh root@${incident.src_ip}\nnmap -sV ${incident.src_ip}`);
                          }}
                        >
                          <Terminal size={13} /> Console SSH
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Action Log */}
        <div className="section-card ir-sidebar">
          <h2 className="section-title">
            <Activity size={16} /> Journal des Actions
          </h2>
          {actionLogs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              Aucune action encore effectuée
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actionLogs.map(log => (
                <div
                  key={log.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: log.status === 'success'
                      ? 'rgba(16,185,129,0.06)'
                      : 'rgba(239,68,68,0.06)',
                    border: `1px solid ${log.status === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: log.status === 'success' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {log.status === 'success' ? '✓' : '✗'} {log.action}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.time}</span>
                  </div>
                  <code style={{ fontSize: 11, color: 'var(--accent-cyan)' }}>{log.ip}</code>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{log.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
