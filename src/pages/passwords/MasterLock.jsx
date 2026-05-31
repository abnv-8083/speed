import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, Lock, KeyRound, AlertTriangle, Loader } from 'lucide-react';
import { isVaultSetup, setupVault, verifyPassword, loadVault, passwordStrength } from './crypto';

export default function MasterLock({ onUnlock }) {
  const [isSetup, setIsSetup]             = useState(null); // null = checking
  const [password, setPassword]           = useState('');
  const [confirm, setConfirm]             = useState('');
  const [showPwd, setShowPwd]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  // Check Supabase for existing vault on mount
  useEffect(() => {
    isVaultSetup().then(v => setIsSetup(v));
  }, []);

  const strength = passwordStrength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!isSetup) {
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        await setupVault(password);
        onUnlock(password, []);
      } else {
        const ok = await verifyPassword(password);
        if (!ok) { setError('Incorrect master password.'); return; }
        const entries = await loadVault(password);
        onUnlock(password, entries);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Loading state while checking Supabase
  if (isSetup === null) {
    return (
      <div className="pm-lock-screen">
        <div className="pm-lock-card glass-panel animate-fade-in" style={{ alignItems: 'center', gap: '1rem' }}>
          <Loader size={32} strokeWidth={1.5} className="spin" style={{ color: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Connecting to vault…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pm-lock-screen">
      <div className="pm-lock-card glass-panel animate-fade-in">
        {/* Icon */}
        <div className="pm-lock-icon">
          <Shield size={40} strokeWidth={1.5} />
        </div>

        <h1 className="pm-lock-title">Password Vault</h1>
        <p className="pm-lock-sub">
          {isSetup
            ? 'Enter your master password to unlock the vault.'
            : 'Create a master password to secure your vault. This cannot be recovered if lost.'}
        </p>

        <form className="pm-lock-form" onSubmit={handleSubmit}>
          {/* Master password */}
          <div className="form-group pm-lock-field">
            <label className="form-label">Master Password</label>
            <div className="pm-input-wrap">
              <Lock size={16} className="pm-input-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                className="input-field pm-input"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter master password"
                autoFocus
                required
              />
              <button type="button" className="pm-eye-btn" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {/* Strength bar when setting up */}
            {!isSetup && password && (
              <div className="pm-strength-row">
                <div className="pm-strength-bar">
                  {[1,2,3,4].map(n => (
                    <div key={n} className="pm-strength-seg" style={{
                      background: n <= strength.score ? strength.color : 'var(--border)',
                    }} />
                  ))}
                </div>
                <span className="pm-strength-label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm (setup only) */}
          {!isSetup && (
            <div className="form-group pm-lock-field">
              <label className="form-label">Confirm Password</label>
              <div className="pm-input-wrap">
                <KeyRound size={16} className="pm-input-icon" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className="input-field pm-input"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Confirm master password"
                  required
                />
                <button type="button" className="pm-eye-btn" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="pm-error-msg">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <button type="submit" className="btn btn-pm pm-lock-submit" disabled={loading}>
            {loading ? 'Please wait…' : isSetup ? '🔓 Unlock Vault' : '🔐 Create Vault'}
          </button>
        </form>

        {isSetup && (
          <p className="pm-lock-hint">
            <Lock size={12} /> End-to-end encrypted with AES-256-GCM · Stored securely in cloud
          </p>
        )}
        {!isSetup && (
          <div className="pm-lock-warning">
            <AlertTriangle size={13} />
            Your master password is never stored or sent to any server. If you forget it, your data cannot be recovered.
          </div>
        )}
      </div>
    </div>
  );
}
