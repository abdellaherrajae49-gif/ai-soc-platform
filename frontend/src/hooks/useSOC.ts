import { useState, useEffect, useCallback } from 'react';
import {
  getAlerts, getAlertStats, getMetrics, getMetricsHistory,
  getIncidents, getTopology,
} from '../api/api';
import type { Alert, MetricsSnapshot, MetricsPoint, Incident, TopologyNode, TopologyEdge } from '../api/api';

// ── useAlerts ──────────────────────────────────────────────────────────────
export function useAlerts(limit = 20, hours = 24) {
  const [alerts, setAlerts]     = useState<Alert[]>([]);
  const [stats, setStats]       = useState<{ p1: number; p2: number; p3: number; total: number } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const [alertsRes, statsRes] = await Promise.allSettled([
        getAlerts(limit, hours),
        getAlertStats(),
      ]);

      if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data.alerts);
      else setError('Impossible de charger les alertes');

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } catch (err) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [limit, hours]);

  useEffect(() => {
    fetchAlerts();
    // Auto-refresh every 30s
    const id = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  return { alerts, stats, loading, error, refetch: fetchAlerts };
}

// ── useMetrics ─────────────────────────────────────────────────────────────
export function useMetrics(historyMinutes = 60) {
  const [metrics, setMetrics]               = useState<MetricsSnapshot | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<MetricsPoint[]>([]);
  const [loading, setLoading]               = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const [snap, hist] = await Promise.allSettled([
        getMetrics(),
        getMetricsHistory(historyMinutes),
      ]);
      if (snap.status === 'fulfilled') setMetrics(snap.value.data);
      if (hist.status === 'fulfilled') setMetricsHistory(hist.value.data.points);
    } finally {
      setLoading(false);
    }
  }, [historyMinutes]);

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 15_000); // refresh every 15s
    return () => clearInterval(id);
  }, [fetchMetrics]);

  return { metrics, metricsHistory, loading, refetch: fetchMetrics };
}

// ── useIncidents ───────────────────────────────────────────────────────────
export function useIncidents(days = 7, limit = 50) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await getIncidents(days, limit);
      setIncidents(res.data.incidents);
    } finally {
      setLoading(false);
    }
  }, [days, limit]);

  useEffect(() => {
    fetchIncidents();
    const id = setInterval(fetchIncidents, 60_000);
    return () => clearInterval(id);
  }, [fetchIncidents]);

  return { incidents, loading, refetch: fetchIncidents };
}

// ── useTopology ────────────────────────────────────────────────────────────
export function useTopology() {
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [edges, setEdges] = useState<TopologyEdge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopology = useCallback(async () => {
    try {
      const res = await getTopology();
      setNodes(res.data.nodes);
      setEdges(res.data.edges);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopology();
    const id = setInterval(fetchTopology, 120_000); // refresh every 2min
    return () => clearInterval(id);
  }, [fetchTopology]);

  return { nodes, edges, loading, refetch: fetchTopology };
}
