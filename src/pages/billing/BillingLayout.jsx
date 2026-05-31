import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Receipt, ArrowLeft, LayoutGrid, BarChart3 } from 'lucide-react';
import './BillingLayout.css';

const BillingLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="billing-module-layout">
      {/* Sidebar Navigation */}
      <aside className="billing-sidebar glass-panel">
        <div className="sidebar-header">
          <div className="brand-icon">
            <LayoutGrid size={24} />
          </div>
          <h2>Billing Hub</h2>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/billing/pos" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <ShoppingCart size={20} />
            <span>New Sale (POS)</span>
          </NavLink>
          
          <NavLink to="/billing/products" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span>Inventory</span>
          </NavLink>
          
          <NavLink to="/billing/invoices" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Receipt size={20} />
            <span>Invoices</span>
          </NavLink>

          <NavLink to="/billing/reports" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={20} />
            <span>Sales Report</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="btn-back" onClick={() => navigate('/home')}>
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="billing-content">
        <Outlet />
      </main>
    </div>
  );
};

export default BillingLayout;
