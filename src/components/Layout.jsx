import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Zap,
  LayoutDashboard,
  CreditCard,
  PieChart,
  FileText,
  Users,
  Wrench,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Printer,
  Sun,
  Moon,
  Bell,
  Briefcase,
  Globe,
} from 'lucide-react';
import { SubNavProvider, useSubNav } from './SubNavContext';
import { useTheme } from './ThemeContext';
import { useWs } from '../contexts/WebSocketContext';
import { api } from '../api';
import WorkDuePopup from './WorkDuePopup';
import './Layout.css';

// ── Inner layout reads sub-nav from context ───────────────────
function LayoutInner() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { tabs }  = useSubNav();
  const { theme, toggleTheme } = useTheme();

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const { on } = useWs();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time notification updates via WebSocket
  useEffect(() => {
    const unsub = on('notifications', (event, data) => {
      switch (event) {
        case 'created':
          setNotifications(prev => [data, ...prev]);
          setUnreadCount(prev => prev + 1);
          break;
        case 'read':
          setNotifications(prev => prev.map(n =>
            (n.id || n._id) === (data.id || data._id) ? { ...n, read: true } : n
          ));
          setUnreadCount(prev => Math.max(0, prev - 1));
          break;
        case 'all_read':
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
          setUnreadCount(0);
          break;
        case 'deleted':
          setNotifications(prev => prev.filter(n => (n.id || n._id) !== data.id));
          break;
        case 'cleared':
          setNotifications([]);
          setUnreadCount(0);
          break;
        default:
          // Refresh on any other event
          fetchNotifications();
      }
    });
    return unsub;
  }, [on, fetchNotifications]);

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      // silent
    }
  };

  const navItems = [
    { path: '/admin/home',      icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/billing',   icon: CreditCard,      label: 'Billing Portal' },
    { path: '/admin/printing',  icon: Printer,         label: 'Printing Hub' },
    { path: '/admin/financial', icon: PieChart,        label: 'Financial Portal' },
    { path: '/admin/cv',        icon: FileText,        label: 'CV Generator' },
    { path: '/admin/tools',     icon: Wrench,          label: 'Tools Portal' },
    { path: '/admin/website',   icon: Globe,           label: 'Website Settings' },
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

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <div className={`main-content ${isCollapsed ? 'sidebar-collapsed' : ''}`}>

        {/* ── Single top header ── */}
        <header className={`layout-header ${hasSubNav ? 'layout-header--with-subnav' : ''}`}>
          {/* Left: mobile toggle + page title */}
          <div className="header-left">
            <button
              className="btn-icon mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
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

          {/* Right: notifications + theme toggle + user + logout */}
          <div className="header-right">
            {/* Notification Bell */}
            <div className="notif-container">
              <button
                className="btn-icon notif-bell"
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {showNotifPanel && (
                <div className="notif-panel">
                  <div className="notif-panel-header">
                    <h4>Notifications</h4>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="notif-mark-read">Mark all read</button>
                    )}
                  </div>
                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">No notifications yet</div>
                    ) : (
                      notifications.slice(0, 20).map((n) => (
                        <div key={n.id || n._id} className={`notif-item ${n.read ? '' : 'unread'}`}>
                          <div className="notif-icon">
                            {n.type === 'created' && <Briefcase size={14} />}
                            {n.type === 'status_changed' && <Briefcase size={14} />}
                            {n.type === 'issue_added' && <Briefcase size={14} />}
                            {n.type === 'issue_updated' && <Briefcase size={14} />}
                          </div>
                          <div className="notif-content">
                            <span className="notif-message">{n.message}</span>
                            <span className="notif-time">
                              {new Date(n.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              className="btn-icon theme-toggle"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="user-profile">
              <div className="avatar">AD</div>
              <span className="user-name hidden-mobile">Admin User</span>
            </div>
            <button className="btn-icon" onClick={() => navigate('/admin/login')} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* ── Page content ── */}
        <main className="layout-main">
          <Outlet />
        </main>

        {/* ── Global Work Due Popup ── */}
        <WorkDuePopup />
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
