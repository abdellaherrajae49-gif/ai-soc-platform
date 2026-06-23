import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import type { MetricsPoint } from '../api/api';

interface MetricsChartProps {
  data: MetricsPoint[];
  height?: number;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
};

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="tooltip-value">
          {p.name}: <strong>{p.value.toFixed(1)}%</strong>
        </p>
      ))}
    </div>
  );
};

const MetricsChart: React.FC<MetricsChartProps> = ({ data, height = 200 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="chart-empty" style={{ height }}>
        <div className="chart-empty-inner">
          <span className="spinner" />
          <p>En attente des métriques…</p>
        </div>
      </div>
    );
  }

  const formatted = data.map(p => ({
    ...p,
    time: formatTime(p.time),
    cpu:  Math.round(p.cpu * 10) / 10,
    mem:  Math.round(p.mem * 10) / 10,
  }));

  return (
    <div id="metrics-chart" style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="cpu"
            name="CPU"
            stroke="#00d4ff"
            strokeWidth={2}
            fill="url(#cpuGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#00d4ff' }}
          />
          <Area
            type="monotone"
            dataKey="mem"
            name="RAM"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#memGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#7c3aed' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;
