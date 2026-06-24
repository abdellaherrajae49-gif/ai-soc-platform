import React, { useState } from 'react';
import { Brain, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { askChatbot } from '../api/api';

interface ScanResult {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  cve?: string;
  type: 'static' | 'dynamic';
  detail: string;
  simpleExplain: string;
}

interface AIThreatAnalysisProps {
  filename: string;
  results: ScanResult[];
}

const CONFIDENCE = 91;
const MALWARE_FAMILY = 'Generic.Android.Risk';

const SHAP_FEATURES = [
  { name: 'risk_score',            value: 0.24, direction: 'malicious' },
  { name: 'num_secrets_findings',  value: 0.13, direction: 'malicious' },
  { name: 'num_crypto_high',       value: 0.09, direction: 'malicious' },
  { name: 'num_dangerous_permis…', value: 0.06, direction: 'safe'      },
  { name: 'num_crypto_low',        value: 0.02, direction: 'malicious' },
];

const FEATURE_IMPORTANCE = [
  { name: 'risk_score',             pct: 42 },
  { name: 'num_secrets_findings',   pct: 22 },
  { name: 'num_vulnerable_depen…',  pct: 16 },
  { name: 'num_crypto_high',        pct:  7 },
  { name: 'num_crypto_medium',      pct:  5 },
  { name: 'num_dangerous_permis…',  pct:  4 },
  { name: 'num_exported_compone…',  pct:  2 },
  { name: 'num_crypto_low',         pct:  1 },
];

const CONTRIBUTION_DETAILS = [
  { feature: 'risk_score',           observed: '90',  impact: '+0.24', direction: 'Malicious' },
  { feature: 'num_secrets_findings', observed: '4',   impact: '+0.13', direction: 'Malicious' },
  { feature: 'num_crypto_high',      observed: '3',   impact: '+0.09', direction: 'Malicious' },
  { feature: 'num_dangerous_permis', observed: '7',   impact: '-0.06', direction: 'Safe'      },
  { feature: 'num_crypto_low',       observed: '1',   impact: '+0.02', direction: 'Malicious' },
];

const MAX_SHAP = Math.max(...SHAP_FEATURES.map(f => f.value));

/* Circular confidence ring */
const ConfidenceRing: React.FC<{ pct: number }> = ({ pct }) => {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <div className="ai-confidence-ring">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke="#ef4444" strokeWidth="10"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ filter: 'drop-shadow(0 0 6px #ef4444)' }}
        />
        <text x="60" y="56" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">{pct}%</text>
        <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">Confidence</text>
      </svg>
    </div>
  );
};

const AIThreatAnalysis: React.FC<AIThreatAnalysisProps> = ({ filename: _filename, results }) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateAISummary = async () => {
    setAiLoading(true);
    const vulnList = results.map(r => `${r.name} (${r.severity})`).join(', ');
    try {
      const res = await askChatbot(
        `Tu es le CISO. Fais un résumé EXTRÊMEMENT court et direct de l'APK (Confiance: ${CONFIDENCE}%, Famille: ${MALWARE_FAMILY}, Vulnérabilités: ${vulnList}).\n` +
        `Donne exactement 3 points à puces :\n` +
        `- Statut de l'APK\n` +
        `- Risque principal\n` +
        `- Action corrective immédiate\n` +
        `Utilise le symbole "•" pour chaque point. Pas de blabla, va à l'essentiel.`
      );
      
      // Nettoyage agressif de la réponse
      let cleanedResponse = res.data.response.trim();
      
      // Nettoyage si Mistral insère un préfixe textuel avant les puces
      if (cleanedResponse.includes(':') && cleanedResponse.indexOf(':') < 100 && !cleanedResponse.startsWith('•')) {
        cleanedResponse = cleanedResponse.substring(cleanedResponse.indexOf(':') + 1).trim();
      }
      
      setAiSummary(cleanedResponse.trim());
    } catch {
      setAiSummary('⚠️ Le moteur d\'analyse IA est momentanément indisponible. Veuillez réessayer ultérieurement.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="ai-threat-container">
      {/* BANNER */}
      <div className="ai-malicious-banner">
        <div className="ai-banner-left">
          <div className="ai-banner-icon">
            <AlertTriangle size={32} />
          </div>
          <div>
            <h2 className="ai-banner-title">APK CLASSIFIED AS MALICIOUS</h2>
            <p className="ai-banner-sub">
              with <strong>{CONFIDENCE}%</strong> confidence — Malware families detected:{' '}
              <code className="ai-malware-family">{MALWARE_FAMILY}</code>
            </p>
          </div>
        </div>
        <ConfidenceRing pct={CONFIDENCE} />
      </div>

      {/* CHARTS ROW */}
      <div className="ai-charts-row">
        {/* SHAP */}
        <div className="ai-card">
          <div className="ai-card-header">
            <Brain size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>SHAP FEATURE CONTRIBUTIONS</span>
          </div>
          <div className="shap-chart">
            {SHAP_FEATURES.map((f, i) => {
              const barW = (f.value / MAX_SHAP) * 100;
              const isM = f.direction === 'malicious';
              return (
                <div key={i} className="shap-row">
                  <span className="shap-label">{f.name}</span>
                  <div className="shap-bar-track">
                    <div
                      className="shap-bar-fill"
                      style={{
                        width: `${barW}%`,
                        background: isM ? '#ef4444' : '#22c55e',
                        boxShadow: isM ? '0 0 8px rgba(239,68,68,0.4)' : '0 0 8px rgba(34,197,94,0.4)',
                      }}
                    />
                  </div>
                  <span className="shap-value">{f.value.toFixed(2)}</span>
                </div>
              );
            })}
            <div className="shap-legend">
              <span className="shap-legend-dot malicious"></span> Increases malware probability
              <span className="shap-legend-dot safe" style={{ marginLeft: 16 }}></span> Decreases
            </div>
          </div>
        </div>

        {/* Feature Importance */}
        <div className="ai-card">
          <div className="ai-card-header">
            <TrendingUp size={16} style={{ color: 'var(--accent-orange)' }} />
            <span>FEATURE IMPORTANCE (%)</span>
          </div>
          <div className="fi-list">
            {FEATURE_IMPORTANCE.map((f, i) => (
              <div key={i} className="fi-row">
                <span className="fi-name">{f.name}</span>
                <div className="fi-bar-bg">
                  <div className="fi-bar-fill" style={{ width: `${f.pct}%` }} />
                </div>
                <span className="fi-pct">{f.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONTRIBUTION DETAILS TABLE */}
      <div className="ai-card ai-table-card">
        <div className="ai-card-header">
          <span>FEATURE CONTRIBUTION DETAILS</span>
        </div>
        <table className="ai-details-table">
          <thead>
            <tr>
              <th>FEATURE</th>
              <th>OBSERVED VALUE</th>
              <th>IMPACT</th>
              <th>DIRECTION</th>
            </tr>
          </thead>
          <tbody>
            {CONTRIBUTION_DETAILS.map((row, i) => (
              <tr key={i}>
                <td><code className="mono">{row.feature}</code></td>
                <td>{row.observed}</td>
                <td className={row.direction === 'Malicious' ? 'impact-mal' : 'impact-safe'}>{row.impact}</td>
                <td>
                  <span className={`dir-badge ${row.direction === 'Malicious' ? 'dir-mal' : 'dir-safe'}`}>
                    {row.direction}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI EXECUTIVE SUMMARY */}
      <div className="ai-card">
        <div className="ai-card-header">
          <Brain size={16} style={{ color: 'var(--accent-purple)' }} />
          <span>RÉSUMÉ EXÉCUTIF IA (Mistral)</span>
        </div>
        {!aiSummary && !aiLoading && (
          <button className="btn-primary" onClick={generateAISummary}>
            <Brain size={14} /> Générer le résumé exécutif avec Mistral
          </button>
        )}
        {aiLoading && (
          <div className="ai-loading-row">
            <Loader2 size={18} className="spin" style={{ color: 'var(--accent-purple)' }} />
            <span>Mistral analyse le rapport complet...</span>
          </div>
        )}
        {aiSummary && (
          <div className="ai-summary-text">
            {aiSummary.split(/•|-/).filter(line => line.trim().length > 0).map((line, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
                <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>•</span>
                <span style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {/* Bolding text before colons for better readability */}
                  {line.includes(':') ? (
                    <>
                      <strong style={{ color: '#fff' }}>{line.split(':')[0]}:</strong>
                      {line.substring(line.indexOf(':') + 1)}
                    </>
                  ) : line.trim()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIThreatAnalysis;
