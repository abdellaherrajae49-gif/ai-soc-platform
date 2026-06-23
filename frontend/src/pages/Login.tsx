import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, Wifi } from 'lucide-react';

const Login: React.FC = () => {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!username || !password) {
      setLocalError('Veuillez remplir tous les champs.');
      return;
    }
    try {
      await login(username, password);
      navigate('/');
    } catch (err: unknown) {
      setLocalError((err as Error).message);
    }
  };

  const displayError = localError || error;

  return (
    <div className="login-page">
      {/* Animated background grid */}
      <div className="login-bg">
        <div className="grid-overlay" />
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
      </div>

      <div className="login-container">
        {/* Header */}
        <div className="login-header">
          <div className="login-logo">
            <Shield size={40} strokeWidth={1.5} />
          </div>
          <h1 className="login-title">SOC Intelligente</h1>
          <p className="login-subtitle">Security Operations Center — PFA 2026</p>
          <div className="login-status">
            <Wifi size={12} />
            <span>Wazuh 4.14.5 · Suricata 8.0.3 · Mistral 7B</span>
          </div>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label htmlFor="username-input" className="form-label">
              <User size={14} />
              Identifiant
            </label>
            <input
              id="username-input"
              type="text"
              className="form-input"
              placeholder="admin / expert1 / employee1"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password-input" className="form-label">
              <Lock size={14} />
              Mot de passe
            </label>
            <div className="input-wrapper">
              <input
                id="password-input"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPass(p => !p)}
                aria-label="Afficher/masquer le mot de passe"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {displayError && (
            <div className="form-error" role="alert">
              <AlertCircle size={14} />
              {displayError}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Connexion…
              </>
            ) : (
              <>
                <Shield size={16} />
                Accéder au SOC
              </>
            )}
          </button>
        </form>

        {/* Roles info */}
        <div className="login-roles">
          <div className="role-chip role-employee">👤 Employee</div>
          <div className="role-chip role-expert">🔬 Expert</div>
          <div className="role-chip role-admin">👑 Admin</div>
        </div>

        <p className="login-footer">
          Plateforme SOC sécurisée · Accès JWT · Logs audités
        </p>
      </div>
    </div>
  );
};

export default Login;
