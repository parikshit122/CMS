import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import AppHeader from '../components/layout/AppHeader';
import '../styles/StudentLayout.css';

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on outside click (mobile)
  useEffect(() => {
    const handleClick = (e) => {
      if (
        sidebarOpen &&
        !e.target.closest('.student-sidebar') &&
        !e.target.closest('.student-layout__menu-btn')
      ) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sidebarOpen]);

  return (
    <div
      className={[
        'student-layout',
        sidebarCollapsed ? 'student-layout--collapsed' : '',
        sidebarOpen ? 'student-layout--sidebar-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ── Sidebar ── */}
      <aside
        className={[
          'student-sidebar',
          sidebarOpen ? 'student-sidebar--open' : '',
          sidebarCollapsed ? 'student-sidebar--collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        />
      </aside>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="student-layout__overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main area ── */}
      <div className="student-layout__main">
        {/* Top bar */}
        <header className="student-layout__topbar">
          <AppHeader
            onMenuClick={() => setSidebarOpen((p) => !p)}
            sidebarOpen={sidebarOpen}
          />
        </header>

        {/* Page content */}
        <main className="student-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;