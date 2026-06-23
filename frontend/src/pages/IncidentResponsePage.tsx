import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { IncidentResponse } from './IncidentResponse';

const IncidentResponsePage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="dashboard-layout">
      <Sidebar role={user?.role ?? 'expert'} />
      <main className="dashboard-main">
        <IncidentResponse />
      </main>
    </div>
  );
};

export default IncidentResponsePage;
