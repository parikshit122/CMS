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

  /** Get ALL complaints (admin only) with optional server-side filters */
  getAllComplaints: (params = {}) => {
    const cleanParams = {};
    Object.entries(params || {}).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "" && val !== "all" && val !== false) {
        cleanParams[key] = val;
      }
    });
    return API.get("/complaints", { params: cleanParams });
  },

  /** Assign a complaint to a staff member */
  assignComplaint: (complaintId, staffId) =>
    API.patch(`/admin/complaints/${complaintId}/assign`, { staffId }),

  /** Get staff members list (admin — for assignment dropdown) */
  getStaffList: () =>
    API.get("/complaints/staff"),

  // ── Shared ───────────────────────────────────────────────

  /** Get single complaint detail */
  getComplaintById: (complaintId) =>
    API.get(`/complaints/${complaintId}`),

  /** Get chronological activity timeline & comments for a complaint */
  getComplaintActivities: (complaintId) =>
    API.get(`/complaints/${complaintId}/activities`),

  /** Post a comment on a complaint */
  addComplaintComment: (complaintId, body) =>
    API.post(`/complaints/${complaintId}/comments`, { body }),

  /** Submit student satisfaction rating (1-5 stars + optional feedback) */
  rateComplaint: (complaintId, payload) =>
    API.post(`/complaints/${complaintId}/rate`, payload),

  /** Get dashboard stats for staff */
  getStaffStats: () =>
    API.get("/complaints/stats/staff"),

  /** Get dashboard stats for admin */
  getAdminStats: () =>
    API.get("/complaints/stats/admin"),
};

export default complaintService;