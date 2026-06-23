# Routing & Authentication

## Roles

Three roles: `employee`, `expert`, `admin` (defined in `AuthContext.tsx` as `Role` type).

## Hardcoded Users (backend/server.js)

| Username   | Password  | Role     |
|------------|-----------|----------|
| employee1  | emp123    | employee |
| employee2  | emp456    | employee |
| expert1    | exp123    | expert   |
| expert2    | exp456    | expert   |
| admin      | abd3llah  | admin    |

## Auth Flow

1. `POST /auth/login` → returns `{ token, role, username }`
2. JWT stored in `localStorage` as `soc_jwt`
3. User object stored as `soc_user`
4. Axios interceptor injects `Authorization: Bearer <token>` on every request
5. 401 response → auto-logout + redirect to `/login`
6. JWT expires after 8 hours

## Routes (App.tsx)

| Path          | Component                  | Roles                     |
|---------------|----------------------------|---------------------------|
| `/login`      | Login                      | public                    |
| `/employee`   | DashboardEmployee          | employee, expert, admin   |
| `/expert`     | MLAnalysisPage             | expert, admin             |
| `/ml`         | MLAnalysisPage             | expert, admin             |
| `/admin`      | DashboardAdmin             | admin                     |
| `/academy`    | CyberAcademyPage           | employee, expert, admin   |
| `/scanner`    | VulnerabilityScannerPage   | expert, admin             |
| `/response`   | IncidentResponsePage       | expert, admin             |
| `/`           | RoleRedirect → `/employee` | authenticated             |

## Sidebar Navigation (Sidebar.tsx)

Items filtered by role. Defined in `NAV_ITEMS` array:

| Route       | Label      | Visible To              |
|-------------|------------|-------------------------|
| /employee   | Alertes    | all                     |
| /expert     | Analyse ML | expert, admin           |
| /scanner    | VulnScan   | expert, admin           |
| /response   | Réponse    | expert, admin           |
| /academy    | Académie   | all                     |
| /admin      | Admin      | admin                   |

Uses React Router `NavLink` with `.sidebar-link.active` class.
