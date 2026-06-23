# Backend & ML Pipeline

## Backend (Node.js / Express)

**File**: `backend/server.js` (single file, all routes)

### External Dependencies

| Service    | Default URL                    | Purpose                    |
|------------|--------------------------------|----------------------------|
| InfluxDB   | `http://localhost:8086`        | Alerts (Suricata) + system metrics |
| Neo4j      | `bolt://localhost:7687`        | Network topology graph     |
| Ollama     | `http://192.168.7.1:11434`    | Mistral 7B LLM for chatbot |
| Python     | `.venv/Scripts/python.exe`    | ML model inference         |

### Key Details

- JWT secret: `soc-jwt-secret-2026` (hardcoded default)
- InfluxDB org: `SOC-PFA-YAOE`
- Neo4j credentials: `neo4j` / `abd3llah`
- CORS: wide open (`origin: '*'`)
- ML predictions: calls Python via `execSync` (synchronous subprocess)
- Backend gracefully handles missing Neo4j (optional driver)
- Scanner module in `backend/scanner.js` (vulnerability scanning)

### Infrastructure (SOC Lab)

Network topology used in chatbot context:
- **LAN A1**: 192.168.10.0/24 (VMnet2) — SOC-Center at .10, PC-A1 at .101
- **DMZ A2**: 192.168.20.0/24 (VMnet3) — Server-Cible at .10, Kali-Red at .50
- **Secondary A3**: 192.168.30.0/24 (VMnet4) — Kali-Blue at .20, PC-A3 at .100
- **OpenVPN**: 10.0.0.0/24
- **Firewall**: pfSense R-01 at .1 on each subnet + 99.1

## ML Pipeline

### Files

| File                   | Purpose                                      |
|------------------------|----------------------------------------------|
| `ml/generate_dataset.py` | Generates synthetic training data           |
| `ml/train_models.py`    | Trains 4 models, saves to `ml/models/`      |
| `ml/ml_predict.py`      | Prediction functions (loaded by backend)     |

### Models

1. **Random Forest** — Binary classification (attack vs benign)
2. **Logistic Regression** — Binary classification (secondary opinion)
3. **Isolation Forest** — Anomaly detection (unsupervised)
4. **K-Means** — Clustering (behavioral grouping)

### Feature Set (9 features)

```
priority, src_port, dst_port, packet_count,
alert_frequency, hour_of_day, is_internal_src,
bytes_total, duration_sec
```

### Prediction Output

Each prediction returns:
- `is_attack` (RF verdict), `is_anomaly` (Isolation Forest)
- `confidence` (RF), `confidence_lr` (LR)
- `cluster` + `cluster_name` (K-Means)
- `rf_label`, `lr_label` (human-readable)
- `severity`: CRITICAL / HIGH / MEDIUM / LOW
- `is_sensitive_port`: boolean
- `features_used`: feature values used

### Model Files

Saved in `ml/models/`:
- Trained model pickle files
- `metadata.json` — training info (n_samples, n_features, trained_at)
