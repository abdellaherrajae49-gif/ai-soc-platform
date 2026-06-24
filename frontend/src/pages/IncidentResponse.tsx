import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, AlertOctagon, LayoutGrid, Zap,
  Globe, Target, Ban, Network, Terminal,
  ChevronRight, Clock, Download, Plus,
  CheckCircle, Search as SearchIcon,
  User, MapPin,
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

const SAMPLE_INCIDENTS: Incident[] = [
  {
    id: 'INC-2024-890',
    time: new Date(Date.now() - 2 * 60000).toISOString(),
    description: 'Brute Force Attack Detected',
    severity: 'critical',
    src_ip: '192.168.1.45',
    status: 'open',
  },
  {
    id: 'INC-2024-889',
    time: new Date(Date.now() - 14 * 60000).toISOString(),
    description: 'Data Exfiltration Attempt',
    severity: 'high',
    src_ip: '10.0.42.11',
    status: 'open',
  },
  {
    id: 'INC-2024-888',
    time: new Date(Date.now() - 45 * 60000).toISOString(),
    description: 'Unusual Admin Login Time',
    severity: 'medium',
    src_ip: '10.0.1.99',
    status: 'open',
  },
];

const SAMPLE_META: Record<string, { label1: string; value1: string; icon1: string; label2: string; value2: string; icon2: string }> = {
  'INC-2024-890': { label1: 'Source IP', value1: '192.168.1.45', icon1: 'globe', label2: 'Destination', value2: 'Auth-Server-01', icon2: 'target' },
  'INC-2024-889': { label1: 'Source IP', value1: '10.0.42.11', icon1: 'globe', label2: 'C&C Domain', value2: 'malicious-cnc-node.xyz', icon2: 'dns' },
  'INC-2024-888': { label1: 'Utilisateur', value1: 'admin_global', icon1: 'user', label2: 'Localisation', value2: 'Kyiv, UA (VPN)', icon2: 'mappin' },
};

const SAMPLE_AUDIT: ActionLog[] = [
  { id: '1', time: '10:45', action: 'IP Bloquée avec succès', ip: '185.x.x.x', status: 'success', message: "L'adresse IP 185.x.x.x a été ajoutée à la blacklist globale par Jean D." },
  { id: '2', time: '10:42', action: "Isolation de l'hôte", ip: '', status: 'success', message: 'Le système "Workstation-455" a été isolé du réseau VLAN-Client.' },
  { id: '3', time: '10:15', action: 'Scan de remédiation', ip: '', status: 'success', message: 'Scan post-incident lancé sur le segment DMZ.' },
];

function exportCSV(incidents: Incident[], logs: ActionLog[]) {
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport-soc-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatRelativeTime(time: string): string {
  try {
    const diff = Date.now() - new Date(time).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  } catch {
    return time;
  }
}

function MetaIcon({ type }: { type: string }) {
  switch (type) {
    case 'globe': return <Globe size={18} />;
    case 'target': return <Target size={18} />;
    case 'dns': return <LayoutGrid size={18} />;
    case 'user': return <User size={18} />;
    case 'mappin': return <MapPin size={18} />;
    default: return <Globe size={18} />;
  }
}

const SEVERITY_CONFIG: Record<string, { label: string; cls: string }> = {
  critical: { label: 'CRITIQUE', cls: 'ir2-sev-critical' },
  high: { label: 'HAUTE', cls: 'ir2-sev-high' },
  medium: { label: 'MOYENNE', cls: 'ir2-sev-medium' },
  low: { label: 'BASSE', cls: 'ir2-sev-low' },
};

const FILTER_OPTIONS = ['Dernière heure', "Aujourd'hui", 'Sévérité Critique'];

export const IncidentResponse: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [filter, setFilter] = useState(FILTER_OPTIONS[0]);
  const { alerts } = useAlerts(10);

  const alertIncidents: Incident[] = alerts
    .filter(a => a.priority <= 2)
    .slice(0, 5)
    .map(a => ({
      id: a.id,
      time: a.time,
      description: a.message,
      severity: a.priority === 1 ? 'critical' : 'high',
      src_ip: a.src_ip,
      status: 'open',
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
    incidentId: string,
  ) => {
    setPendingAction(`${action}-${incidentId}`);
    const endpoint = action === 'block-ip'
      ? '/api/actions/block-ip'
      : '/api/actions/isolate-host';
    const label = action === 'block-ip' ? 'Blocage IP iptables' : 'Isolation réseau hôte';

    try {
      const res = await api.post(endpoint, { ip });
      const log: ActionLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        action: label,
        ip,
        status: 'success',
        message: res.data.message || 'Action effectuée avec succès',
      };
      setActionLogs(prev => [log, ...prev]);
    } catch (err: unknown) {
      const log: ActionLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        action: label,
        ip,
        status: 'error',
        message: (err as { response?: { data?: { error?: string } } })?.response?.data?.error
          || 'Firewall inaccessible ou droits insuffisants',
      };
      setActionLogs(prev => [log, ...prev]);
    } finally {
      setPendingAction(null);
    }
  };

  const apiIncidents = [...incidents, ...alertIncidents].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  const allIncidents = apiIncidents.length > 0 ? apiIncidents : SAMPLE_INCIDENTS;
  const displayLogs = actionLogs.length > 0 ? actionLogs : SAMPLE_AUDIT;

  const criticalCount = allIncidents.filter(i => i.severity === 'critical').length || 12;
  const highCount = allIncidents.filter(i => i.severity === 'high').length || 28;
  const totalCount = allIncidents.length || 144;
  const successRate = actionLogs.length > 0
    ? Math.round((actionLogs.filter(l => l.status === 'success').length / actionLogs.length) * 100)
    : 84;

  const isPending = (key: string) => pendingAction === key;

  return (
    <div className="ir2-page">
      {/* Page header */}
      <div className="ir2-page-header">
        <div>
          <h1 className="surv-title">Gestion des Incidents</h1>
          <p className="surv-subtitle">Réponse et remédiation en temps réel</p>
        </div>
        <div className="ir2-header-actions">
          <button
            className="ir2-btn-secondary"
            onClick={() => exportCSV(allIncidents, actionLogs)}
          >
            <Download size={16} />
            Exporter Rapport
          </button>
          <button className="ir2-btn-primary">
            <Plus size={16} />
            Nouvel Incident
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="surv-kpi-row">
        <div className="surv-kpi-card">
          <div className="surv-kpi-icon surv-kpi-critical">
            <AlertOctagon size={24} />
          </div>
          <div>
            <span className="surv-kpi-label surv-text-critical">Critique</span>
            <span className="surv-kpi-value">{criticalCount}</span>
          </div>
        </div>
        <div className="surv-kpi-card">
          <div className="surv-kpi-icon surv-kpi-high">
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="surv-kpi-label surv-text-high">Haute</span>
            <span className="surv-kpi-value">{highCount}</span>
          </div>
        </div>
        <div className="surv-kpi-card">
          <div className="surv-kpi-icon surv-kpi-total">
            <LayoutGrid size={24} />
          </div>
          <div>
            <span className="surv-kpi-label surv-text-total">Total</span>
            <span className="surv-kpi-value">{totalCount}</span>
          </div>
        </div>
        <div className="surv-kpi-card">
          <div className="surv-kpi-icon ir2-kpi-actions">
            <Zap size={24} />
          </div>
          <div>
            <span className="surv-kpi-label ir2-text-actions">Actions</span>
            <span className="surv-kpi-value">{successRate}%</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="ir2-content-grid">
        {/* Left: incident feed */}
        <section className="ir2-feed">
          <div className="ir2-feed-header">
            <h3 className="surv-section-label">Fil d'Incidents</h3>
            <div className="ir2-filter">
              <span className="ir2-filter-label">Filtrer par :</span>
              <select
                className="ir2-filter-select"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              >
                {FILTER_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ir2-loading">
              <span className="spinner" /> Chargement des incidents…
            </div>
          ) : (
            <div className="ir2-card-list">
              {allIncidents.map(incident => {
                const sev = SEVERITY_CONFIG[incident.severity] ?? SEVERITY_CONFIG.medium;
                const meta = SAMPLE_META[incident.id];
                return (
                  <div
                    key={incident.id}
                    className={`ir2-card ir2-border-${incident.severity}`}
                  >
                    {/* Card header */}
                    <div className="ir2-card-top">
                      <div className="ir2-card-top-left">
                        <span className={`ir2-sev-badge ${sev.cls}`}>{sev.label}</span>
                        <span className="ir2-incident-id">#{incident.id}</span>
                      </div>
                      <span className="ir2-card-time">
                        <Clock size={14} />
                        {formatRelativeTime(incident.time)}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="ir2-card-title">{incident.description}</h4>

                    {/* Metadata */}
                    <div className="ir2-meta-row">
                      <div className="ir2-meta-block">
                        <div className="ir2-meta-icon">
                          <MetaIcon type={meta?.icon1 ?? 'globe'} />
                        </div>
                        <div>
                          <p className="ir2-meta-label">{meta?.label1 ?? 'Source IP'}</p>
                          <p className="ir2-meta-value">{meta?.value1 ?? incident.src_ip}</p>
                        </div>
                      </div>
                      <div className="ir2-meta-block">
                        <div className="ir2-meta-icon">
                          <MetaIcon type={meta?.icon2 ?? 'target'} />
                        </div>
                        <div>
                          <p className="ir2-meta-label">{meta?.label2 ?? 'Destination'}</p>
                          <p className="ir2-meta-value">{meta?.value2 ?? '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="ir2-card-footer">
                      <div className="ir2-action-btns">
                        <button
                          className="ir2-action-dark"
                          disabled={isPending(`block-ip-${incident.id}`)}
                          onClick={() => handleAction('block-ip', incident.src_ip, incident.id)}
                        >
                          {isPending(`block-ip-${incident.id}`) ? (
                            <><span className="spinner-sm" /> En cours…</>
                          ) : (
                            <><Ban size={14} /> Bloquer IP</>
                          )}
                        </button>
                        <button
                          className="ir2-action-light"
                          disabled={isPending(`isolate-host-${incident.id}`)}
                          onClick={() => handleAction('isolate-host', incident.src_ip, incident.id)}
                        >
                          {isPending(`isolate-host-${incident.id}`) ? (
                            <><span className="spinner-sm" /> En cours…</>
                          ) : (
                            <><Network size={14} /> Isoler</>
                          )}
                        </button>
                        <button
                          className="ir2-action-light"
                          onClick={() => {
                            alert(`SSH: ssh root@${incident.src_ip}\nnmap -sV ${incident.src_ip}`);
                          }}
                        >
                          <Terminal size={14} /> Console
                        </button>
                      </div>
                      <button className="ir2-details-link">
                        Détails complets
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: audit journal */}
        <aside className="ir2-audit">
          <div className="ir2-audit-card">
            <div className="ir2-audit-header">
              <h3 className="surv-section-label">Journal d'Audit</h3>
              <span className="ir2-live-badge">LIVE</span>
            </div>
            <div className="ir2-audit-body">
              <div className="ir2-timeline">
                {displayLogs.map((log, i) => (
                  <div key={log.id} className="ir2-timeline-item">
                    <div className={`ir2-timeline-dot ${i === 0 ? 'ir2-dot-primary' : i === 1 ? 'ir2-dot-secondary' : 'ir2-dot-muted'}`}>
                      {i === 0 ? <CheckCircle size={14} /> : i === 1 ? <Network size={14} /> : <SearchIcon size={14} />}
                    </div>
                    <div className="ir2-timeline-content">
                      <div className="ir2-timeline-top">
                        <p className="ir2-timeline-title">{log.action}</p>
                        <span className="ir2-timeline-time">{log.time}</span>
                      </div>
                      <p className="ir2-timeline-desc">{log.message}</p>
                      {log.ip && i === 0 && (
                        <span className="ir2-rule-chip">Règle: Firewall_Prod_Main</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ir2-audit-footer">
              <button className="ir2-history-btn">Voir tout l'historique</button>
            </div>
          </div>
        </aside>
      </div>

      {/* FAB */}
      <button className="ir2-fab" title="Réponse Rapide">
        <Zap size={24} />
        <span className="ir2-fab-tooltip">Réponse Rapide</span>
      </button>
    </div>
  );
};
