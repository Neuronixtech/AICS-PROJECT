import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/staff', label: 'Dashboard', icon: '📊' },
  { path: '/staff/students', label: 'Students', icon: '👨‍🎓' },
  { path: '/staff/enquiries', label: 'Enquiries', icon: '📋' },
];

const pageTitles = {
  '/staff': 'Dashboard',
  '/staff/students': 'Students',
  '/staff/enquiries': 'Enquiries',
};

export default function StaffLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/'); };
  const handleNav = (path) => { navigate(path); setSidebarOpen(false); };
  const currentTitle = pageTitles[location.pathname] || 'Staff Panel';

  return (
    <div className="app-layout">
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🎓</div>
          <div className="sidebar-brand-text">
            <h2>Institute</h2>
            <span>Staff Portal</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <button key={item.path} className={`nav-link ${isActive ? 'active' : ''}`} onClick={() => handleNav(item.path)}>
                <span className="nav-link-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.name?.charAt(0) || 'S'}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || 'Staff'}</div>
              <div className="sidebar-user-role">Staff Member</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      </aside>

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
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Staff</span>
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
