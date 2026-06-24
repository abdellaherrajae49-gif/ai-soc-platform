import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Eye, EyeOff, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      setLocalError('Please fill in both fields.');
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
    <main className="login-page">
      <div className="login-shell">
        <section className="login-panel login-panel-info" aria-label="Platform overview">
          <div className="login-eyebrow">SOC intelligente</div>
          <h1 className="login-hero-title">Professional security operations, without clutter.</h1>
          <p className="login-hero-copy">
            Access the platform used to review alerts, investigate incidents, and manage
            role-based workflows across the SOC environment.
          </p>

          <div className="login-summary-list" aria-label="Platform highlights">
            <div className="login-summary-item">
              <CheckCircle2 size={16} />
              <span>Role-based access for employees, experts, and administrators</span>
            </div>
            <div className="login-summary-item">
              <CheckCircle2 size={16} />
              <span>JWT-backed sessions with audited platform activity</span>
            </div>
            <div className="login-summary-item">
              <CheckCircle2 size={16} />
              <span>Centralized workflows for monitoring, triage, and response</span>
            </div>
          </div>
        </section>

        <section className="login-panel login-container" aria-label="Authentication">
          <div className="login-header">
            <div className="login-logo">
              <Shield size={28} strokeWidth={1.8} />
            </div>
            <p className="login-kicker">Secure sign in</p>
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Sign in with your assigned operator account.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} id="login-form">
            <div className="form-group">
              <label htmlFor="username-input" className="form-label">
                <User size={14} />
                Username
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
                Password
              </label>
              <div className="input-wrapper">
                <input
                  id="password-input"
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPass(p => !p)}
                  aria-label="Show or hide password"
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
                  Signing in...
                </>
              ) : (
                <>
                  <Shield size={16} />
                  Sign in
                </>
              )}
            </button>
          </form>

          <div className="login-meta">
            <span>JWT sessions</span>
            <span>Role-based routing</span>
            <span>Audited access</span>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
