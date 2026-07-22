import { useNavigate } from "react-router-dom";
import NotificationBell from "../notification/NotificationBell";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/AdminDashboard.css";
import "boxicons/css/boxicons.min.css";

const AppHeader = ({ userName, role }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleProfileClick = () => navigate("/profile");

  const displayName = user?.name || userName || "User";

  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button
          className="header-theme-toggle left-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          aria-label="Toggle Theme"
          type="button"
        >
          <i className={`bx ${theme === "dark" ? "bx-sun" : "bx-moon"}`} />
        </button>
        <h2 className="dashboard-logo">
          ComplaintSync {role === "admin" ? "Admin" : ""}
        </h2>
      </div>

      <div className="header-right">
        <NotificationBell />

        <div className="header-user clickable" onClick={handleProfileClick}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Profile"
              className="avatar avatar-img"
              key={user.avatar}
            />
          ) : (
            <div className="avatar">{initials}</div>
          )}
          <div>
            <div className="user-name">{displayName}</div>
            <small className="user-role">{role}</small>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;