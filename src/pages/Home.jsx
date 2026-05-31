import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, PieChart, LogOut, ArrowRight, Zap, FileText, ShieldCheck, Wrench } from 'lucide-react';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-layout">
      <header className="home-header glass-panel">
        <div className="logo">
          <Zap className="logo-icon" size={24} />
          <span>Speed@net</span>
        </div>
        <div className="user-profile">
          <div className="avatar">AD</div>
          <span className="user-name">Admin User</span>
          <button className="btn-icon" onClick={() => navigate('/login')} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="welcome-section animate-fade-in">
          <h1>Welcome to Speed@net CRM</h1>
          <p>Select a portal to manage your business operations.</p>
        </div>

        <div className="portals-grid">
          {/* Billing Portal Card */}
          <div className="portal-card glass-panel animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="portal-icon billing-icon">
              <CreditCard size={32} />
            </div>
            <h2>Billing Portal</h2>
            <p>Manage products, stock, and generate professional A5 invoices for your photostat business.</p>
            <button className="btn btn-primary portal-btn" onClick={() => navigate('/billing')}>
              Open Billing <ArrowRight size={18} />
            </button>
          </div>

          {/* Financial Portal Card */}
          <div className="portal-card glass-panel animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="portal-icon financial-icon">
              <PieChart size={32} />
            </div>
            <h2>Financial Portal</h2>
            <p>Track revenue, view financial reports, and analyze business performance metrics.</p>
            <button className="btn btn-secondary portal-btn" onClick={() => navigate('/financial')}>
              Open Financial <ArrowRight size={18} />
            </button>
          </div>

          {/* CV Generator Card */}
          <div className="portal-card glass-panel animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="portal-icon cv-icon">
              <FileText size={32} />
            </div>
            <h2>CV Generator</h2>
            <p>Create a professional CV from beautiful templates. Edit your details and export as PDF in seconds.</p>
            <button className="btn btn-cv portal-btn" onClick={() => navigate('/cv')}>
              Open CV Generator <ArrowRight size={18} />
            </button>
          </div>

          {/* Password Manager Card */}
          <div className="portal-card glass-panel animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="portal-icon pm-icon">
              <ShieldCheck size={32} />
            </div>
            <h2>Password Manager</h2>
            <p>Store and manage all your passwords securely with AES-256-GCM encryption. Protected by a master password.</p>
            <button className="btn btn-pm-card portal-btn" onClick={() => navigate('/passwords')}>
              Open Vault <ArrowRight size={18} />
            </button>
          </div>

          {/* Tools Portal Card */}
          <div className="portal-card glass-panel animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="portal-icon tools-icon">
              <Wrench size={32} />
            </div>
            <h2>Tools Portal</h2>
            <p>Convert files between formats, reduce image sizes, crop images, and change resolutions — all in-browser.</p>
            <button className="btn btn-tools portal-btn" onClick={() => navigate('/tools')}>
              Open Tools <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
