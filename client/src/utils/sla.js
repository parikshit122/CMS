export const SLA_HOURS_BY_PRIORITY = {
  urgent: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export function getSlaHours(priority) {
  const key = String(priority || "medium").toLowerCase().trim();
  return SLA_HOURS_BY_PRIORITY[key] ?? SLA_HOURS_BY_PRIORITY.medium;
}

export function computeSlaDueAt(priority, createdAt = new Date()) {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const baseMs = Number.isNaN(base.getTime()) ? Date.now() : base.getTime();
  return new Date(baseMs + getSlaHours(priority) * 60 * 60 * 1000);
}

export function formatSlaDuration(ms) {
  const absMs = Math.abs(ms);
  const totalMinutes = Math.max(1, Math.round(absMs / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  if (totalHours < 24) {
    return remMinutes > 0 ? `${totalHours}h ${remMinutes}m` : `${totalHours}h`;
  }
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export function evaluateSlaStatus(complaint, now = new Date()) {
  if (!complaint) {
    return {
      state: "closed",
      dueAt: null,
      remainingMs: 0,
      windowMs: 0,
      isOverdue: false,
      label: "—",
    };
  }

  const windowMs = getSlaHours(complaint.priority) * 60 * 60 * 1000;
  const dueAt = complaint.slaDueAt
    ? new Date(complaint.slaDueAt)
    : computeSlaDueAt(complaint.priority, complaint.createdAt || now);

  const status = String(complaint.status || "pending").toLowerCase();

  if (status === "rejected") {
    return {
      state: "closed",
      dueAt,
      remainingMs: 0,
      windowMs,
      isOverdue: false,
      label: "Closed",
    };
  }

  if (status === "resolved") {
    const resolvedTime = complaint.resolvedAt
      ? new Date(complaint.resolvedAt)
      : complaint.updatedAt
        ? new Date(complaint.updatedAt)
        : now;
    const diffMs = dueAt.getTime() - resolvedTime.getTime();
    const met = diffMs >= 0;
    return {
      state: met ? "met" : "breached",
      dueAt,
      remainingMs: diffMs,
      windowMs,
      isOverdue: !met,
      label: met ? "SLA Met" : `Late ${formatSlaDuration(diffMs)}`,
    };
  }

  const remainingMs = dueAt.getTime() - now.getTime();
  if (remainingMs < 0) {
    return {
      state: "overdue",
      dueAt,
      remainingMs,
      windowMs,
      isOverdue: true,
      label: `Overdue ${formatSlaDuration(remainingMs)}`,
    };
  }

  const atRiskThreshold = windowMs * 0.25;
  const isAtRisk = remainingMs <= atRiskThreshold;
  return {
    state: isAtRisk ? "at-risk" : "on-track",
    dueAt,
    remainingMs,
    windowMs,
    isOverdue: false,
    label: `${formatSlaDuration(remainingMs)} left`,
  };
}
