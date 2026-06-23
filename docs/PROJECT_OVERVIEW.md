# SOC Intelligente - Project Overview

## What Is This

Enterprise Security Operations Center (SOC) platform with:
- **Frontend**: React 19 + Vite 8 + TypeScript 6 (no Tailwind — pure CSS with CSS variables)
- **Backend**: Node.js + Express on port 5000
- **ML Pipeline**: Python (scikit-learn) — Random Forest, Logistic Regression, Isolation Forest, K-Means
- **Data stores**: InfluxDB (alerts/metrics), Neo4j (network topology)
- **AI chatbot**: Mistral 7B via Ollama (local LLM)

Language: French UI, English code.

## Repo Structure

```
ai-soc-platform/
├── frontend/              # React SPA (Vite)
│   ├── src/
│   │   ├── api/api.ts            # Axios client, all API calls, TS interfaces
│   │   ├── App.tsx               # Router + ProtectedRoute
│   │   ├── main.tsx              # Entry point
│   │   ├── index.css             # ALL styles (~3000 lines, no Tailwind)
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # JWT auth provider (localStorage)
│   │   ├── hooks/
│   │   │   ├── useSOC.ts         # useAlerts, useMetrics, useIncidents, useTopology
│   │   │   └── useScrollAnimation.ts
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── DashboardEmployee.tsx  # Alertes / Surveillance Active
│   │   │   ├── MLAnalysisPage.tsx     # Analyse ML / Intelligence Artificielle
│   │   │   ├── VulnerabilityScannerPage.tsx
│   │   │   ├── IncidentResponsePage.tsx
│   │   │   ├── CyberAcademyPage.tsx
│   │   │   └── DashboardAdmin.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # Shared sidebar (role-filtered nav)
│   │   │   ├── ChatbotWidget.tsx # Floating AI chatbot
│   │   │   ├── AlertCard.tsx
│   │   │   ├── NetworkTopology.tsx
│   │   │   ├── CyberAcademy.tsx
│   │   │   └── MetricsChart.tsx
│   │   └── data/
│   │       └── courses.ts        # Academy course data
│   └── package.json
├── backend/
│   ├── server.js           # Express API (all routes in one file)
│   └── scanner.js          # Vulnerability scanner module
├── ml/
│   ├── generate_dataset.py # Generate training data
│   ├── train_models.py     # Train all 4 ML models
│   ├── ml_predict.py       # Prediction functions (called by backend)
│   └── models/             # Saved model files + metadata.json
└── docs/                   # This folder
```

## Running

```bash
# Frontend (port 5173 default)
cd frontend && npm run dev

# Backend (port 5000)
cd backend && node server.js

# ML training (one-time)
cd ml && python train_models.py
```

Build: `cd frontend && npm run build` (uses `tsc -b && vite build`)
Lint: `cd frontend && npx oxlint`
