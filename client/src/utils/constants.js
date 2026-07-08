// ── Complaint statuses ────────────────────────────────────
export const STATUSES = [
  { key: "pending",     label: "Pending",     color: "#f59e0b" },
  { key: "in-progress", label: "In Progress", color: "#3b82f6" },
  { key: "resolved",    label: "Resolved",    color: "#10b981" },
  { key: "rejected",    label: "Rejected",    color: "#ef4444" },
];

// ── Complaint priorities ──────────────────────────────────
export const PRIORITIES = [
  { key: "low",    label: "Low",    color: "#16a34a" },
  { key: "medium", label: "Medium", color: "#ca8a04" },
  { key: "high",   label: "High",   color: "#ea580c" },
  { key: "urgent", label: "Urgent", color: "#dc2626" },
];

// ── Complaint categories ──────────────────────────────────
export const CATEGORIES = [
  "infrastructure",
  "cleanliness",
  "electrical",
  "plumbing",
  "safety",
  "it",
  "academic",
  "other",
];

// ── User roles ────────────────────────────────────────────
export const ROLES = {
  USER:  "user",
  STAFF: "staff",
  ADMIN: "admin",
};

// ── Role display labels ───────────────────────────────────
export const ROLE_LABELS = {
  user:  "Student",
  staff: "Staff",
  admin: "Admin",
};

// ── Role home routes ──────────────────────────────────────
export const ROLE_HOME = {
  admin: "/admin",
  staff: "/staff",
  user:  "/dashboard",
};

// ── Notification types ────────────────────────────────────
export const NOTIFICATION_TYPES = {
  SUBMITTED:   "complaint_submitted",
  ASSIGNED:    "complaint_assigned",
  RESOLVED:    "complaint_resolved",
  REJECTED:    "complaint_rejected",
  REASSIGNED:  "complaint_reassigned",
  IN_PROGRESS: "complaint_inprogress",
};

// ── Pagination ────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE     = 100;

// ── File upload limits ────────────────────────────────────
export const MAX_FILE_SIZE_MB  = 5;
export const MAX_FILE_SIZE     = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── API base URL ──────────────────────────────────────────
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";