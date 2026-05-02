import API from "./api";

/* ============================================================
   COMPLAINT SERVICE
   All API calls related to complaints
   ============================================================ */

const complaintService = {

  // ── Student ──────────────────────────────────────────────

  /** Submit a new complaint */
  submitComplaint: (payload) =>
    API.post("/complaints", payload),

  /** Get complaints submitted by the logged-in student */
  getMyComplaints: () =>
    API.get("/complaints/my"),

  // ── Staff ────────────────────────────────────────────────

  /** Get complaints assigned to the logged-in staff member */
  getAssignedComplaints: () =>
    API.get("/complaints/assigned"),

  /** Update complaint status (staff action) */
  updateComplaintStatus: (complaintId, payload) =>
    API.patch(`/complaints/${complaintId}/status`, payload),
  // payload: { status, rejectionReason? }

  // ── Admin ────────────────────────────────────────────────

  /** Get ALL complaints (admin only) */
  getAllComplaints: () =>
    API.get("/complaints"),

  /** Assign a complaint to a staff member */
  assignComplaint: (complaintId, staffId) =>
    API.patch(`/complaints/${complaintId}/assign`, { staffId }),

  /** Get staff members list (admin — for assignment dropdown) */
  getStaffList: () =>
    API.get("/users/staff"),

  // ── Shared ───────────────────────────────────────────────

  /** Get single complaint detail */
  getComplaintById: (complaintId) =>
    API.get(`/complaints/${complaintId}`),

  /** Get dashboard stats for staff */
  getStaffStats: () =>
    API.get("/complaints/stats/staff"),

  /** Get dashboard stats for admin */
  getAdminStats: () =>
    API.get("/complaints/stats/admin"),
};

export default complaintService;