/**
 * Pure business logic for ComplaintSync — Avishkar Engineering & Technology Edition.
 * Decoupled from Express, Drizzle, and React for deterministic unit testing via node:test.
 */

export const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  urgent: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export interface EscalationEvalInput {
  status: string;
  priority: string;
  createdAt: Date | string;
  slaDueAt?: Date | string | null;
  currentEscalationLevel?: number;
}

export interface EscalationEvalResult {
  targetLevel: 0 | 1 | 2;
  shouldEscalate: boolean;
  elapsedRatio: number;
  reason: string;
}

/**
 * Evaluates multi-tier SLA escalation state for a complaint.
 * - Level 0: Standard (< 75% of SLA window elapsed, or resolved/rejected)
 * - Level 1: Department Head Warning (>= 75% and < 100% of SLA elapsed)
 * - Level 2: Principal / Executive Breach (>= 100% of SLA elapsed / past slaDueAt)
 */
export function evaluateSlaEscalation(
  input: EscalationEvalInput,
  now: Date = new Date()
): EscalationEvalResult {
  const status = String(input.status || "").toLowerCase();
  if (status === "resolved" || status === "rejected") {
    return {
      targetLevel: 0,
      shouldEscalate: false,
      elapsedRatio: 0,
      reason: "Closed ticket is exempt from escalation.",
    };
  }

  const created = new Date(input.createdAt);
  const priority = String(input.priority || "medium").toLowerCase();
  const windowHours = SLA_HOURS_BY_PRIORITY[priority] ?? 72;
  const due = input.slaDueAt
    ? new Date(input.slaDueAt)
    : new Date(created.getTime() + windowHours * 3600 * 1000);

  const totalMs = Math.max(1, due.getTime() - created.getTime());
  const elapsedMs = Math.max(0, now.getTime() - created.getTime());
  const elapsedRatio = Number((elapsedMs / totalMs).toFixed(3));
  const currentLevel = Number(input.currentEscalationLevel || 0);

  let targetLevel: 0 | 1 | 2 = 0;
  let reason = "Within SLA window.";

  if (now.getTime() >= due.getTime() || elapsedRatio >= 1) {
    targetLevel = 2;
    const overdueHours = Math.max(
      1,
      Math.round((now.getTime() - due.getTime()) / (3600 * 1000))
    );
    reason = `SLA breached (${priority} window exceeded by ~${overdueHours}h) — escalated to Principal/Admin (Level 2).`;
  } else if (elapsedRatio >= 0.75) {
    targetLevel = 1;
    const pct = Math.round(elapsedRatio * 100);
    reason = `${pct}% of ${priority} SLA window elapsed — Department Head alert triggered (Level 1).`;
  }

  return {
    targetLevel,
    shouldEscalate: targetLevel > currentLevel,
    elapsedRatio,
    reason,
  };
}

export interface CandidateComplaint {
  id: number;
  complaintId: string;
  title: string;
  description: string;
  category: string;
  location?: string | null;
  status: string;
  endorsementCount?: number;
  createdAt?: Date | string;
}

export interface DuplicateMatch {
  id: number;
  complaintId: string;
  title: string;
  category: string;
  location: string;
  status: string;
  endorsementCount: number;
  similarityScore: number; // 0-100
  matchReason: string;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "has",
  "not",
  "are",
  "was",
  "were",
  "been",
  "please",
  "issue",
  "problem",
  "complaint",
  "campus",
  "there",
  "near",
  "very",
  "since",
  "days",
  "working",
]);

export function tokenizeForSimilarity(text: string): Set<string> {
  const tokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097f\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

/**
 * Deterministic candidate ranker for semantic duplicate pre-filtering and fallback scoring.
 * Combines Jaccard token overlap with location & category affinity bonuses.
 */
export function rankCandidateDuplicates(
  incoming: {
    title?: string;
    description?: string;
    category?: string;
    location?: string;
  },
  openComplaints: CandidateComplaint[],
  maxResults = 3
): DuplicateMatch[] {
  const queryTokens = tokenizeForSimilarity(
    `${incoming.title || ""} ${incoming.description || ""}`
  );
  const incomingLoc = String(incoming.location || "").toLowerCase().trim();
  const incomingCat = String(incoming.category || "").toLowerCase().trim();

  const scored: DuplicateMatch[] = [];

  for (const c of openComplaints) {
    if (!["pending", "in-progress"].includes(String(c.status || "").toLowerCase())) {
      continue;
    }

    const candTokens = tokenizeForSimilarity(`${c.title} ${c.description}`);
    let intersection = 0;
    for (const tok of queryTokens) {
      if (candTokens.has(tok)) intersection += 1;
    }
    const union = new Set([...queryTokens, ...candTokens]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    const sameLocation =
      Boolean(incomingLoc) &&
      String(c.location || "").toLowerCase().trim() === incomingLoc;
    const sameCategory =
      Boolean(incomingCat) &&
      String(c.category || "").toLowerCase().trim() === incomingCat;

    let score = Math.round(jaccard * 70);
    if (sameLocation) score += 20;
    if (sameCategory) score += 12;
    score = Math.min(99, score);

    if (score >= 34 && (intersection >= 1 || (sameLocation && sameCategory))) {
      const reasons: string[] = [];
      if (sameLocation) reasons.push("same campus location");
      if (sameCategory) reasons.push("same category");
      if (intersection >= 2) reasons.push(`${intersection} shared issue keywords`);
      else if (intersection === 1) reasons.push("related issue topic");

      scored.push({
        id: c.id,
        complaintId: c.complaintId,
        title: c.title,
        category: c.category,
        location: c.location || "Campus",
        status: c.status,
        endorsementCount: Math.max(1, Number(c.endorsementCount || 1)),
        similarityScore: score,
        matchReason: reasons.join(" · ") || "Similar active report",
      });
    }
  }

  return scored
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxResults);
}

export interface LeaderboardComplaintRecord {
  category: string;
  status: string;
  priority?: string;
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  slaDueAt?: Date | string | null;
  rating?: number | null;
  escalationLevel?: number;
  endorsementCount?: number;
  sourceChannel?: string;
}

export interface DepartmentLeaderboardRow {
  category: string;
  total: number;
  resolved: number;
  active: number;
  slaMetCount: number;
  slaCompliancePct: number;
  avgResolutionHours: number;
  avgRating: number;
  ratedCount: number;
  escalatedCount: number;
  compositeScore: number;
}

/**
 * Computes the Public Transparency & Department SLA Leaderboard.
 * Ranks departments by composite score: 50% SLA compliance + 30% resolution ratio + 20% student satisfaction.
 */
export function computeDepartmentLeaderboard(
  records: LeaderboardComplaintRecord[],
  now: Date = new Date()
): DepartmentLeaderboardRow[] {
  const buckets = new Map<
    string,
    {
      total: number;
      resolved: number;
      active: number;
      slaMetCount: number;
      resolutionHoursSum: number;
      ratingSum: number;
      ratedCount: number;
      escalatedCount: number;
    }
  >();

  for (const r of records) {
    const cat = String(r.category || "other").toLowerCase().trim() || "other";
    if (!buckets.has(cat)) {
      buckets.set(cat, {
        total: 0,
        resolved: 0,
        active: 0,
        slaMetCount: 0,
        resolutionHoursSum: 0,
        ratingSum: 0,
        ratedCount: 0,
        escalatedCount: 0,
      });
    }
    const b = buckets.get(cat)!;
    b.total += 1;

    const status = String(r.status || "").toLowerCase();
    const created = new Date(r.createdAt);
    const windowHours =
      SLA_HOURS_BY_PRIORITY[String(r.priority || "medium").toLowerCase()] ?? 72;
    const due = r.slaDueAt
      ? new Date(r.slaDueAt)
      : new Date(created.getTime() + windowHours * 3600 * 1000);

    if (status === "resolved") {
      b.resolved += 1;
      const finished = new Date(r.resolvedAt || r.updatedAt || now);
      const hrs = Math.max(0.1, (finished.getTime() - created.getTime()) / (3600 * 1000));
      b.resolutionHoursSum += hrs;
      if (finished.getTime() <= due.getTime()) {
        b.slaMetCount += 1;
      }
    } else if (status === "pending" || status === "in-progress") {
      b.active += 1;
      if (now.getTime() <= due.getTime()) {
        b.slaMetCount += 1;
      }
    } else {
      // rejected counts as handled within SLA if closed before due
      const finished = new Date(r.updatedAt || now);
      if (finished.getTime() <= due.getTime()) {
        b.slaMetCount += 1;
      }
    }

    if (typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5) {
      b.ratingSum += r.rating;
      b.ratedCount += 1;
    }

    if (Number(r.escalationLevel || 0) >= 1) {
      b.escalatedCount += 1;
    }
  }

  const rows: DepartmentLeaderboardRow[] = [];
  for (const [category, b] of buckets.entries()) {
    const slaCompliancePct = b.total > 0 ? Math.round((b.slaMetCount / b.total) * 100) : 0;
    const resolutionPct = b.total > 0 ? (b.resolved / b.total) * 100 : 0;
    const avgResolutionHours =
      b.resolved > 0 ? Number((b.resolutionHoursSum / b.resolved).toFixed(1)) : 0;
    const avgRating =
      b.ratedCount > 0 ? Number((b.ratingSum / b.ratedCount).toFixed(2)) : 0;
    const ratingScore = b.ratedCount > 0 ? (avgRating / 5) * 100 : 75;

    const compositeScore = Math.round(
      slaCompliancePct * 0.5 + resolutionPct * 0.3 + ratingScore * 0.2
    );

    rows.push({
      category,
      total: b.total,
      resolved: b.resolved,
      active: b.active,
      slaMetCount: b.slaMetCount,
      slaCompliancePct,
      avgResolutionHours,
      avgRating,
      ratedCount: b.ratedCount,
      escalatedCount: b.escalatedCount,
      compositeScore,
    });
  }

  return rows.sort((a, b) => {
    if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore;
    return b.resolved - a.resolved;
  });
}

export interface NaacAuditSummary {
  totalComplaints: number;
  resolvedCount: number;
  pendingCount: number;
  inProgressCount: number;
  rejectedCount: number;
  resolutionRatePct: number;
  slaCompliancePct: number;
  avgResolutionHours: number;
  avgSatisfactionRating: number;
  totalRated: number;
  escalatedL1Count: number;
  escalatedL2Count: number;
  duplicateEndorsementsSaved: number;
  channels: { web: number; qr: number; voice: number };
  leaderboard: DepartmentLeaderboardRow[];
}

/**
 * Aggregates institutional metrics for NAAC Criterion V & VII PDF audit reports.
 */
export function computeNaacAuditMetrics(
  records: LeaderboardComplaintRecord[],
  now: Date = new Date()
): NaacAuditSummary {
  const leaderboard = computeDepartmentLeaderboard(records, now);
  const totalComplaints = records.length;

  let resolvedCount = 0;
  let pendingCount = 0;
  let inProgressCount = 0;
  let rejectedCount = 0;
  let slaMetTotal = 0;
  let resolutionHoursSum = 0;
  let ratingSum = 0;
  let totalRated = 0;
  let escalatedL1Count = 0;
  let escalatedL2Count = 0;
  let duplicateEndorsementsSaved = 0;
  const channels = { web: 0, qr: 0, voice: 0 };

  for (const r of records) {
    const status = String(r.status || "").toLowerCase();
    const created = new Date(r.createdAt);
    const windowHours =
      SLA_HOURS_BY_PRIORITY[String(r.priority || "medium").toLowerCase()] ?? 72;
    const due = r.slaDueAt
      ? new Date(r.slaDueAt)
      : new Date(created.getTime() + windowHours * 3600 * 1000);

    if (status === "resolved") {
      resolvedCount += 1;
      const finished = new Date(r.resolvedAt || r.updatedAt || now);
      resolutionHoursSum += Math.max(
        0.1,
        (finished.getTime() - created.getTime()) / (3600 * 1000)
      );
      if (finished.getTime() <= due.getTime()) slaMetTotal += 1;
    } else if (status === "pending") {
      pendingCount += 1;
      if (now.getTime() <= due.getTime()) slaMetTotal += 1;
    } else if (status === "in-progress") {
      inProgressCount += 1;
      if (now.getTime() <= due.getTime()) slaMetTotal += 1;
    } else if (status === "rejected") {
      rejectedCount += 1;
      slaMetTotal += 1;
    }

    if (typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5) {
      ratingSum += r.rating;
      totalRated += 1;
    }

    const esc = Number(r.escalationLevel || 0);
    if (esc === 1) escalatedL1Count += 1;
    if (esc >= 2) escalatedL2Count += 1;

    const endorsements = Math.max(1, Number(r.endorsementCount || 1));
    if (endorsements > 1) {
      duplicateEndorsementsSaved += endorsements - 1;
    }

    const ch = String(r.sourceChannel || "web").toLowerCase();
    if (ch === "qr") channels.qr += 1;
    else if (ch === "voice") channels.voice += 1;
    else channels.web += 1;
  }

  return {
    totalComplaints,
    resolvedCount,
    pendingCount,
    inProgressCount,
    rejectedCount,
    resolutionRatePct:
      totalComplaints > 0 ? Math.round((resolvedCount / totalComplaints) * 100) : 0,
    slaCompliancePct:
      totalComplaints > 0 ? Math.round((slaMetTotal / totalComplaints) * 100) : 0,
    avgResolutionHours:
      resolvedCount > 0 ? Number((resolutionHoursSum / resolvedCount).toFixed(1)) : 0,
    avgSatisfactionRating:
      totalRated > 0 ? Number((ratingSum / totalRated).toFixed(2)) : 0,
    totalRated,
    escalatedL1Count,
    escalatedL2Count,
    duplicateEndorsementsSaved,
    channels,
    leaderboard,
  };
}

/**
 * Privacy-safe projection for Public Transparency Ticket Lookup.
 * Strictly strips student PII (name, email, phone, attachments) while exposing workflow milestones.
 */
export function maskComplaintForPublic(
  complaint: Record<string, any>,
  activities: Array<Record<string, any>> = []
) {
  return {
    complaintId: complaint.complaintId,
    title: complaint.title,
    category: complaint.category,
    priority: complaint.priority,
    location: complaint.location || "Main Campus",
    status: complaint.status,
    sourceChannel: complaint.sourceChannel || "web",
    originalLanguage: complaint.originalLanguage || "en",
    endorsementCount: Math.max(1, Number(complaint.endorsementCount || 1)),
    escalationLevel: Number(complaint.escalationLevel || 0),
    escalatedAt: complaint.escalatedAt || null,
    slaDueAt: complaint.slaDueAt || null,
    resolvedAt: complaint.resolvedAt || null,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    assignedDepartment: complaint.assignedTo?.category || complaint.category,
    isAssigned: Boolean(complaint.assignedToId || complaint.assignedTo),
    timeline: activities
      .filter((a) => a.kind !== "comment") // Keep system/status/escalation milestones only for privacy
      .map((a) => ({
        kind: a.kind,
        body: a.body,
        authorRole: a.authorRole,
        createdAt: a.createdAt,
      })),
  };
}

/**
 * Normalizes a QR spot code into a safe uppercase slug (e.g., "CAMPUS-CSLAB-02").
 */
export function normalizeSpotCode(raw: string): string {
  return String(raw || "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
