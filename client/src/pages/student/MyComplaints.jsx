import React, { useEffect, useMemo, useState, useCallback } from "react";
import API from "../../services/api";
import StatusBadge from "../../components/complaint/StatusBadge";
import { useAlert } from "../../components/common/Alert";
import "../../styles/AdminReports.css";

const MyComplaints = () => {
  const alert = useAlert();

  const [complaints,   setComplaints]   = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy,       setSortBy]       = useState("newest");
  const [selected,     setSelected]     = useState(null);

  // ── Fetch ─────────────────────────────────────────────
  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/complaints/my");
      if (res.data.success) setComplaints(res.data.data);
    } catch {
      alert.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // ── Filtered + sorted ─────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return complaints
      .filter((c) => {
        const matchesSearch =
          !q ||
          c.title?.toLowerCase().includes(q)       ||
          c.complaintId?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === "all" || c.status === statusFilter;

        return matchesSearch && matchesStatus;
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
  }, [complaints, search, statusFilter, sortBy]);

  // ── Priority class ────────────────────────────────────
  const getPriorityClass = (p) =>
    ({ urgent: "priority-urgent", high: "priority-high",
       medium: "priority-medium", low: "priority-low" }[p] || "priority-low");

  // ── File size formatter ───────────────────────────────
  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Render ────────────────────────────────────────────
  return (
    <div className="reports-page">

      {/* ── Header ── */}
      <div className="reports-header">
        <div className="reports-header__left">
          <span className="reports-header__eyebrow">
            <i className="bx bx-file"></i>
            Student Portal
          </span>
          <h1 className="reports-header__title">My Complaints</h1>
          <p className="reports-header__sub">
            View, track, and manage your submitted complaints
          </p>
        </div>
        <div className="reports-header__right">
          <button
            className="reports-btn reports-btn--outline"
            onClick={fetchComplaints}
          >
            <i className="bx bx-refresh"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="reports-filters">
        <div className="reports-filters__row">
          <div className="reports-filters__search">
            <i className="bx bx-search"></i>
            <input
              placeholder="Search by ID, title, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        <div className="reports-filters__info">
          Showing {filtered.length} of {complaints.length} complaints
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="reports-loader">
          <div className="reports-spinner"></div>
          <p>Loading your complaints...</p>
        </div>
      ) : (
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Complaint</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id}>

                  {/* ID */}
                  <td className="reports-table__id">
                    {c.complaintId || `#${c._id?.slice(-6)}`}
                  </td>

                  {/* Complaint + location + attachment indicator */}
                  <td className="reports-table__complaint">
                    <div className="reports-table__title">{c.title}</div>
                    {c.location && (
                      <div className="reports-table__location">
                        <i className="bx bx-map"></i>
                        {c.location}
                      </div>
                    )}
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

                  {/* Status */}
                  <td>
                    <StatusBadge status={c.status} />
                  </td>

                  {/* Assigned To */}
                  <td>{c.assignedTo?.name || "—"}</td>

                  {/* Date */}
                  <td className="reports-table__date">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", {
                      day:   "2-digit",
                      month: "short",
                      year:  "numeric",
                    })}
                  </td>

                  {/* Action */}
                  <td>
                    <button
                      className="reports-action-btn reports-action-btn--assign"
                      onClick={() => setSelected(c)}
                    >
                      <i className="bx bx-show"></i>
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="reports-table__empty">
                    <i className="bx bx-folder-open"></i>
                    <p>You have not submitted any complaints yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <div
          className="modal-overlay"
          onClick={() => setSelected(null)}
        >
          <div
            className="modal-content modal-content--wide"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="modal-header">
              <h3>
                <i className="bx bx-file"></i>
                Complaint Details
              </h3>
              <button
                className="modal-close"
                onClick={() => setSelected(null)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>

            {/* Modal body */}
            <div className="modal-body">

              {/* ── Info rows ── */}
              <div className="assign-complaint-info">
                <div className="assign-row">
                  <span>Reference</span>
                  <strong>
                    {selected.complaintId || selected._id}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Title</span>
                  <strong>{selected.title}</strong>
                </div>
                <div className="assign-row">
                  <span>Category</span>
                  <strong className="assign-category-badge">
                    {selected.category}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Priority</span>
                  <strong
                    className={`assign-priority assign-priority--${selected.priority}`}
                  >
                    {selected.priority}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Status</span>
                  <strong>
                    <StatusBadge status={selected.status} />
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Location</span>
                  <strong>{selected.location || "—"}</strong>
                </div>
                <div className="assign-row">
                  <span>Assigned Staff</span>
                  <strong>
                    {selected.assignedTo?.name || "Not yet assigned"}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Submitted</span>
                  <strong>
                    {new Date(selected.createdAt).toLocaleString("en-IN")}
                  </strong>
                </div>
                {selected.resolvedAt && (
                  <div className="assign-row">
                    <span>Resolved At</span>
                    <strong>
                      {new Date(selected.resolvedAt).toLocaleString("en-IN")}
                    </strong>
                  </div>
                )}
              </div>

              {/* ── Description ── */}
              <h4 className="assign-section-title">Description</h4>
              <p style={{
                fontSize:   "14px",
                lineHeight: "1.6",
                margin:     "0 0 1rem",
                color:      "#334155",
              }}>
                {selected.description}
              </p>

              {/* ── Rejection Reason ── */}
              {selected.status === "rejected" &&
                selected.rejectionReason && (
                  <>
                    <h4 className="assign-section-title">Rejection Reason</h4>
                    <p style={{
                      color:        "#dc2626",
                      fontSize:     "14px",
                      background:   "#fef2f2",
                      padding:      "0.75rem 1rem",
                      borderRadius: "8px",
                      borderLeft:   "3px solid #ef4444",
                      margin:       "0 0 1rem",
                    }}>
                      {selected.rejectionReason}
                    </p>
                  </>
                )}

              {/* ── Attachments ── */}
              {selected.attachments && selected.attachments.length > 0 && (
                <>
                  <h4 className="assign-section-title">
                    Attachments ({selected.attachments.length})
                  </h4>
                  <div style={{
                    display:             "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    gap:                 "0.75rem",
                    marginTop:           "0.5rem",
                  }}>
                    {selected.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none" }}
                      >
                        <div
                          style={{
                            border:       "1px solid #e2e8f0",
                            borderRadius: "10px",
                            overflow:     "hidden",
                            background:   "#f8fafc",
                            transition:   "box-shadow 0.15s",
                            cursor:       "pointer",
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
                              width:     "100%",
                              height:    "90px",
                              objectFit: "cover",
                              display:   "block",
                            }}
                          />
                          <div style={{
                            padding:       "0.4rem 0.5rem",
                            display:       "flex",
                            flexDirection: "column",
                            gap:           "2px",
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
                                {formatSize(att.size)}
                              </span>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* ── Status timeline ── */}
              <div style={{
                marginTop:    "1.5rem",
                padding:      "1rem",
                background:   "#f8fafc",
                borderRadius: "10px",
                border:       "1px solid #e2e8f0",
              }}>
                <h4 style={{
                  margin:     "0 0 0.75rem",
                  fontSize:   "0.8rem",
                  fontWeight: "700",
                  color:      "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  Complaint Status
                </h4>

                <div style={{
                  display:   "flex",
                  gap:       "0.5rem",
                  alignItems: "center",
                  flexWrap:  "wrap",
                }}>
                  {[
                    { key: "pending",     label: "Submitted", icon: "bx-plus-circle",  color: "#6366f1" },
                    { key: "in-progress", label: "In Progress",icon: "bx-loader-alt",  color: "#3b82f6" },
                    { key: "resolved",    label: "Resolved",  icon: "bx-check-circle", color: "#10b981" },
                    { key: "rejected",    label: "Rejected",  icon: "bx-x-circle",     color: "#ef4444" },
                  ].map((step, idx, arr) => {
                    const statusOrder = {
                      pending: 0, "in-progress": 1, resolved: 2, rejected: 2,
                    };
                    const currentOrder = statusOrder[selected.status] ?? 0;
                    const stepOrder    = statusOrder[step.key]        ?? 0;

                    const isRejected   = selected.status === "rejected";
                    const isResolved   = selected.status === "resolved";

                    // Skip resolved step if rejected, skip rejected step if resolved
                    if (isRejected && step.key === "resolved")  return null;
                    if (isResolved && step.key === "rejected")  return null;

                    const isDone    = stepOrder < currentOrder ||
                      (step.key === selected.status);
                    const isCurrent = step.key === selected.status;

                    return (
                      <React.Fragment key={step.key}>
                        <div style={{
                          display:    "flex",
                          alignItems: "center",
                          gap:        "6px",
                          padding:    "6px 10px",
                          borderRadius: "20px",
                          background: isCurrent
                            ? `${step.color}18`
                            : isDone
                              ? "#f0fdf4"
                              : "#f1f5f9",
                          border: isCurrent
                            ? `1.5px solid ${step.color}`
                            : isDone
                              ? "1.5px solid #bbf7d0"
                              : "1.5px solid #e2e8f0",
                        }}>
                          <i
                            className={`bx ${isCurrent ? step.icon : isDone ? "bx-check" : step.icon}`}
                            style={{
                              color:    isCurrent ? step.color : isDone ? "#10b981" : "#cbd5e1",
                              fontSize: "14px",
                            }}
                          />
                          <span style={{
                            fontSize:   "0.75rem",
                            fontWeight: isCurrent ? "700" : "500",
                            color:      isCurrent ? step.color : isDone ? "#16a34a" : "#94a3b8",
                          }}>
                            {step.label}
                          </span>
                        </div>

                        {/* Connector arrow — skip after last item */}
                        {idx < arr.filter((s) =>
                          !(isRejected && s.key === "resolved") &&
                          !(isResolved && s.key === "rejected")
                        ).length - 1 && (
                          <i
                            className="bx bx-chevron-right"
                            style={{
                              color:    "#cbd5e1",
                              fontSize: "16px",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MyComplaints;