import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ShoppingCart, Package, Receipt, BarChart3 } from 'lucide-react';
import './BillingLayout.css';

const BillingLayout = () => {
  return (
    <div className="billing-module-layout">
      {/* Top Horizontal Navigation */}
      <nav className="billing-top-nav glass-panel">
        <NavLink to="/billing/pos" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={18} />
          <span>New Sale (POS)</span>
        </NavLink>
        
        <NavLink to="/billing/products" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <Package size={18} />
          <span>Inventory</span>
        </NavLink>
        
        <NavLink to="/billing/invoices" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <Receipt size={18} />
          <span>Invoices</span>
        </NavLink>

        <NavLink to="/billing/reports" className={({isActive}) => `nav-tab ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} />
          <span>Sales Report</span>
        </NavLink>
      </nav>

      {/* Main Content Area */}
      <main className="billing-content">
        <Outlet />
      </main>
    </div>
  );
};

export default BillingLayout;
