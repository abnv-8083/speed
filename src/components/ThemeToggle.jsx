import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ inline = false }) => {
  const [theme, setTheme] = useState('dark'); // Default to dark as requested

  useEffect(() => {
    const savedTheme = localStorage.getItem('speednet-theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      setTheme('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('speednet-theme', newTheme);
  };

  if (inline) {
    return (
      <button 
        onClick={toggleTheme}
        className="btn-icon"
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      >
        {theme === 'dark' ? <Sun size={20} style={{ color: '#f59e0b' }} /> : <Moon size={20} className="text-primary" />}
      </button>
    );
  }

  // Floating version for login page
  return (
    <button 
      onClick={toggleTheme}
      className="glass-panel"
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        cursor: 'pointer',
        boxShadow: 'var(--shadow-lg)',
        border: 'none'
      }}
    >
      {theme === 'dark' ? <Sun size={24} style={{ color: '#f59e0b' }} /> : <Moon size={24} style={{ color: 'var(--primary)' }} />}
    </button>
  );
};

export default ThemeToggle;
