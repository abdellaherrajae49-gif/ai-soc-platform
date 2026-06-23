import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Bell, Activity, Settings, LogOut, Radar, Crosshair, BookOpen } from 'lucide-react';
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

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(role));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">SI</div>
        <div>
          <span className="sidebar-logo-title">SOC Intelligente</span>
          <span className="sidebar-logo-sub">Enterprise Security</span>
        </div>
      </div>

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

      <div style={{ flex: 1 }} />

      <div className="sidebar-footer">
        <button
          id="logout-btn"
          className="sidebar-logout"
          onClick={handleLogout}
          title="Déconnexion"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
