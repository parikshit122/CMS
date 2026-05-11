import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { resetNotifications } from "../../redux/notificationSlice";
import NotificationBell from "../notification/NotificationBell";
import "../../styles/AdminDashboard.css";
import "boxicons/css/boxicons.min.css";

const AppHeader = ({ userName, role }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

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

        <NotificationBell />

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