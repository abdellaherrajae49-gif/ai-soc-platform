import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Clock, Target, Wifi } from 'lucide-react';
import { BASE_URL, type Alert as AlertItem } from '../api/api';

interface AlertCardProps {
  alert: AlertItem;
  readOnly?: boolean;
}

const PRIORITY_CONFIG = {
  1: { label: 'CRITIQUE', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: '🔴' },
  2: { label: 'HAUTE',    color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', icon: '🟠' },
  3: { label: 'MOYENNE',  color: '#eab308', bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.3)',  icon: '🟡' },
};

const AlertCard: React.FC<AlertCardProps> = ({ alert, readOnly = false }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = PRIORITY_CONFIG[alert.priority as 1 | 2 | 3] ?? PRIORITY_CONFIG[3];

  const formattedTime = new Date(alert.time).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div
      className="alert-card"
      style={{ borderLeftColor: cfg.color, background: cfg.bg, borderColor: cfg.border }}
      id={`alert-${alert.id}`}
    >
      {/* Header row */}
      <div className="alert-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="alert-priority-badge" style={{ background: cfg.color }}>
          {cfg.icon} P{alert.priority}
        </div>

        <div className="alert-message-col">
          <p className="alert-message">{alert.message}</p>
          <div className="alert-meta">
            <span><Clock size={11} /> {formattedTime}</span>
            <span><Wifi size={11} /> {alert.src_ip} → {alert.dst_ip}</span>
          </div>
        </div>

        <div className="alert-severity-label" style={{ color: cfg.color }}>
          {cfg.label}
        </div>

        <button className="alert-expand-btn" aria-label="Expand alert details">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="alert-details">
          <div className="alert-details-grid">
            <div className="alert-detail-item">
              <span className="detail-label"><AlertCircle size={11} /> Classification</span>
              <span className="detail-value">{alert.classification}</span>
            </div>
            <div className="alert-detail-item">
              <span className="detail-label"><Wifi size={11} /> Source IP</span>
              <span className="detail-value detail-ip">{alert.src_ip}</span>
            </div>
            <div className="alert-detail-item">
              <span className="detail-label"><Target size={11} /> Destination IP</span>
              <span className="detail-value detail-ip">{alert.dst_ip}</span>
            </div>
            <div className="alert-detail-item">
              <span className="detail-label"><Clock size={11} /> Timestamp</span>
              <span className="detail-value">{alert.time}</span>
            </div>
          </div>

          {!readOnly && (
            <div className="alert-actions">
              <button
                id={`alert-acknowledge-${alert.id}`}
                className="btn-action btn-acknowledge"
                onClick={(e) => { e.stopPropagation(); window.alert('Alert acknowledged.'); }}
              >
                ✓ Acquitter
              </button>
              <button
                id={`alert-escalate-${alert.id}`}
                className="btn-action btn-escalate"
                onClick={(e) => { e.stopPropagation(); window.alert('Alert escalated.'); }}
              >
                ↑ Escalader
              </button>
              <button
                id={`alert-block-${alert.id}`}
                className="btn-action btn-block"
                onClick={async (e) => { 
                  e.stopPropagation(); 
                  try {
                    const res = await fetch(`${BASE_URL}/api/actions/block-ip`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('soc_jwt')}`
                      },
                      body: JSON.stringify({ ip: alert.src_ip })
                    });
                    const data = await res.json();
                    if (res.ok) window.alert(`Success: ${data.message}`);
                    else window.alert(`Error: ${data.error}`);
                  } catch (_err) {
                    window.alert('Error: Could not reach the server.');
                  }
                }}
              >
                🚫 Bloquer IP
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertCard;
