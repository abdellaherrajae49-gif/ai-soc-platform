import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { CyberAcademy } from '../components/CyberAcademy';
import { BookOpen } from 'lucide-react';

const CyberAcademyPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="dashboard-layout">
      <Sidebar role={user?.role ?? 'employee'} />
      <main className="dashboard-main">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <BookOpen size={22} style={{ color: 'var(--accent-purple)' }} />
              Académie Cybernétique
            </h1>
            <p className="page-subtitle">Apprenez à identifier et contrer les menaces grâce à notre IA.</p>
          </div>
        </div>
        <CyberAcademy />
      </main>
    </div>
  );
};

export default CyberAcademyPage;
