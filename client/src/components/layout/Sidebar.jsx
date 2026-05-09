import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Sidebar.css";

const Sidebar = ({ menuItems = [], role = "User", isOpen, onClose }) => {
  const [darkMode, setDarkMode] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    // Default to light mode — only go dark if explicitly saved
    const savedTheme = localStorage.getItem("theme") || "light";
    const isDark = savedTheme === "dark";
    setDarkMode(isDark);
    document.documentElement.setAttribute("data-bs-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const theme = darkMode ? "light" : "dark";
    setDarkMode(!darkMode);
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("theme", theme);
  };

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  const handleLinkClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  const roleLabel =
    role === "Admin"
      ? "Admin Dashboard"
      : role === "Staff"
      ? "Staff Dashboard"
      : "User Dashboard";

  return (
    <>
      {/* ── Mobile backdrop overlay ─────────────────────── */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <nav
        className={`sidebar ${isOpen ? "open" : "closed"}`}
        aria-label={`${role} navigation`}
      >
        <div className="sidebar-header">
          <h3 className="sidebar-title">{roleLabel}</h3>
        </div>

        {/* ── Nav links ───────────────────────────────────── */}
        <ul className="sidebar-menu" role="list">
          {menuItems.map((item, index) => (
            <li key={index} role="listitem">
              <NavLink
                to={item.path}
                end={item.end ?? false}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  isActive ? "sidebar-link active" : "sidebar-link"
                }
                aria-label={item.label}
              >
                <i className={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}

          {/* ── Theme toggle ──────────────────────────────── */}
          <li role="listitem">
            <button
              className="sidebar-link theme-link"
              onClick={toggleTheme}
              aria-label={`Switch to ${darkMode ? "light" : "dark"} mode`}
              aria-pressed={darkMode}
            >
              <i
                className={darkMode ? "bx bx-sun" : "bx bx-moon"}
                aria-hidden="true"
              />
              <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </li>
        </ul>

        {/* ── Footer / Logout ─────────────────────────────── */}
        <div className="sidebar-footer">
          <button
            className="logout-btn"
            onClick={handleLogout}
            aria-label="Logout of your account"
          >
            <i className="bx bx-log-out" aria-hidden="true" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;