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
  Menu,
  Printer,
} from 'lucide-react';
import { SubNavProvider, useSubNav } from './SubNavContext';
import './Layout.css';

// ── Inner layout reads sub-nav from context ───────────────────
function LayoutInner() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { tabs }  = useSubNav();

  const navItems = [
    { path: '/home',      icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/billing',   icon: CreditCard,      label: 'Billing Portal' },
    { path: '/printing',  icon: Printer,         label: 'Printing Hub' },
    { path: '/financial', icon: PieChart,        label: 'Financial Portal' },
    { path: '/cv',        icon: FileText,        label: 'CV Generator' },
    { path: '/passwords', icon: ShieldCheck,     label: 'Password Manager' },
    { path: '/tools',     icon: Wrench,          label: 'Tools Portal' },
  ];

  const getPageTitle = () => {
    const match = navItems.find(item => location.pathname.startsWith(item.path));
    return match ? match.label : 'SpeedNet';
  };

  const hasSubNav = tabs.length > 0;

  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
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
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-item ${isActive || location.pathname.startsWith(item.path) ? 'active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon size={22} className="nav-icon" />
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className={`main-content ${isCollapsed ? 'sidebar-collapsed' : ''}`}>

        {/* ── Single top header ── */}
        <header className={`layout-header ${hasSubNav ? 'layout-header--with-subnav' : ''}`}>
          {/* Left: mobile toggle + page title */}
          <div className="header-left">
            <button
              className="btn-icon mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: 'none' }}
            >
              <Menu size={20} />
            </button>
            <h1 className="header-title">{getPageTitle()}</h1>

            {/* Sub-tabs inline in header */}
            {hasSubNav && (
              <nav className="header-subnav">
                {tabs.map(tab => (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    className={({ isActive }) => `header-tab ${isActive ? 'header-tab--active' : ''}`}
                  >
                    {tab.icon && <tab.icon size={15} />}
                    <span>{tab.label}</span>
                  </NavLink>
                ))}
              </nav>
            )}
          </div>

          {/* Right: user + logout */}
          <div className="header-right">
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span className="user-name hidden-mobile">Admin User</span>
            </div>
            <button className="btn-icon" onClick={() => navigate('/login')} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Exported wrapper provides SubNavContext ───────────────────
export default function Layout() {
  return (
    <SubNavProvider>
      <LayoutInner />
    </SubNavProvider>
  );
}
