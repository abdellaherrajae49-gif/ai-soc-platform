# API Reference

Base URL: `http://127.0.0.1:5000` (configurable via `VITE_API_URL` env var)

All authenticated endpoints require `Authorization: Bearer <jwt>`.

## Auth

| Method | Path           | Body                          | Response                                |
|--------|----------------|-------------------------------|-----------------------------------------|
| POST   | `/auth/login`  | `{ username, password }`      | `{ token, role, username }`             |
| GET    | `/auth/me`     | —                             | `{ username, role }`                    |

## Alerts (InfluxDB / Suricata)

| Method | Path             | Query Params                    | Response                                       |
|--------|------------------|---------------------------------|------------------------------------------------|
| GET    | `/alerts`        | `limit`, `hours`, `priority?`   | `{ count, alerts: Alert[], _mock? }`           |
| GET    | `/alerts/stats`  | —                               | `{ p1, p2, p3, total }`                        |

```ts
interface Alert {
  id: string; time: string; message: string;
  src_ip: string; dst_ip: string;
  priority: number; classification: string;
}
```

## Metrics (InfluxDB)

| Method | Path               | Query Params | Response                                    |
|--------|--------------------|--------------|--------------------------------------------|
| GET    | `/metrics`         | —            | `MetricsSnapshot` (cpu, mem, disk, net)    |
| GET    | `/metrics/history` | `minutes`    | `{ points: MetricsPoint[], _mock? }`      |

## ML Predictions (Python subprocess)

| Method | Path               | Body                    | Response              |
|--------|--------------------|-------------------------|-----------------------|
| POST   | `/api/ml/predict`  | `MLAlert` object        | `MLPrediction`        |
| POST   | `/api/ml/batch`    | `{ alerts: MLAlert[] }` | `MLPrediction[]`      |
| GET    | `/api/ml/metadata` | —                       | `{ trained_at, n_samples, n_features, models }` |

```ts
interface MLAlert {
  priority?: number; src_port?: number; dst_port?: number;
  packet_count?: number; alert_frequency?: number;
  hour_of_day?: number; is_internal_src?: number;
  bytes_total?: number; duration_sec?: number;
}

interface MLPrediction {
  is_attack: boolean; is_anomaly: boolean;
  confidence: number; confidence_lr: number;
  cluster: number; cluster_name: string;
  rf_label: string; lr_label: string;
  is_sensitive_port: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  features_used: Record<string, number>;
}
```

Backend calls Python via `execSync` — runs `ml/ml_predict.py` functions inline.

## Incidents

| Method | Path          | Body/Params                              | Response                         |
|--------|---------------|------------------------------------------|----------------------------------|
| GET    | `/incidents`  | `days`, `limit`                          | `{ count, incidents: Incident[] }` |
| POST   | `/incidents`  | `{ description, severity, src_ip? }`     | `{ message, incident }`         |

## Topology (Neo4j)

| Method | Path        | Response                                    |
|--------|-------------|---------------------------------------------|
| GET    | `/topology` | `{ nodes: TopologyNode[], edges: TopologyEdge[], _mock? }` |

## AI Chatbot

| Method | Path       | Body                      | Response                         |
|--------|------------|---------------------------|----------------------------------|
| POST   | `/ai/chat` | `{ message, context? }`   | `{ response, model?, duration? }` |

Frontend also tries direct Ollama connection at `http://127.0.0.1:11434/api/generate` first, falls back to backend proxy.

## Health

| Method | Path      | Response                              |
|--------|-----------|---------------------------------------|
| GET    | `/health` | `{ status, timestamp, services }`     |

## WebSocket

Backend creates a `WebSocketServer` on the same HTTP server for real-time updates.
