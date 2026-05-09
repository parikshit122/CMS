import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAllComplaints } from "../../redux/complaintSlice";
import StatusBadge from "../../components/complaint/StatusBadge";
import AssignStaffModal from "../../components/admin/AssignStaffModal";
import { useAlert } from "../../components/common/Alert";
import { exportSinglePDF, exportBulkPDF } from "../../utils/pdfExport";
import "../../styles/AdminReports.css";

const AdminReports = () => {
  const dispatch = useDispatch();
  const alert = useAlert();

  const { all: complaints, loading, error } = useSelector(
    (state) => state.complaints
  );

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [category, setCategory] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [assignTarget, setAssignTarget] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const perPage = 10;

  useEffect(() => {
    dispatch(fetchAllComplaints());
  }, [dispatch]);

  const categories = useMemo(() => {
    const set = new Set(
      (complaints || []).map((c) => c.category).filter(Boolean)
    );
    return ["all", ...Array.from(set)];
  }, [complaints]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const now = new Date();

    return (complaints || [])
      .filter((c) => {
        const matchesQuery =
          !query ||
          (c.title || "").toLowerCase().includes(query) ||
          (c.description || "").toLowerCase().includes(query) ||
          (c._id || "").toLowerCase().includes(query) ||
          (c.complaintId || "").toLowerCase().includes(query) ||
          (c.student?.name || "").toLowerCase().includes(query) ||
          (c.student?.email || "").toLowerCase().includes(query) ||
          (c.assignedTo?.name || "").toLowerCase().includes(query);

        const matchesStatus = status === "all" || c.status === status;
        const matchesPriority = priority === "all" || c.priority === priority;
        const matchesCategory = category === "all" || c.category === category;

        let matchesDate = true;

        if (fromDate) {
          const from = new Date(fromDate);
          if (new Date(c.createdAt) < from) matchesDate = false;
        }

        if (toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          if (new Date(c.createdAt) > to) matchesDate = false;
        }

        if (dateRange !== "all") {
          const created = new Date(c.createdAt);
          const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
          if (dateRange === "today") matchesDate = diffDays === 0;
          else if (dateRange === "week") matchesDate = diffDays <= 7;
          else if (dateRange === "month") matchesDate = diffDays <= 30;
          else if (dateRange === "quarter") matchesDate = diffDays <= 90;
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
        if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === "priority") {
          const order = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
        }
        return 0;
      });
  }, [complaints, q, status, priority, category, dateRange, fromDate, toDate, sortBy]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [q, status, priority, category, dateRange, fromDate, toDate, sortBy]);

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, "in-progress": 0, resolved: 0, rejected: 0 };
    (complaints || []).forEach((c) => {
      if (counts[c.status] !== undefined) counts[c.status]++;
    });
    return counts;
  }, [complaints]);

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

  const hasActiveFilters =
    q ||
    status !== "all" ||
    priority !== "all" ||
    category !== "all" ||
    dateRange !== "all" ||
    fromDate ||
    toDate;

  const handleAssigned = (updatedComplaint) => {
    alert.success(
      `Complaint ${updatedComplaint.complaintId || ""} assigned successfully`
    );
    setAssignTarget(null);
    dispatch(fetchAllComplaints());
  };

  const handleBulkPDF = async () => {
    if (!filtered.length) {
      alert.error("No complaints to export");
      return;
    }

    if (filtered.length > 10 && (!fromDate || !toDate)) {
      alert.error(
        "Select From Date and To Date for large exports (more than 10 complaints)"
      );
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

  const getPriorityClass = (p) => {
    const map = {
      urgent: "priority-urgent",
      high: "priority-high",
      medium: "priority-medium",
      low: "priority-low",
    };
    return map[p] || "";
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div className="reports-header__left">
          <span className="reports-header__eyebrow">
            <i className="bx bx-bar-chart-alt-2"></i>
            Admin Portal
          </span>
          <h1 className="reports-header__title">Reports</h1>
          <p className="reports-header__sub">
            View, filter, and export all submitted complaints
          </p>
        </div>

        <div className="reports-header__right">
          <button
            className="reports-btn reports-btn--outline"
            onClick={() => dispatch(fetchAllComplaints())}
          >
            <i className="bx bx-refresh"></i>
            Refresh
          </button>

          <button
            className="reports-btn reports-btn--primary"
            onClick={handleBulkPDF}
            disabled={!filtered.length || pdfLoading}
          >
            {pdfLoading ? (
              <>
                <i className="bx bx-loader-alt bx-spin"></i>
                Generating...
              </>
            ) : (
              <>
                <i className="bx bxs-file-pdf"></i>
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div className="reports-summary">
        <div className="reports-summary__card">
          <i className="bx bx-list-ul"></i>
          <div>
            <span>{complaints?.length || 0}</span>
            <p>Total</p>
          </div>
        </div>
        <div className="reports-summary__card reports-summary__card--pending">
          <i className="bx bx-time-five"></i>
          <div>
            <span>{statusCounts.pending}</span>
            <p>Pending</p>
          </div>
        </div>
        <div className="reports-summary__card reports-summary__card--progress">
          <i className="bx bx-loader-alt"></i>
          <div>
            <span>{statusCounts["in-progress"]}</span>
            <p>In Progress</p>
          </div>
        </div>
        <div className="reports-summary__card reports-summary__card--resolved">
          <i className="bx bx-check-circle"></i>
          <div>
            <span>{statusCounts.resolved}</span>
            <p>Resolved</p>
          </div>
        </div>
        <div className="reports-summary__card reports-summary__card--rejected">
          <i className="bx bx-x-circle"></i>
          <div>
            <span>{statusCounts.rejected}</span>
            <p>Rejected</p>
          </div>
        </div>
      </div>

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
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="reports-date-input"
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
            <button className="reports-btn reports-btn--clear" onClick={clearFilters}>
              <i className="bx bx-x"></i>
              Clear
            </button>
          )}
        </div>

        <div className="reports-filters__info">
          Showing {paginated.length} of {filtered.length} complaints
        </div>
      </div>

      {loading && (
        <div className="reports-loader">
          <div className="reports-spinner"></div>
          <p>Loading complaints...</p>
        </div>
      )}

      {!loading && error && (
        <div className="reports-error">
          <i className="bx bx-error-circle"></i>
          {String(error)}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Complaint ID</th>
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
                    <td className="reports-table__id">
                      {c.complaintId || `#${c._id?.slice(-6)}`}
                    </td>
                    <td className="reports-table__complaint">
                      <div className="reports-table__title">{c.title}</div>
                      {c.location && (
                        <div className="reports-table__location">
                          <i className="bx bx-map"></i>
                          {c.location}
                        </div>
                      )}
                    </td>
                    <td>{c.category || "-"}</td>
                    <td>
                      <span className={`reports-priority ${getPriorityClass(c.priority)}`}>
                        {c.priority || "-"}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="reports-table__student">
                      <div className="reports-table__student-name">
                        {c.student?.name || "Unknown"}
                      </div>
                      <div className="reports-table__student-email">
                        {c.student?.email || ""}
                      </div>
                    </td>
                    <td>{c.assignedTo?.name || "-"}</td>
                    <td className="reports-table__date">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td>
                      <div className="reports-table__actions">
                        <button
                          className="reports-action-btn reports-action-btn--pdf"
                          onClick={() => handleSinglePDF(c)}
                          disabled={pdfLoading}
                          title="Download PDF"
                        >
                          <i className="bx bxs-file-pdf"></i>
                        </button>

                        {c.status === "pending" && !c.assignedTo ? (
                          <button
                            className="reports-action-btn reports-action-btn--assign"
                            onClick={() => setAssignTarget(c)}
                            title="Assign staff"
                          >
                            <i className="bx bx-user-plus"></i>
                            Assign
                          </button>
                        ) : (
                          <span className="reports-table__assigned-text">
                            {c.assignedTo ? "Assigned" : "—"}
                          </span>
                        )}
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

          {totalPages > 1 && (
            <div className="reports-pagination">
              <button
                className="reports-pagination__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <i className="bx bx-chevron-left"></i>
                Previous
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
                Next
                <i className="bx bx-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {assignTarget && (
        <AssignStaffModal
          complaint={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
};

export default AdminReports;