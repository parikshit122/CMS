import React from "react";
import { evaluateSlaStatus } from "../../utils/sla";
import "../../styles/ComplaintExtras.css";

const STATE_META = {
  overdue: {
    icon: "bx-error-circle",
    cls: "cs-sla--overdue",
  },
  "at-risk": {
    icon: "bx-time-five",
    cls: "cs-sla--risk",
  },
  "on-track": {
    icon: "bx-timer",
    cls: "cs-sla--track",
  },
  met: {
    icon: "bx-check-shield",
    cls: "cs-sla--met",
  },
  breached: {
    icon: "bx-alarm-exclamation",
    cls: "cs-sla--breached",
  },
  closed: {
    icon: "bx-minus-circle",
    cls: "cs-sla--closed",
  },
};

const SlaBadge = ({ complaint, compact = false }) => {
  if (!complaint) return null;
  const sla = evaluateSlaStatus(complaint);
  const meta = STATE_META[sla.state] || STATE_META.closed;

  const dueTitle = sla.dueAt
    ? `SLA Deadline: ${sla.dueAt.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : undefined;

  return (
    <span
      className={`cs-sla ${meta.cls} ${compact ? "cs-sla--compact" : ""}`}
      title={dueTitle}
      data-sla-state={sla.state}
    >
      <i className={`bx ${meta.icon}`} aria-hidden="true" />
      <span className="cs-sla__label">{sla.label}</span>
    </span>
  );
};

export default SlaBadge;
