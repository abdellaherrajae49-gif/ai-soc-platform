# Page Inventory & Redesign Status

## Active Pages (routed)

| Page                      | Route       | File                           | Status      |
|---------------------------|-------------|--------------------------------|-------------|
| Login                     | `/login`    | `pages/Login.tsx`              | Original    |
| Alertes / Surveillance    | `/employee` | `pages/DashboardEmployee.tsx`  | Redesigned  |
| Analyse ML                | `/expert`   | `pages/MLAnalysisPage.tsx`     | Redesigned  |
| VulnScan                  | `/scanner`  | `pages/VulnerabilityScannerPage.tsx` | Original |
| Incident Response         | `/response` | `pages/IncidentResponsePage.tsx` | Original  |
| Cyber Academy             | `/academy`  | `pages/CyberAcademyPage.tsx`  | Original    |
| Admin Dashboard           | `/admin`    | `pages/DashboardAdmin.tsx`     | Original    |

## Redesigned Pages Pattern

Both redesigned pages (Alertes + Analyse ML) share:
- `surv-header` with search, icon buttons, user avatar
- `surv-main` content area
- `surv-title` / `surv-subtitle` page heading
- Light enterprise theme (white cards, thin borders, indigo accents)
- Sidebar via shared `<Sidebar>` component

### Alertes Page Structure
- 4 KPI cards (Critique/Élevé/Moyen/Total) — `.surv-kpi-*`
- 2-column grid: alerts table + health card
- Uses `useAlerts` and `useMetrics` hooks

### ML Page Structure
- 4 model cards (RF/LR/IF/KM) — `.ml-model-*`
- Status chip pills — `.ml-chip-*`
- 2-column grid: classification table (2/3) + feature importance + clusters (1/3)
- Fetches via `mlBatchPredict` and `getAlerts`, falls back to sample data

## Legacy/Unused Files (not routed, can delete)

| File                          | Notes                    |
|-------------------------------|--------------------------|
| `pages/DashboardExpert.tsx`   | Old expert dashboard     |
| `pages/VulnerabilityScanner.tsx` | Old scanner           |
| `pages/IncidentResponse.tsx`  | Old response page        |
| `pages/AIThreatAnalysis.tsx`  | Never routed             |
| `pages/DynamicAnalysisDashboard.tsx` | Never routed      |

## Pages Still Needing Redesign

To match enterprise light theme:
1. VulnerabilityScannerPage
2. IncidentResponsePage
3. CyberAcademyPage
4. DashboardAdmin
5. Login

Each should adopt `surv-header`, `surv-main`, `surv-title` pattern.
