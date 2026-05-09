import { useNavigate } from "react-router-dom";
import "../../styles/AdminDashboard.css";

const AppHeader = ({ userName, role }) => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

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

        <i className="bx bx-bell header-icon"></i>

        {/* ✅ PROFILE CLICKABLE */}
        <div
          className="header-user clickable"
          onClick={handleProfileClick}
        >
          <div className="avatar">{initials}</div>
          <div>
            <div className="user-name">{userName}</div>
            <small className="user-role">{role}</small>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;