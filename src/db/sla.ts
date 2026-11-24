export const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  urgent: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export type SlaState =
  | "overdue"
  | "at-risk"
  | "on-track"
  | "met"
  | "breached"
  | "closed";

export interface SlaEvaluation {
  state: SlaState;
  dueAt: Date;
  remainingMs: number;
  windowMs: number;
  isOverdue: boolean;
}

export function getSlaHours(priority?: string | null): number {
  const key = String(priority || "medium").toLowerCase().trim();
  return SLA_HOURS_BY_PRIORITY[key] ?? SLA_HOURS_BY_PRIORITY.medium;
}

export function computeSlaDueAt(
  priority?: string | null,
  createdAt: Date | string = new Date()
): Date {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const baseMs = Number.isNaN(base.getTime()) ? Date.now() : base.getTime();
  return new Date(baseMs + getSlaHours(priority) * 60 * 60 * 1000);
}

export function evaluateSlaStatus(
  complaint: {
    priority?: string | null;
    status?: string | null;
    createdAt?: Date | string | null;
    updatedAt?: Date | string | null;
    resolvedAt?: Date | string | null;
    slaDueAt?: Date | string | null;
  },
  now: Date = new Date()
): SlaEvaluation {
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
    };
  }

  const atRiskThreshold = windowMs * 0.25;
  return {
    state: remainingMs <= atRiskThreshold ? "at-risk" : "on-track",
    dueAt,
    remainingMs,
    windowMs,
    isOverdue: false,
  };
}
