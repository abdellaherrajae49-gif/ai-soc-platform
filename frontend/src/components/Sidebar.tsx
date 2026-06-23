import React, { useLayoutEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Bell,
  Activity,
  Settings,
  LogOut,
  Radar,
  Crosshair,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../contexts/AuthContext';

interface SidebarProps {
  role: Role;
}

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles: Role[];
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/employee', icon: <Bell size={18} />, label: 'Alertes', roles: ['employee', 'expert', 'admin'], id: 'nav-alerts' },
  { to: '/expert', icon: <Activity size={18} />, label: 'Analyse ML', roles: ['expert', 'admin'], id: 'nav-expert' },
  { to: '/scanner', icon: <Radar size={18} />, label: 'VulnScan', roles: ['expert', 'admin'], id: 'nav-scanner' },
  { to: '/response', icon: <Crosshair size={18} />, label: 'Réponse', roles: ['expert', 'admin'], id: 'nav-response' },
  { to: '/academy', icon: <BookOpen size={18} />, label: 'Académie', roles: ['employee', 'expert', 'admin'], id: 'nav-academy' },
  { to: '/admin', icon: <Settings size={18} />, label: 'Admin', roles: ['admin'], id: 'nav-admin' },
];

const SIDEBAR_STORAGE_KEY = 'soc_sidebar_collapsed';
const SIDEBAR_EXPANDED_WIDTH = '280px';
const SIDEBAR_COLLAPSED_WIDTH = '80px';

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    const width = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

    root.style.setProperty('--sidebar-w', width);
    root.dataset.sidebar = isCollapsed ? 'collapsed' : 'expanded';
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className={`sidebar ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setIsCollapsed((prev) => !prev)}
        aria-label={isCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">SI</div>
        <div className="sidebar-logo-copy">
          <span className="sidebar-logo-title">SOC Intelligente</span>
          <span className="sidebar-logo-sub">Enterprise Security</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            id={item.id}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            data-tooltip={item.label}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span className="sidebar-text">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        <button
          id="logout-btn"
          className="sidebar-logout"
          onClick={handleLogout}
          title={isCollapsed ? 'Déconnexion' : undefined}
          aria-label="Déconnexion"
          data-tooltip="Déconnexion"
        >
          <span className="sidebar-icon">
            <LogOut size={16} />
          </span>
          <span className="sidebar-text">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
