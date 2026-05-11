import React, { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import StatusBadge from "../../components/complaint/StatusBadge";
import { useAlert } from "../../components/common/Alert";
import "../../styles/AdminReports.css";

const MyComplaints = () => {
  const alert = useAlert();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState(null);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await API.get("/complaints/my");
      if (res.data.success) {
        setComplaints(res.data.data);
      }
    } catch {
      alert.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return complaints
      .filter((c) => {
        const matchesSearch =
          !q ||
          c.title?.toLowerCase().includes(q) ||
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

  return (
    <div className="reports-page">
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
                    <span
                      className={`reports-priority priority-${c.priority || "low"}`}
                    >
                      {c.priority || "-"}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td>{c.assignedTo?.name || "—"}</td>
                  <td className="reports-table__date">
                    {new Date(c.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
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

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div
            className="modal-content modal-content--wide"
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="modal-body">
              <div className="assign-complaint-info">
                <div className="assign-row">
                  <span>Reference</span>
                  <strong>{selected.complaintId || selected._id}</strong>
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
                  <strong className={`assign-priority assign-priority--${selected.priority}`}>
                    {selected.priority}
                  </strong>
                </div>
                <div className="assign-row">
                  <span>Status</span>
                  <strong><StatusBadge status={selected.status} /></strong>
                </div>
                <div className="assign-row">
                  <span>Assigned Staff</span>
                  <strong>{selected.assignedTo?.name || "Not yet assigned"}</strong>
                </div>
              </div>

              <h4 className="assign-section-title">Description</h4>
              <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
                {selected.description}
              </p>

              {selected.status === "rejected" && selected.rejectionReason && (
                <>
                  <h4 className="assign-section-title">Rejection Reason</h4>
                  <p style={{ color: "var(--danger-color)" }}>
                    {selected.rejectionReason}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyComplaints;