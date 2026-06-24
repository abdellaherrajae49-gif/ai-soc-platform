import React from 'react';
import { BookOpen, Brain, ShieldCheck } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { CyberAcademy } from '../components/CyberAcademy';
import { useAuth } from '../contexts/AuthContext';

const CyberAcademyPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-layout">
      <Sidebar role={user?.role ?? 'employee'} />
      <main className="dashboard-main academy-page">
        <div className="academy-page-header">
          <div className="academy-page-copy">
            <span className="academy-page-kicker">Formation SOC</span>
            <h1 className="academy-page-title">
              <BookOpen size={22} />
              Academie cyber
            </h1>
            <p className="academy-page-subtitle">
              Un espace plus clair pour comprendre les menaces, transmettre les bons reflexes et valider les acquis
              avec l'assistant IA.
            </p>
          </div>

          <div className="academy-page-meta">
            <div className="academy-page-meta-item">
              <ShieldCheck size={16} />
              <span>Modules structures</span>
            </div>
            <div className="academy-page-meta-item">
              <Brain size={16} />
              <span>Quiz guides par IA</span>
            </div>
          </div>
        </div>

        <CyberAcademy />
      </main>
    </div>
  );
};

export default CyberAcademyPage;
