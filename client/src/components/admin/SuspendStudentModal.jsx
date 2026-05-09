import React, { useState } from "react";

const PRESET_DAYS = [1, 3, 7, 14, 30];

const SuspendStudentModal = ({ student, onClose, onSubmit }) => {
  const [days, setDays] = useState(7);
  const [customDays, setCustomDays] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const finalDays = customDays ? parseInt(customDays) : days;
  const isValid =
    finalDays > 0 &&
    finalDays <= 365 &&
    reason.trim().length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(student._id, finalDays, reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="bx bx-block" style={{ color: "#ef4444" }}></i>
            Suspend Student
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="bx bx-x"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="suspend-target">
            <div className="users-avatar">
              {student.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="suspend-target-name">{student.name}</div>
              <div className="suspend-target-email">{student.email}</div>
            </div>
          </div>

          <div className="form-row">
            <label>Suspension Duration *</label>
            <div className="duration-presets">
              {PRESET_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`duration-btn ${days === d && !customDays ? "active" : ""}`}
                  onClick={() => {
                    setDays(d);
                    setCustomDays("");
                  }}
                >
                  {d} {d === 1 ? "day" : "days"}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Or enter custom days</label>
            <input
              type="number"
              min="1"
              max="365"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              placeholder="Custom number of days"
            />
          </div>

          <div className="form-row">
            <label>
              Reason for Suspension *
              <span className="form-row-hint">
                (minimum 10 characters)
              </span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this student is being suspended (e.g., repeated false complaints, abusive language, policy violation...)"
              rows={4}
              maxLength={300}
              required
            />
            <div className="form-row-counter">
              <span
                className={
                  reason.trim().length < 10
                    ? "counter-error"
                    : "counter-ok"
                }
              >
                {reason.trim().length}/300 characters
                {reason.trim().length < 10 &&
                  ` (${10 - reason.trim().length} more required)`}
              </span>
            </div>
          </div>

          <div className="suspend-summary">
            <i className="bx bx-info-circle"></i>
            Student will be suspended for <strong>{finalDays} day(s)</strong>{" "}
            and reactivated automatically on{" "}
            <strong>
              {new Date(Date.now() + finalDays * 86400000).toLocaleDateString()}
            </strong>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="users-btn users-btn--outline"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="users-btn users-btn--danger"
              disabled={!isValid || submitting}
            >
              {submitting ? "Suspending..." : "Suspend Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuspendStudentModal;