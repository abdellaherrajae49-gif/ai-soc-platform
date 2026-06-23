import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.7.174:5000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Inject JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('soc_jwt');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('soc_jwt');
      localStorage.removeItem('soc_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const login = (username: string, password: string) =>
  api.post<{ token: string; role: string; username: string }>('/auth/login', { username, password });

export const getMe = () =>
  api.get<{ username: string; role: string }>('/auth/me');

// ── Alerts ────────────────────────────────────────────────────────────────────
export interface Alert {
  id: string;
  time: string;
  message: string;
  src_ip: string;
  dst_ip: string;
  priority: number;
  classification: string;
}

export const getAlerts = (limit = 20, hours = 24, priority?: number) =>
  api.get<{ count: number; alerts: Alert[]; _mock?: boolean }>(
    `/alerts?limit=${limit}&hours=${hours}${priority ? `&priority=${priority}` : ''}`
  );

export const getAlertStats = () =>
  api.get<{ p1: number; p2: number; p3: number; total: number }>('/alerts/stats');

// ── Metrics ───────────────────────────────────────────────────────────────────
export interface MetricsSnapshot {
  timestamp: string;
  'cpu.usage_percent'?: number;
  'mem.used_percent'?: number;
  'disk.used_percent'?: number;
  'net.bytes_recv'?: number;
  'net.bytes_sent'?: number;
  _mock?: boolean;
  [key: string]: unknown;
}

export interface MetricsPoint {
  time: string;
  cpu: number;
  mem: number;
}

export const getMetrics = () =>
  api.get<MetricsSnapshot>('/metrics');

export const getMetricsHistory = (minutes = 60) =>
  api.get<{ points: MetricsPoint[]; _mock?: boolean }>(`/metrics/history?minutes=${minutes}`);

// ── Chatbot ───────────────────────────────────────────────────────────────────
export const askChatbot = async (message: string, context?: string) => {
  try {
    const infraContext = `
TOPOLOGIE ET INFRASTRUCTURE DU SOC:
- Réseaux: LAN A1 (192.168.10.0/24, GW: 192.168.10.1, VMnet2), DMZ A2 (192.168.20.0/24, GW: 192.168.20.1, VMnet3), Secondary A3 (192.168.30.0/24, GW: 192.168.30.1, VMnet4), OpenVPN (10.0.0.0/24).
- Machines: 
  * R-01 (pfSense Firewall) : 192.168.10.1 / 20.1 / 30.1 / 99.1
  * SOC-Center (Ubuntu) : 192.168.10.10 (LAN)
  * Server-Cible (Ubuntu) : 192.168.20.10 (DMZ)
  * Kali-Red (Attaquant) : 192.168.20.50 (DMZ)
  * Kali-Blue (Défenseur) : 192.168.30.20 (Secondary)
  * PC-A1 (Ubuntu Desktop) : ~192.168.10.101 (LAN)
  * PC-A3 (Ubuntu Desktop) : ~192.168.30.100 (Secondary)
Utilise ces adresses IP exactes pour répondre aux questions de l'administrateur.
`;

    const prompt = `Tu es un assistant expert en cybersécurité SOC.\n${infraContext}\n\nContexte additionnel:\n${context || 'Aucun'}\n\nQuestion: ${message}`;
      
    const res = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral:7b-instruct-q4_0',
        prompt,
        stream: false
      })
    });
    if (!res.ok) throw new Error('Ollama HTTP error');
    const data = await res.json();
    return { data: { response: data.response } };
  } catch (e) {
    // Fallback to backend proxy if direct connection fails
    return api.post<{ response: string; model?: string; duration?: number }>(
      '/ai/chat',
      { message, context }
    );
  }
};

// ── Incidents ─────────────────────────────────────────────────────────────────
export interface Incident {
  id: string;
  time: string;
  description: string;
  severity: string;
  src_ip: string;
  status: string;
}

export const getIncidents = (days = 7, limit = 50) =>
  api.get<{ count: number; incidents: Incident[] }>(`/incidents?days=${days}&limit=${limit}`);

export const createIncident = (data: { description: string; severity: string; src_ip?: string }) =>
  api.post<{ message: string; incident: Incident }>('/incidents', data);

// ── Topology ──────────────────────────────────────────────────────────────────
export interface TopologyNode {
  id: string;
  label: string;
  props: Record<string, unknown>;
}

export interface TopologyEdge {
  source: string;
  target: string;
  type: string;
  props: Record<string, unknown>;
}

export const getTopology = () =>
  api.get<{ nodes: TopologyNode[]; edges: TopologyEdge[]; _mock?: boolean }>('/topology');

// ── ML Predictions ────────────────────────────────────────────────────────────
export interface MLAlert {
  priority?: number;
  src_port?: number;
  dst_port?: number;
  packet_count?: number;
  alert_frequency?: number;
  hour_of_day?: number;
  is_internal_src?: number;
  bytes_total?: number;
  duration_sec?: number;
}

export interface MLPrediction {
  is_attack: boolean;
  is_anomaly: boolean;
  confidence: number;
  confidence_lr: number;
  cluster: number;
  cluster_name: string;
  rf_label: string;
  lr_label: string;
  is_sensitive_port: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  features_used: Record<string, number>;
}

export const mlPredict = (alert: MLAlert) =>
  api.post<MLPrediction>('/api/ml/predict', alert);

export const mlBatchPredict = (alerts: MLAlert[]) =>
  api.post<MLPrediction[]>('/api/ml/batch', { alerts });

export const mlMetadata = () =>
  api.get<{ trained_at: string; n_samples: number; n_features: number; models: Record<string, unknown> }>('/api/ml/metadata');

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = () =>
  api.get<{ status: string; timestamp: string; services: Record<string, unknown> }>('/health');

export default api;
