import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, PieChart, ArrowRight, FileText, ShieldCheck, Wrench } from 'lucide-react';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <div className="welcome-banner animate-fade-in">
        <h1>Welcome back, Admin!</h1>
        <p>Your central command center for business operations. Select a portal below to get started.</p>
      </div>

      <div className="portals-grid">
        {/* Billing Portal Card */}
        <div 
          className="portal-card card-billing animate-fade-in" 
          style={{ animationDelay: '0.1s' }}
          onClick={() => navigate('/billing')}
        >
          <div className="portal-icon-wrapper">
            <CreditCard size={32} />
          </div>
          <h2>Billing Portal</h2>
          <p>Manage products, stock, and generate professional A5 invoices for your photostat business.</p>
          <div className="portal-action">
            Open Billing <ArrowRight size={18} />
          </div>
        </div>

        {/* Financial Portal Card */}
        <div 
          className="portal-card animate-fade-in" 
          style={{ animationDelay: '0.2s' }}
          onClick={() => navigate('/financial')}
        >
          <div className="portal-icon-wrapper">
            <PieChart size={32} />
          </div>
          <h2>Financial Portal</h2>
          <p>Track revenue, view financial reports, and analyze business performance metrics in real-time.</p>
          <div className="portal-action">
            Open Financial <ArrowRight size={18} />
          </div>
        </div>

        {/* CV Generator Card */}
        <div 
          className="portal-card card-cv animate-fade-in" 
          style={{ animationDelay: '0.3s' }}
          onClick={() => navigate('/cv')}
        >
          <div className="portal-icon-wrapper">
            <FileText size={32} />
          </div>
          <h2>CV Generator</h2>
          <p>Create a professional CV from beautiful templates. Edit your details and export as PDF in seconds.</p>
          <div className="portal-action">
            Open CV Generator <ArrowRight size={18} />
          </div>
        </div>

        {/* Password Manager Card */}
        <div 
          className="portal-card card-pass animate-fade-in" 
          style={{ animationDelay: '0.4s' }}
          onClick={() => navigate('/passwords')}
        >
          <div className="portal-icon-wrapper">
            <ShieldCheck size={32} />
          </div>
          <h2>Password Manager</h2>
          <p>Store and manage all your passwords securely with AES-256-GCM encryption. Protected by a master password.</p>
          <div className="portal-action">
            Open Vault <ArrowRight size={18} />
          </div>
        </div>

        {/* Tools Portal Card */}
        <div 
          className="portal-card animate-fade-in" 
          style={{ animationDelay: '0.5s' }}
          onClick={() => navigate('/tools')}
        >
          <div className="portal-icon-wrapper">
            <Wrench size={32} />
          </div>
          <h2>Tools Portal</h2>
          <p>Convert files between formats, reduce image sizes, crop images, and change resolutions — all in-browser.</p>
          <div className="portal-action">
            Open Tools <ArrowRight size={18} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
