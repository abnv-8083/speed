import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { api, setToken } from '../api';
import './Login.css';

const Login = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      navigate('/home');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to connect to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { token } = await api.login('admin@speednet.com', 'SpeedNet@2025');
      setToken(token);
      navigate('/home');
    } catch {
      navigate('/home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Ambient blobs */}
      <div className="login-blob login-blob-1" />
      <div className="login-blob login-blob-2" />
      <div className="login-blob login-blob-3" />

      <div className="login-card animate-fade-in">

        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <Zap size={28} />
          </div>
          <div className="login-brand-text">
            <h1>SpeedNet</h1>
            <p>CRM &amp; Business Portal</p>
          </div>
        </div>

        <div className="login-divider" />

        <div className="login-welcome">
          <h2>Welcome back</h2>
          <p>Sign in to your account to continue</p>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="login-error" role="alert">
            <span>⚠</span> {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label htmlFor="email">Email address</label>
            <div className="login-input-wrap">
              <Mail size={16} className="login-input-icon" />
              <input
                type="email"
                id="email"
                placeholder="admin@speednet.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <div className="login-field-header">
              <label htmlFor="password">Password</label>
              <a href="#" className="login-forgot">Forgot password?</a>
            </div>
            <div className="login-input-wrap">
              <Lock size={16} className="login-input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPass(v => !v)}
                tabIndex={-1}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <><LogIn size={17} /> Sign In</>
            )}
          </button>
        </form>


        <p className="login-footer-note">
          Contact your administrator if you don&apos;t have access.
        </p>
      </div>
    </div>
  );
};

export default Login;
