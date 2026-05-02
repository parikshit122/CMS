import React from "react";

/* ============================================================
   STATUS BADGE
   Reusable across Admin + Staff views
   ============================================================ */

const STATUS_MAP = {
  pending: {
    label: "Pending",
    icon:  "bx bx-time-five",
    cls:   "status-badge--pending",
  },
  "in-progress": {
    label: "In Progress",
    icon:  "bx bx-loader-alt",
    cls:   "status-badge--progress",
  },
  resolved: {
    label: "Resolved",
    icon:  "bx bx-check-circle",
    cls:   "status-badge--resolved",
  },
  rejected: {
    label: "Rejected",
    icon:  "bx bx-x-circle",
    cls:   "status-badge--rejected",
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_MAP[status] || {
    label: status || "Unknown",
    icon:  "bx bx-question-mark",
    cls:   "status-badge--unknown",
  };

  return (
    <span className={`status-badge ${cfg.cls}`}>
      <i className={cfg.icon} />
      {cfg.label}
    </span>
  );
};

export default StatusBadge;