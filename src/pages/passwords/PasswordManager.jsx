import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import Vault from './Vault';
import PremiumLoader from '../../components/PremiumLoader';
import { isVaultSetup, setupVault, verifyPassword, loadVault, clearVault } from './crypto';
import './PasswordManager.css';

const AUTO_PWD = "SpeedNetAutoLock123!";

export default function PasswordManager() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked]     = useState(false);
  const [entries, setEntries]       = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const setup = await isVaultSetup();
        if (!setup) {
          await setupVault(AUTO_PWD);
          setEntries([]);
          setUnlocked(true);
        } else {
          // Verify if it works with auto password
          const ok = await verifyPassword(AUTO_PWD);
          if (!ok) {
            // It was set up with a DIFFERENT password before!
            // We must clear it to allow auto-login
            await clearVault();
            await setupVault(AUTO_PWD);
            setEntries([]);
            setUnlocked(true);
          } else {
            const data = await loadVault(AUTO_PWD);
            setEntries(data);
            setUnlocked(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

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
              🔓 Vault unlocked
            </span>
          </div>
        </div>
        <div className="pm-header-spacer" />
      </header>

      {/* Main */}
      <main className="pm-main">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', width: '100%' }}>
            <PremiumLoader text="Unlocking Vault..." />
          </div>
        ) : (
          <Vault masterPwd={AUTO_PWD} initialEntries={entries} onLock={() => {}} />
        )}
      </main>
    </div>
  );
}
