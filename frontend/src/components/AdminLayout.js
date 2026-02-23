import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { section: 'Overview' },
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { section: 'Students' },
  { path: '/admin/students', label: 'Students', icon: '👨‍🎓' },
  { path: '/admin/enquiries', label: 'Enquiries', icon: '📋' },
  { section: 'Finance' },
  { path: '/admin/fees', label: 'Fees Overview', icon: '💰' },
  { path: '/admin/discounts', label: 'Discounts', icon: '🏷️' },
  { section: 'Academic' },
  { path: '/admin/courses', label: 'Courses', icon: '📚' },
  { path: '/admin/certificates', label: 'Certificates', icon: '🏆' },
  { section: 'Settings' },
  { path: '/admin/staff', label: 'Staff', icon: '👥' },
];

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/students': 'Student Management',
  '/admin/enquiries': 'Enquiry Management',
  '/admin/discounts': 'Discount Management',
  '/admin/fees': 'Fees Overview',
  '/admin/courses': 'Course Management',
  '/admin/certificates': 'Certificates',
  '/admin/staff': 'Staff Management',
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };
  const handleNav = (path) => { navigate(path); setSidebarOpen(false); };

  const currentTitle = pageTitles[location.pathname] || 'Admin Panel';

  return (
    <div className="app-layout">
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🎓</div>
          <div className="sidebar-brand-text">
            <h2>Institute</h2>
            <span>Management System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if (item.section) return (
              <div key={i} className="nav-section-title">{item.section}</div>
            );
            const isActive = location.pathname === item.path ||
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNav(item.path)}
              >
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.name?.charAt(0) || 'A'}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'Admin'}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="navbar">
          <div className="navbar-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
            <span className="navbar-title">{currentTitle}</span>
          </div>
          <div className="navbar-right">
            <div className="navbar-user">
              <div className="navbar-user-dot"></div>
              <span className="navbar-user-text">{user?.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Admin</span>
            </div>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
