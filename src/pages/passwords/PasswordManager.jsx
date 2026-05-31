import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import MasterLock from './MasterLock';
import Vault from './Vault';
import './PasswordManager.css';

export default function PasswordManager() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked]     = useState(false);
  const [masterPwd, setMasterPwd]   = useState('');
  const [entries, setEntries]       = useState([]);

  const handleUnlock = (pwd, loadedEntries) => {
    setMasterPwd(pwd);
    setEntries(loadedEntries);
    setUnlocked(true);
  };

  const handleLock = () => {
    setUnlocked(false);
    setMasterPwd('');
    setEntries([]);
  };

  return (
    <div className="pm-layout">
      {/* Header */}
      <header className="pm-header glass-panel">
        <button className="btn-icon" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </button>
        <div className="pm-header-brand">
          <div className="pm-header-icon">
            <Shield size={20} />
          </div>
          <div>
            <span className="pm-header-title">Password Manager</span>
            <span className="pm-header-sub">
              {unlocked ? '🔓 Vault unlocked' : '🔒 Vault locked'}
            </span>
          </div>
        </div>
        <div className="pm-header-spacer" />
      </header>

      {/* Main */}
      <main className="pm-main">
        {!unlocked
          ? <MasterLock onUnlock={handleUnlock} />
          : <Vault masterPwd={masterPwd} initialEntries={entries} onLock={handleLock} />
        }
      </main>
    </div>
  );
}
