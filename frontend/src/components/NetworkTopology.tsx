import React, { useEffect, useRef } from 'react';
import type { TopologyNode, TopologyEdge } from '../api/api';

interface NetworkTopologyProps {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

const NODE_COLORS: Record<string, string> = {
  Router:   '#00d4ff',
  Firewall: '#f97316',
  Server:   '#10b981',
  Attacker: '#ef4444',
  Defender: '#7c3aed',
  default:  '#94a3b8',
};

const NODE_ICONS: Record<string, string> = {
  Router:   '🔀',
  Firewall: '🛡️',
  Server:   '🖥️',
  Attacker: '⚔️',
  Defender: '🔒',
  default:  '●',
};

const EDGE_COLORS: Record<string, string> = {
  ATTACKS:   '#ef4444',
  ROUTES_TO: '#00d4ff',
  MONITORS:  '#10b981',
  CONNECTS:  '#94a3b8',
  default:   '#475569',
};

const NetworkTopology: React.FC<NetworkTopologyProps> = ({ nodes, edges }) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="topology-empty">
        <p>🗺️ Aucune donnée de topologie disponible</p>
        <p className="text-muted">Vérifiez que Neo4j est opérationnel</p>
      </div>
    );
  }

  // Layout: place nodes in a circle
  const W = 700, H = 420, CX = W / 2, CY = H / 2, R = 150;
  const nodePositions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
    nodePositions[node.id] = {
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
    };
  });

  return (
    <div className="topology-container" id="network-topology">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxHeight: 420 }}>
        <defs>
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <marker
              key={type}
              id={`arrow-${type}`}
              markerWidth="8" markerHeight="8"
              refX="6" refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill={color} />
            </marker>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const src  = nodePositions[edge.source];
          const tgt  = nodePositions[edge.target];
          if (!src || !tgt) return null;
          const color    = EDGE_COLORS[edge.type] ?? EDGE_COLORS.default;
          const markerId = `arrow-${EDGE_COLORS[edge.type] ? edge.type : 'default'}`;

          // Offset endpoint so arrow stops at node circle
          const dx = tgt.x - src.x, dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = dx / dist, ny = dy / dist;
          const x2 = tgt.x - nx * 22, y2 = tgt.y - ny * 22;

          return (
            <g key={i}>
              <line
                x1={src.x} y1={src.y} x2={x2} y2={y2}
                stroke={color}
                strokeWidth={1.5}
                strokeDasharray={edge.type === 'ATTACKS' ? '5 3' : undefined}
                strokeOpacity={0.7}
                markerEnd={`url(#${markerId})`}
              />
              <text
                x={(src.x + tgt.x) / 2}
                y={(src.y + tgt.y) / 2 - 4}
                textAnchor="middle"
                fontSize={9}
                fill={color}
                fillOpacity={0.8}
              >
                {edge.type}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const pos   = nodePositions[node.id];
          if (!pos) return null;
          const color = NODE_COLORS[node.label] ?? NODE_COLORS.default;
          const icon  = NODE_ICONS[node.label]  ?? NODE_ICONS.default;
          const name  = (node.props?.name as string) ?? node.label;
          const ip    = (node.props?.ip   as string) ?? '';

          return (
            <g key={node.id} style={{ cursor: 'pointer' }}>
              {/* Glow ring */}
              <circle cx={pos.x} cy={pos.y} r={22} fill={color} opacity={0.12} />
              {/* Main circle */}
              <circle
                cx={pos.x} cy={pos.y} r={18}
                fill="rgba(13,27,42,0.9)"
                stroke={color}
                strokeWidth={2}
              />
              {/* Icon */}
              <text x={pos.x} y={pos.y + 5} textAnchor="middle" fontSize={14}>
                {icon}
              </text>
              {/* Label */}
              <text
                x={pos.x} y={pos.y + 32}
                textAnchor="middle" fontSize={10}
                fill="#e2e8f0" fontWeight="600"
              >
                {name}
              </text>
              {ip && (
                <text
                  x={pos.x} y={pos.y + 44}
                  textAnchor="middle" fontSize={9}
                  fill={color} opacity={0.8}
                >
                  {ip}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="topology-legend">
        {Object.entries(EDGE_COLORS).filter(([k]) => k !== 'default').map(([type, color]) => (
          <div key={type} className="legend-item">
            <div className="legend-line" style={{ background: color }} />
            <span>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NetworkTopology;
