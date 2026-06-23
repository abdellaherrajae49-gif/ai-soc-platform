import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, Bell, Activity, Settings, LogOut, Globe, FileText, Radar, Crosshair, BookOpen } from 'lucide-react';
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
  { to: '/employee', icon: <Bell size={18} />,      label: 'Alertes',    roles: ['employee','expert','admin'], id: 'nav-alerts'   },
  { to: '/expert',   icon: <Activity size={18} />,  label: 'Analyse ML', roles: ['expert','admin'],            id: 'nav-expert'   },
  { to: '/scanner',  icon: <Radar size={18} />,     label: 'VulnScan',   roles: ['expert','admin'],            id: 'nav-scanner'  },
  { to: '/response', icon: <Crosshair size={18} />, label: 'Réponse',    roles: ['expert','admin'],            id: 'nav-response' },
  { to: '/academy',  icon: <BookOpen size={18} />,  label: 'Académie',   roles: ['employee','expert','admin'], id: 'nav-academy'  },
  { to: '/admin',    icon: <Settings size={18} />,  label: 'Admin',      roles: ['admin'],                     id: 'nav-admin'    },
];

const ROLE_COLORS: Record<Role, string> = {
  employee: '#3b82f6',
  expert:   '#7c3aed',
  admin:    '#f59e0b',
};

const ROLE_LABELS: Record<Role, string> = {
  employee: '👤 Employee',
  expert:   '🔬 Expert',
  admin:    '👑 Admin',
};

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield size={24} />
        </div>
        <div>
          <span className="sidebar-logo-title">SOC</span>
          <span className="sidebar-logo-sub">Intelligente</span>
        </div>
      </div>

      {/* User chip */}
      <div className="sidebar-user" style={{ borderColor: ROLE_COLORS[role] }}>
        <div className="sidebar-user-avatar" style={{ background: ROLE_COLORS[role] }}>
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="sidebar-username">{user?.username}</p>
          <p className="sidebar-role" style={{ color: ROLE_COLORS[role] }}>
            {ROLE_LABELS[role]}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {visibleItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            id={item.id}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <div className="status-dot online" />
          <span>SOC-Center: 192.168.10.10</span>
        </div>
        <div className="sidebar-status">
          <Globe size={11} />
          <span>Wazuh · Suricata · InfluxDB</span>
        </div>
        <button
          id="logout-btn"
          className="sidebar-logout"
          onClick={handleLogout}
          title="Déconnexion"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
