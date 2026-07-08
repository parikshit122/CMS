import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllComplaints } from "../../redux/complaintSlice";
import StatusBadge from "../../components/complaint/StatusBadge";
import AssignStaffModal from "../../components/admin/AssignStaffModal";
import ConfirmModal from "../../components/common/ConfirmModal";
import { useAlert } from "../../components/common/Alert";
import { exportSinglePDF, exportBulkPDF } from "../../utils/pdfExport";
import API from "../../services/api";
import "../../styles/AdminReports.css";

const STATUSES = ["pending", "in-progress", "resolved", "rejected"];

const AdminReports = () => {
  const dispatch = useDispatch();
  const alert    = useAlert();

  const { all: complaints, loading, error } = useSelector(
    (state) => state.complaints
  );

  // ── Filters ────────────────────────────────────────────
  const [q, setQ]                   = useState("");
  const [status, setStatus]         = useState("all");
  const [priority, setPriority]     = useState("all");
  const [category, setCategory]     = useState("all");
  const [dateRange, setDateRange]   = useState("all");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");
  const [sortBy, setSortBy]         = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // ── Modals ─────────────────────────────────────────────
  const [assignTarget, setAssignTarget]   = useState(null);
  const [detailTarget, setDetailTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pdfLoading, setPdfLoading]       = useState(false);

  // ── Inline status edit ──────────────────────────────────
  const [statusEdit, setStatusEdit]     = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchAllComplaints());
  }, [dispatch]);

  // ── Derived categories ──────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set(
      (complaints || []).map((c) => c.category).filter(Boolean)
    );
    return ["all", ...Array.from(set)];
  }, [complaints]);

  // ── Filtered + sorted list ──────────────────────────────
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const now   = new Date();

    return (complaints || [])
      .filter((c) => {
        const matchesQuery =
          !query ||
          (c.title        || "").toLowerCase().includes(query) ||
          (c.description  || "").toLowerCase().includes(query) ||
          (c._id          || "").toLowerCase().includes(query) ||
          (c.complaintId  || "").toLowerCase().includes(query) ||
          (c.student?.name  || "").toLowerCase().includes(query) ||
          (c.student?.email || "").toLowerCase().includes(query) ||
          (c.assignedTo?.name || "").toLowerCase().includes(query);

        const matchesStatus   = status === "all"   || c.status   === status;
        const matchesPriority = priority === "all" || c.priority === priority;
        const matchesCategory = category === "all" || c.category === category;

        let matchesDate = true;
        if (fromDate) {
          if (new Date(c.createdAt) < new Date(fromDate)) matchesDate = false;
        }
        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (new Date(c.createdAt) > to) matchesDate = false;
        }
        if (dateRange !== "all") {
          const diffDays = Math.floor(
            (now - new Date(c.createdAt)) / (1000 * 60 * 60 * 24)
          );
          if (dateRange === "today")   matchesDate = diffDays === 0;
          if (dateRange === "week")    matchesDate = diffDays <= 7;
          if (dateRange === "month")   matchesDate = diffDays <= 30;
          if (dateRange === "quarter") matchesDate = diffDays <= 90;
        }

        return (
          matchesQuery &&
          matchesStatus &&
          matchesPriority &&
          matchesCategory &&
          matchesDate
        );
      })
      .sort((a, b) => {
        if (sortBy === "newest")
          return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === "oldest")
          return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === "priority") {
          const order = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
        }
        return 0;
      });
  }, [complaints, q, status, priority, category, dateRange, fromDate, toDate, sortBy]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [q, status, priority, category, dateRange, fromDate, toDate, sortBy]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated  = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // ── Summary counts ──────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = { pending: 0, "in-progress": 0, resolved: 0, rejected: 0 };
    (complaints || []).forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [complaints]);

  // ── Helpers ─────────────────────────────────────────────
  const hasActiveFilters =
    q || status !== "all" || priority !== "all" || category !== "all" ||
    dateRange !== "all" || fromDate || toDate;

  const clearFilters = () => {
    setQ("");
    setStatus("all");
    setPriority("all");
    setCategory("all");
    setDateRange("all");
    setFromDate("");
    setToDate("");
    setSortBy("newest");
  };

  const getPriorityClass = (p) =>
    ({ urgent: "priority-urgent", high: "priority-high",
       medium: "priority-medium", low: "priority-low" }[p] || "");

  // ── Assign ──────────────────────────────────────────────
  const handleAssigned = useCallback((updatedComplaint) => {
    alert.success(
      `Complaint ${updatedComplaint.complaintId || ""} assigned successfully`
    );
    setAssignTarget(null);
    dispatch(fetchAllComplaints());
  }, [alert, dispatch]);

  // ── Inline status save ──────────────────────────────────
  const saveStatusEdit = async () => {
    if (!statusEdit) return;
    setStatusSaving(true);
    try {
      const res = await API.patch(
        `/complaints/${statusEdit.id}/status`,
        { status: statusEdit.value }
      );
      if (res.data.success) {
        alert.success("Status updated");
        setStatusEdit(null);
        dispatch(fetchAllComplaints());
      }
    } catch (err) {
      alert.error(err.response?.data?.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await API.delete(`/admin/complaints/${deleteTarget._id}`);
      if (res.data.success) {
        alert.success("Complaint deleted");
        setDeleteTarget(null);
        dispatch(fetchAllComplaints());
      }
    } catch (err) {
      alert.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── PDF ─────────────────────────────────────────────────
  const handleBulkPDF = async () => {
    if (!filtered.length) {
      alert.error("No complaints to export");
      return;
    }
    if (filtered.length > 10 && (!fromDate || !toDate)) {
      alert.error("Select From Date and To Date for large exports");
      return;
    }
    setPdfLoading(true);
    try {
      await exportBulkPDF(filtered);
      alert.success(`PDF exported with ${filtered.length} complaints`);
    } catch {
      alert.error("Failed to export PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSinglePDF = async (complaint) => {
    setPdfLoading(true);
    try {
      await exportSinglePDF(complaint);
      alert.success("Complaint PDF downloaded");
    } catch {
      alert.error("Failed to export PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="reports-page">

      {/* ── Header ── */}
      <div className="reports-header">
        <div className="reports-header__left">
          <span className="reports-header__eyebrow">
            <i className="bx bx-bar-chart-alt-2"></i>
            Admin Portal
          </span>
          <h1 className="reports-header__title">Reports & Complaints</h1>
          <p className="reports-header__sub">
            View, manage, and export all submitted complaints
          </p>
        </div>
        <div className="reports-header__right">
          <button
            className="reports-btn reports-btn--outline"
            onClick={() => dispatch(fetchAllComplaints())}
          >
            <i className="bx bx-refresh"></i> Refresh
          </button>
          <button
            className="reports-btn reports-btn--primary"
            onClick={handleBulkPDF}
            disabled={!filtered.length || pdfLoading}
          >
            {pdfLoading ? (
              <><i className="bx bx-loader-alt bx-spin"></i> Generating...</>
            ) : (
              <><i className="bx bxs-file-pdf"></i> Export PDF</>
            )}
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="reports-summary">
        <div className="reports-summary__card">
          <i className="bx bx-list-ul"></i>
          <div><span>{complaints?.length || 0}</span><p>Total</p></div>
        </div>
        <div className="reports-summary__card reports-summary__card--pending">
          <i className="bx bx-time-five"></i>
          <div><span>{statusCounts.pending}</span><p>Pending</p></div>
        </div>
        <div className="reports-summary__card reports-summary__card--progress">
          <i className="bx bx-loader-alt"></i>
          <div><span>{statusCounts["in-progress"]}</span><p>In Progress</p></div>
        </div>
        <div className="reports-summary__card reports-summary__card--resolved">
          <i className="bx bx-check-circle"></i>
          <div><span>{statusCounts.resolved}</span><p>Resolved</p></div>
        </div>
        <div className="reports-summary__card reports-summary__card--rejected">
          <i className="bx bx-x-circle"></i>
          <div><span>{statusCounts.rejected}</span><p>Rejected</p></div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="reports-filters">
        <div className="reports-filters__row">
          <div className="reports-filters__search">
            <i className="bx bx-search"></i>
            <input
              placeholder="Search by ID, title, student..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Categories" : c}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="reports-date-input"
            title="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="reports-date-input"
            title="To date"
          />

          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 90 Days</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Priority</option>
          </select>

          {hasActiveFilters && (
            <button
              className="reports-btn reports-btn--clear"
              onClick={clearFilters}
            >
              <i className="bx bx-x"></i> Clear
            </button>
          )}
        </div>

        <div className="reports-filters__info">
          Showing {paginated.length} of {filtered.length} complaints
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="reports-loader">
          <div className="reports-spinner"></div>
          <p>Loading complaints...</p>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error && (
        <div className="reports-error">
          <i className="bx bx-error-circle"></i>
          {String(error)}
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !error && (
        <>
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Complaint</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Student</th>
                  <th>Assigned To</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c._id}>

                    {/* ID */}
                    <td className="reports-table__id">
                      {c.complaintId || `#${c._id?.slice(-6)}`}
                    </td>

                    {/* Complaint */}
                    <td className="reports-table__complaint">
                      <div className="reports-table__title">{c.title}</div>
                      {c.location && (
                        <div className="reports-table__location">
                          <i className="bx bx-map"></i>{c.location}
                        </div>
                      )}
                      {/* Attachment indicator */}
                      {c.attachments?.length > 0 && (
                        <div style={{
                          display:    "flex",
                          alignItems: "center",
                          gap:        "3px",
                          fontSize:   "0.7rem",
                          color:      "#6366f1",
                          marginTop:  "3px",
                        }}>
                          <i className="bx bx-paperclip"></i>
                          {c.attachments.length} attachment
                          {c.attachments.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td>{c.category || "-"}</td>

                    {/* Priority */}
                    <td>
                      <span className={`reports-priority ${getPriorityClass(c.priority)}`}>
                        {c.priority || "-"}
                      </span>
                    </td>

                    {/* Status — inline edit */}
                    <td>
                      {statusEdit?.id === c._id ? (
                        <div className="reports-status-edit">
                          <select
                            value={statusEdit.value}
                            onChange={(e) =>
                              setStatusEdit({ ...statusEdit, value: e.target.value })
                            }
                            autoFocus
                          >
                            {STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <button
                            className="reports-status-save"
                            onClick={saveStatusEdit}
                            disabled={statusSaving}
                            title="Save"
                          >
                            {statusSaving
                              ? <i className="bx bx-loader-alt bx-spin"></i>
                              : <i className="bx bx-check"></i>
                            }
                          </button>
                          <button
                            className="reports-status-cancel"
                            onClick={() => setStatusEdit(null)}
                            title="Cancel"
                          >
                            <i className="bx bx-x"></i>
                          </button>
                        </div>
                      ) : (
                        <button
                          className="reports-status-btn"
                          onClick={() =>
                            setStatusEdit({ id: c._id, value: c.status })
                          }
                          title="Click to change status"
                        >
                          <StatusBadge status={c.status} />
                          <i className="bx bx-pencil reports-status-edit-icon"></i>
                        </button>
                      )}
                    </td>

                    {/* Student */}
                    <td className="reports-table__student">
                      <div className="reports-table__student-name">
                        {c.student?.name || "Unknown"}
                      </div>
                      <div className="reports-table__student-email">
                        {c.student?.email || ""}
                      </div>
                    </td>

                    {/* Assigned To */}
                    <td>
                      {c.assignedTo ? (
                        <div className="reports-assigned">
                          <div className="reports-assigned__avatar">
                            {c.assignedTo.name?.charAt(0).toUpperCase()}
                          </div>
                          <span>{c.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="reports-unassigned">Unassigned</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="reports-table__date">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })
                        : "-"}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="reports-table__actions">

                        {/* View */}
                        <button
                          className="reports-action-btn reports-action-btn--view"
                          onClick={() => setDetailTarget(c)}
                          title="View details"
                        >
                          <i className="bx bx-show"></i>
                        </button>

                        {/* PDF */}
                        <button
                          className="reports-action-btn reports-action-btn--pdf"
                          onClick={() => handleSinglePDF(c)}
                          disabled={pdfLoading}
                          title="Download PDF"
                        >
                          <i className="bx bxs-file-pdf"></i>
                        </button>

                        {/* Assign */}
                        {!c.assignedTo && c.status === "pending" && (
                          <button
                            className="reports-action-btn reports-action-btn--assign"
                            onClick={() => setAssignTarget(c)}
                            title="Assign staff"
                          >
                            <i className="bx bx-user-plus"></i>
                            Assign
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          className="reports-action-btn reports-action-btn--delete"
                          onClick={() => setDeleteTarget(c)}
                          title="Delete complaint"
                        >
                          <i className="bx bx-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!paginated.length && (
                  <tr>
                    <td colSpan={9} className="reports-table__empty">
                      <i className="bx bx-search-alt"></i>
                      <p>No complaints found for the selected filters.</p>
                      {hasActiveFilters && (
                        <button
                          className="reports-btn reports-btn--outline"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="reports-pagination">
              <button
                className="reports-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <i className="bx bx-chevron-left"></i> Previous
              </button>

              <div className="reports-pagination__pages">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  const show =
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1;

                  if (!show) {
                    if (page === 2 || page === totalPages - 1) {
                      return (
                        <span key={page} className="reports-pagination__dots">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={page}
                      className={`reports-pagination__page ${
                        currentPage === page ? "active" : ""
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                className="reports-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next <i className="bx bx-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Detail Modal ── */}
      {detailTarget && (
        <div className="modal-overlay" onClick={() => setDetailTarget(null)}>
          <div
            className="modal-content modal-content--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>
                <i className="bx bx-detail"></i> Complaint Detail
              </h3>
              <button
                className="modal-close"
                onClick={() => setDetailTarget(null)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>

            <div className="modal-body">
              {/* ── Info rows ── */}
              <div className="assign-complaint-info">
                <div className="assign-row">
                  <span>Complaint ID</span>
                  <strong>
                    {detailTarget.complaintId ||
                      `#${detailTarget._id?.slice(-6)}`}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Title</span>
                  <strong>{detailTarget.title}</strong>
                </div>
                <div className="assign-row">
                  <span>Category</span>
                  <strong className="assign-category-badge">
                    {detailTarget.category}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Priority</span>
                  <strong
                    className={`assign-priority assign-priority--${detailTarget.priority}`}
                  >
                    {detailTarget.priority}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Status</span>
                  <strong>
                    <StatusBadge status={detailTarget.status} />
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Student</span>
                  <strong>
                    {detailTarget.student?.name || "Unknown"}{" "}
                    <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
                      ({detailTarget.student?.email || ""})
                    </span>
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Assigned To</span>
                  <strong>
                    {detailTarget.assignedTo?.name || "Unassigned"}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Location</span>
                  <strong>{detailTarget.location || "—"}</strong>
                </div>
                <div className="assign-row">
                  <span>Submitted</span>
                  <strong>
                    {new Date(detailTarget.createdAt).toLocaleString("en-IN")}
                  </strong>
                </div>
                {detailTarget.resolvedAt && (
                  <div className="assign-row">
                    <span>Resolved At</span>
                    <strong>
                      {new Date(detailTarget.resolvedAt).toLocaleString("en-IN")}
                    </strong>
                  </div>
                )}
              </div>

              {/* ── Description ── */}
              <h4 className="assign-section-title">Description</h4>
              <p style={{ fontSize: "14px", lineHeight: "1.6", margin: "0 0 1rem" }}>
                {detailTarget.description || "—"}
              </p>

              {/* ── Rejection Reason ── */}
              {detailTarget.status === "rejected" &&
                detailTarget.rejectionReason && (
                  <>
                    <h4 className="assign-section-title">Rejection Reason</h4>
                    <p style={{
                      color:      "#dc2626",
                      fontSize:   "14px",
                      background: "#fef2f2",
                      padding:    "0.75rem 1rem",
                      borderRadius: "8px",
                      borderLeft: "3px solid #ef4444",
                      margin:     "0 0 1rem",
                    }}>
                      {detailTarget.rejectionReason}
                    </p>
                  </>
                )}

              {/* ── Attachments ── */}
              {detailTarget.attachments &&
                detailTarget.attachments.length > 0 && (
                  <>
                    <h4 className="assign-section-title">
                      Attachments ({detailTarget.attachments.length})
                    </h4>
                    <div style={{
                      display:               "grid",
                      gridTemplateColumns:   "repeat(auto-fill, minmax(110px, 1fr))",
                      gap:                   "0.75rem",
                      marginTop:             "0.5rem",
                    }}>
                      {detailTarget.attachments.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "none" }}
                        >
                          <div style={{
                            border:       "1px solid #e2e8f0",
                            borderRadius: "10px",
                            overflow:     "hidden",
                            background:   "#f8fafc",
                            transition:   "box-shadow 0.15s",
                          }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(99,102,241,0.2)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <img
                              src={att.url}
                              alt={att.originalName || `Attachment ${idx + 1}`}
                              style={{
                                width:      "100%",
                                height:     "90px",
                                objectFit:  "cover",
                                display:    "block",
                              }}
                            />
                            <div style={{
                              padding:  "0.4rem 0.5rem",
                              display:  "flex",
                              flexDirection: "column",
                              gap:      "2px",
                            }}>
                              <span style={{
                                fontSize:     "0.68rem",
                                fontWeight:   "600",
                                color:        "#334155",
                                whiteSpace:   "nowrap",
                                overflow:     "hidden",
                                textOverflow: "ellipsis",
                              }}>
                                {att.originalName
                                  ? att.originalName.length > 18
                                    ? `${att.originalName.slice(0, 15)}...`
                                    : att.originalName
                                  : `Image ${idx + 1}`}
                              </span>
                              {att.size && (
                                <span style={{
                                  fontSize: "0.62rem",
                                  color:    "#94a3b8",
                                }}>
                                  {att.size < 1024 * 1024
                                    ? `${(att.size / 1024).toFixed(1)} KB`
                                    : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                                </span>
                              )}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </>
                )}
            </div>

            {/* ── Footer ── */}
            <div className="modal-footer">
              {!detailTarget.assignedTo &&
                detailTarget.status === "pending" && (
                  <button
                    className="users-btn users-btn--primary"
                    onClick={() => {
                      setAssignTarget(detailTarget);
                      setDetailTarget(null);
                    }}
                  >
                    <i className="bx bx-user-plus"></i> Assign Staff
                  </button>
                )}
              <button
                className="users-btn users-btn--outline"
                onClick={() => setDetailTarget(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Staff Modal ── */}
      {assignTarget && (
        <AssignStaffModal
          complaint={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={handleAssigned}
        />
      )}

      {/* ── Delete Confirm Modal ── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => { if (!deleteLoading) setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
        title="Delete Complaint?"
        message={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}" (${
                deleteTarget.complaintId ||
                `#${deleteTarget._id?.slice(-6)}`
              })? This cannot be undone.`
            : ""
        }
        confirmText="Delete"
        type="danger"
        icon="bx-trash"
        loading={deleteLoading}
      />
    </div>
  );
};

export default AdminReports;