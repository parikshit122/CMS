import React from "react";
import "../../styles/SuspendedScreen.css";

const SuspendedScreen = ({ suspendedUntil, reason, email, onClose }) => {
  const until = new Date(suspendedUntil);
  const now = new Date();
  const diffMs = until - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.ceil(diffMs / (1000 * 60 * 60));

  const formattedDate = until.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const formattedTime = until.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="suspended-overlay">
      <div className="suspended-card">
        <div className="suspended-icon">
          <i className="bx bx-block"></i>
        </div>

        <h1 className="suspended-title">Account Suspended</h1>
        <p className="suspended-subtitle">
          Your access to ComplaintSync has been temporarily restricted.
        </p>

        <div className="suspended-info">
          <div className="suspended-info-row">
            <i className="bx bx-user"></i>
            <div>
              <span>Account</span>
              <strong>{email}</strong>
            </div>
          </div>

          <div className="suspended-info-row">
            <i className="bx bx-time-five"></i>
            <div>
              <span>Time Remaining</span>
              <strong>
                {daysLeft > 1
                  ? `${daysLeft} days`
                  : hoursLeft > 0
                    ? `${hoursLeft} hour(s)`
                    : "Less than an hour"}
              </strong>
            </div>
          </div>

          <div className="suspended-info-row">
            <i className="bx bx-calendar-check"></i>
            <div>
              <span>Reactivates On</span>
              <strong>
                {formattedDate}
                <br />
                <span className="suspended-time">{formattedTime}</span>
              </strong>
            </div>
          </div>

          {reason && (
            <div className="suspended-reason-box">
              <div className="suspended-reason-header">
                <i className="bx bx-info-circle"></i>
                <span>Reason for Suspension</span>
              </div>
              <p className="suspended-reason-text">{reason}</p>
            </div>
          )}
        </div>

        <div className="suspended-help">
          <i className="bx bx-support"></i>
          <p>
            If you believe this is a mistake, please contact your administrator
            at <a href="mailto:admin@complaintsync.com">admin@complaintsync.com</a>
          </p>
        </div>

        <div className="suspended-actions">
          <button className="suspended-btn" onClick={onClose}>
            <i className="bx bx-arrow-back"></i>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspendedScreen;