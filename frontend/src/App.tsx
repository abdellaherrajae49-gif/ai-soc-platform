import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import type { Role } from './contexts/AuthContext';
import Login from './pages/Login';
import DashboardEmployee from './pages/DashboardEmployee';
import DashboardExpert from './pages/DashboardExpert';
import MLAnalysisPage from './pages/MLAnalysisPage';
import DashboardAdmin from './pages/DashboardAdmin';
import CyberAcademyPage from './pages/CyberAcademyPage';
import VulnerabilityScannerPage from './pages/VulnerabilityScannerPage';
import IncidentResponsePage from './pages/IncidentResponsePage';

// ── Protected Route ────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles: Role[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
};

// ── Redirect based on role ─────────────────────────────────────────────────
const RoleRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // All roles start at /employee — sidebar shows role-appropriate nav items
  return <Navigate to="/employee" replace />;
};

// ── Routes ─────────────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/login"    element={<Login />} />
    <Route path="/employee" element={
      <ProtectedRoute roles={['employee', 'expert', 'admin']}>
        <DashboardEmployee />
      </ProtectedRoute>
    } />
    <Route path="/expert" element={
      <ProtectedRoute roles={['expert', 'admin']}>
        <MLAnalysisPage />
      </ProtectedRoute>
    } />
    <Route path="/ml" element={
      <ProtectedRoute roles={['expert', 'admin']}>
        <MLAnalysisPage />
      </ProtectedRoute>
    } />
    <Route path="/admin" element={
      <ProtectedRoute roles={['admin']}>
        <DashboardAdmin />
      </ProtectedRoute>
    } />
    <Route path="/academy" element={
      <ProtectedRoute roles={['employee', 'expert', 'admin']}>
        <CyberAcademyPage />
      </ProtectedRoute>
    } />
    <Route path="/scanner" element={
      <ProtectedRoute roles={['expert', 'admin']}>
        <VulnerabilityScannerPage />
      </ProtectedRoute>
    } />
    <Route path="/response" element={
      <ProtectedRoute roles={['expert', 'admin']}>
        <IncidentResponsePage />
      </ProtectedRoute>
    } />
    <Route path="/unauthorized" element={
      <div className="error-page">
        <h1>🚫 Accès non autorisé</h1>
        <p>Vous n'avez pas les droits pour accéder à cette page.</p>
      </div>
    } />
    <Route path="/"  element={<RoleRedirect />} />
    <Route path="*"  element={<Navigate to="/" replace />} />
  </Routes>
);

// ── App ────────────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
