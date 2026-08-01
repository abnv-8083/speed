import React, { useState, useEffect } from 'react';
import Vault from './Vault';
import PremiumLoader from '../../components/PremiumLoader';
import { isVaultSetup, setupVault, verifyPassword, loadVault, clearVault } from './crypto';
import './PasswordManager.css';

const AUTO_PWD = 'SpeedNetAutoLock123!';

export default function PasswordManager() {
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const setup = await isVaultSetup();
        if (!setup) {
          await setupVault(AUTO_PWD);
          setEntries([]);
          setUnlocked(true);
        } else {
          const ok = await verifyPassword(AUTO_PWD);
          if (!ok) {
            await clearVault();
            await setupVault(AUTO_PWD);
            setEntries([]);
          } else {
            setEntries(await loadVault(AUTO_PWD));
          }
          setUnlocked(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="pm-loading">
        <PremiumLoader text="Unlocking Vault…" />
      </div>
    );
  }

  return (
    <div className="pm-root animate-fade-in">
      <Vault masterPwd={AUTO_PWD} initialEntries={entries} onLock={() => {}} />
    </div>
  );
}
