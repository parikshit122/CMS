import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../../styles/Sidebar.css";

const Sidebar = ({ menuItems = [], role = "User", isOpen, onClose }) => {
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
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
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const handleLinkClick = () => {
    if (window.innerWidth <= 768 && onClose) {
      onClose();
    }
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <h3 className="sidebar-title">
          {role === "Admin"
            ? "Admin Dashboard"
            : role === "Staff"
              ? "Staff Dashboard"
              : "User Dashboard"}
        </h3>
      </div>

      <ul className="sidebar-menu">
        {menuItems.map((item, index) => (
          <li key={index}>
            <NavLink
              to={item.path}
              onClick={handleLinkClick}
              className={({ isActive }) =>
                isActive ? "sidebar-link active" : "sidebar-link"
              }
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}

        <li>
          <button className="sidebar-link theme-link" onClick={toggleTheme}>
            <i className={darkMode ? "bx bx-moon" : "bx bx-sun"}></i>
            <span>{darkMode ? "Dark Mode" : "Light Mode"}</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <i className="bx bx-log-out"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;