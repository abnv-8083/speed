import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, PieChart, ArrowRight, FileText, Users, Wrench, Printer } from 'lucide-react';
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

        {/* Printing Hub Card */}
        <div 
          className="portal-card animate-fade-in" 
          style={{ animationDelay: '0.15s' }}
          onClick={() => navigate('/printing')}
        >
          <div className="portal-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Printer size={32} />
          </div>
          <h2>Printing & Stock Hub</h2>
          <p>Track A4, A3, and A5 print stocks, log color/B&W jobs, and connect OS Print Spooler.</p>
          <div className="portal-action">
            Open Printing Hub <ArrowRight size={18} />
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

        {/* Customer Management Card */}
        <div 
          className="portal-card card-pass animate-fade-in" 
          style={{ animationDelay: '0.4s' }}
          onClick={() => navigate('/customers')}
        >
          <div className="portal-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
            <Users size={32} />
          </div>
          <h2>Customer Management</h2>
          <p>Register customers, access billed invoices, upload PDF & photo documents, and manage credentials.</p>
          <div className="portal-action">
            Open Customers <ArrowRight size={18} />
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
