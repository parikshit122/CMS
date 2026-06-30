import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Maintenance.css";

export default function Maintenance() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("maintenanceMessage");
    setMessage(saved || "Site is under maintenance. Please check back soon.");
  }, []);

  const handleRetry = () => {
    localStorage.removeItem("maintenanceMessage");
    window.location.replace("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("maintenanceMessage");
    window.location.replace("/auth");
  };

  const handleAdminLogin = () => {
    localStorage.removeItem("maintenanceMessage");
    navigate("/auth");
  };

  return (
    <div className="maintenance-page">
      <div className="maintenance-card">
        <div className="maintenance-icon">
          <i className="bx bx-cog bx-spin" />
        </div>
        <h1>Under Maintenance</h1>
        <p>{message}</p>

        <div className="maintenance-info">
          <i className="bx bx-time-five" />
          <span>We'll be back soon</span>
        </div>

        <div className="maintenance-actions">
          <button className="maintenance-retry" onClick={handleRetry}>
            <i className="bx bx-refresh" />
            Try Again
          </button>

          <button className="maintenance-secondary" onClick={handleAdminLogin}>
            <i className="bx bx-log-in" />
            Login as Admin
          </button>

          <button className="maintenance-logout" onClick={handleLogout}>
            <i className="bx bx-log-out" />
            Logout
          </button>
        </div>

        <p className="maintenance-hint">
          <i className="bx bx-info-circle" />
          Only administrators can access the system during maintenance.
        </p>
      </div>
    </div>
  );
}