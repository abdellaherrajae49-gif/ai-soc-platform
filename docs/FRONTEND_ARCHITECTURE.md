# Frontend Architecture

## Tech Stack

- React 19.2 + TypeScript 6
- Vite 8.1 (build tool)
- React Router 7.18
- Axios 1.18 (HTTP)
- Recharts 3.8 (charts)
- Lucide React 1.21 (icons — thin-line, consistent stroke)
- Socket.io-client 4.8 (real-time)
- Pure CSS (no Tailwind, no CSS-in-JS)

## Styling System

All styles in `frontend/src/index.css` (~3000+ lines). No Tailwind.

### CSS Variables (`:root`)

```css
--bg-primary:     #f0f4f8
--bg-surface:     #ffffff
--text-primary:   #0f172a
--text-muted:     #64748b
--accent-purple:  #7c3aed
--accent-cyan:    #0ea5e9
--accent-blue:    #3b82f6
--accent-green:   #10b981
--accent-orange:  #f97316
--accent-red:     #ef4444
--accent-yellow:  #f59e0b
--sidebar-w:      280px
--header-h:       64px
--radius-md:      10px
--radius-lg:      16px
```

### Class Naming Convention

Pages use prefixed CSS classes to avoid collisions:
- `.surv-*` — Surveillance / Alertes page (DashboardEmployee) + **shared** header/layout classes
- `.ml-*` — ML Analysis page
- `.sidebar-*` — Sidebar component
- Generic: `.dashboard-layout`, `.dashboard-main`, `.page-header`, `.page-title`, `.section-card`, etc.

### Design System (Enterprise Light Theme)

After redesign, pages follow consistent light enterprise style:
- Background: `#f8fafc`
- Cards: `#ffffff` with `1px solid #e2e8f0` border, `12px` border-radius
- Sidebar: Dark `#1b1b2f`
- Primary accent: Indigo `#6366f1`
- Text: `#1b1b23` primary, `#64748b` muted
- Fonts: Inter (UI), JetBrains Mono (data/IPs/scores)
- No shadows on cards — thin borders only
- Status chips: 10% opacity tinted backgrounds

### Shared CSS Classes (reusable across pages)

**Header** (used by DashboardEmployee + MLAnalysisPage):
- `.surv-header` — Fixed top header bar
- `.surv-search`, `.surv-search-input` — Search input
- `.surv-header-btn` — Icon buttons
- `.surv-user-block`, `.surv-user-avatar` — User section

**Content**:
- `.surv-main` — Main content area (margin-left for sidebar)
- `.surv-title` / `.surv-subtitle` — Page heading
- `.surv-section-label` — Uppercase small section titles
- `.surv-table` / `.surv-table-row` — Table styling
- `.surv-cell-mono` — Monospace cells
- `.surv-chip` / `.surv-chip-*` — Status badges
- `.surv-diag-btn` — Outlined action button

## Component Architecture

```
App.tsx
├── AuthProvider (context)
├── BrowserRouter
│   ├── Login
│   ├── DashboardEmployee
│   │   ├── Sidebar (role="employee|expert|admin")
│   │   └── main content
│   ├── MLAnalysisPage
│   │   ├── Sidebar (role="expert")
│   │   ├── ChatbotWidget
│   │   └── main content
│   ├── VulnerabilityScannerPage
│   ├── IncidentResponsePage
│   ├── CyberAcademyPage
│   └── DashboardAdmin
```

Each page renders its own `<Sidebar>` and layout. No shared layout wrapper — each page owns its full layout.

## Custom Hooks

- `useAlerts(limit, hours)` — Polls `/alerts` every 30s
- `useMetrics(historyMinutes)` — Polls `/metrics` every 15s
- `useIncidents(days, limit)` — Polls `/incidents` every 60s
- `useTopology()` — Polls `/topology` every 2min

## Data Flow (ML Page)

1. On mount, calls `mlMetadata()` for model info
2. `runAnalysis()` fetches alerts via `getAlerts(20, 24)`
3. Maps alerts to `MLAlert` payloads
4. Calls `mlBatchPredict(payloads)` for predictions
5. Enriches alerts with ML predictions
6. If API fails, falls back to sample/demo data
7. Stats computed client-side from predictions

## Unused/Legacy Files (still in repo)

- `DashboardExpert.tsx` — Old expert dashboard, not routed
- `VulnerabilityScanner.tsx` — Old scanner, replaced by `VulnerabilityScannerPage.tsx`
- `IncidentResponse.tsx` — Old version, replaced by `IncidentResponsePage.tsx`
- `AIThreatAnalysis.tsx` — Not routed
- `DynamicAnalysisDashboard.tsx` — Not routed
