import React, { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Menu,
  X,
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
const MOBILE_BREAKPOINT = 768;

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  });

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [mobileOpen]);

  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, mobileOpen]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isMobile) {
      root.style.setProperty('--sidebar-w', '0px');
      root.dataset.sidebar = 'mobile';
    } else {
      const width = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;
      root.style.setProperty('--sidebar-w', width);
      root.dataset.sidebar = isCollapsed ? 'collapsed' : 'expanded';
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed));
    }
  }, [isCollapsed, isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const sidebarClasses = [
    'sidebar',
    isMobile ? 'sidebar-mobile' : (isCollapsed ? 'is-collapsed' : 'is-expanded'),
    isMobile && mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {isMobile && (
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>
      )}

      {isMobile && mobileOpen && (
        <div className="sidebar-backdrop" onClick={closeMobile} />
      )}

      <aside className={sidebarClasses}>
        {isMobile ? (
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={closeMobile}
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? 'Étendre la sidebar' : 'Réduire la sidebar'}
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}

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
              title={isCollapsed && !isMobile ? item.label : undefined}
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
            title={isCollapsed && !isMobile ? 'Déconnexion' : undefined}
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
    </>
  );
};

export default Sidebar;
