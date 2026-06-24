import React from 'react';
import { Search, Bell, Settings, HelpCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatbotWidget from '../components/ChatbotWidget';
import { useAuth } from '../contexts/AuthContext';
import { IncidentResponse } from './IncidentResponse';

const ROLE_LABELS: Record<string, string> = {
  employee: 'Analyste SOC',
  expert: 'Expert Sécurité',
  admin: 'Administrateur SOC',
};

const IncidentResponsePage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="dashboard-layout">
      <Sidebar role={user?.role ?? 'expert'} />

      <header className="surv-header">
        <div className="surv-search">
          <Search size={18} className="surv-search-icon" />
          <input
            type="text"
            placeholder="Rechercher un incident, une IP..."
            className="surv-search-input"
          />
        </div>
        <div className="surv-header-actions">
          <button className="surv-header-btn" title="Notifications"><Bell size={20} /></button>
          <button className="surv-header-btn" title="Paramètres"><Settings size={20} /></button>
          <button className="surv-header-btn" title="Aide"><HelpCircle size={20} /></button>
          <div className="surv-header-divider" />
          <div className="surv-user-block">
            <div className="surv-user-info">
              <span className="surv-user-name">{user?.username ?? 'Jean Dupont'}</span>
              <span className="surv-user-role">{ROLE_LABELS[user?.role ?? 'expert']}</span>
            </div>
            <div className="surv-user-avatar">
              {(user?.username?.[0] ?? 'J').toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="surv-main">
        <IncidentResponse />
      </main>

      <ChatbotWidget />
    </div>
  );
};

export default IncidentResponsePage;
