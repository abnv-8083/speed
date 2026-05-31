import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Zap, 
  LayoutDashboard, 
  CreditCard, 
  PieChart, 
  FileText, 
  ShieldCheck, 
  Wrench, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';
import './Layout.css';

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    navigate('/login');
  };

  const navItems = [
    { path: '/home', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/billing', icon: CreditCard, label: 'Billing Portal' },
    { path: '/financial', icon: PieChart, label: 'Financial Portal' },
    { path: '/cv', icon: FileText, label: 'CV Generator' },
    { path: '/passwords', icon: ShieldCheck, label: 'Password Manager' },
    { path: '/tools', icon: Wrench, label: 'Tools Portal' },
  ];

  const getPageTitle = () => {
    const currentItem = navItems.find(item => location.pathname.startsWith(item.path));
    return currentItem ? currentItem.label : 'SpeedNet';
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`layout-sidebar ${isCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Zap className="logo-icon" size={26} />
            {!isCollapsed && <span>SpeedNet</span>}
          </div>
          <button 
            className="sidebar-toggle hidden-mobile" 
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive || location.pathname.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon size={22} className="nav-icon" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className={`main-content ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top Header */}
        <header className="layout-header">
          <div className="header-left">
            <button 
              className="btn-icon mobile-toggle" 
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: 'none' }}
            >
              <Menu size={20} />
            </button>
            <h1 className="header-title">{getPageTitle()}</h1>
          </div>

          <div className="header-right">
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span className="user-name hidden-mobile">Admin User</span>
            </div>
            <button className="btn-icon" onClick={handleLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
