import { useNavigate } from "react-router-dom";
import NotificationBell from "../notification/NotificationBell";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import "../../styles/AdminDashboard.css";
import "boxicons/css/boxicons.min.css";

const AppHeader = ({ userName, role }) => {
  const navigate = useNavigate();
  const user = useCurrentUser();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const displayName = user.name || userName || "User";

  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="dashboard-header">
      <h2 className="dashboard-logo">
        ComplaintSync {role === "admin" ? "Admin" : ""}
      </h2>

      <div className="header-right">
        <input
          type="text"
          placeholder="Search complaints..."
          className="header-search"
        />

        <NotificationBell />

        <div className="header-user clickable" onClick={handleProfileClick}>
          {user.avatar ? (
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