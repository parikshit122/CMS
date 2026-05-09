import React, { useState, useMemo } from "react";

const StudentsTab = ({ students, loading, onSuspend, onReactivate, onRefresh }) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.course?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [students, search, statusFilter]);

  return (
    <div className="users-table-card">
      <div className="users-table-toolbar">
        <div className="users-search">
          <i className="bx bx-search"></i>
          <input
            placeholder="Search students by name, email, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>

        <button className="users-btn users-btn--outline" onClick={onRefresh}>
          <i className="bx bx-refresh"></i>
          Refresh
        </button>
      </div>

      <div className="users-table-wrap">
        {loading ? (
          <div className="users-loader">
            <div className="users-spinner"></div>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Class</th>
                <th>Complaints</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div className="users-cell-user">
                      <div className="users-avatar">
                        {s.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="users-cell-name">{s.name}</div>
                        <div className="users-cell-id">
                          ID: {s._id?.slice(-6)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="users-cell-email">{s.email}</td>
                  <td>
                    {s.course || s.year ? (
                      <div className="users-class-cell">
                        <div className="users-course">{s.course || "—"}</div>
                        <div className="users-year">{s.year ? `${s.year} Year` : ""}</div>
                      </div>
                    ) : (
                      <span className="users-muted">Not set</span>
                    )}
                  </td>
                  <td>
                    <span className="users-count">{s.totalComplaints || 0}</span>
                  </td>
                  <td>
                    <span className={`users-status users-status--${s.status}`}>
                      <span className="users-status-dot"></span>
                      {s.status}
                    </span>
                    {s.isSuspended && s.suspendedUntil && (
                      <div className="users-suspended-until">
                        Until {new Date(s.suspendedUntil).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="users-cell-date">
                    {new Date(s.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td>
                    <div className="users-actions">
                      {s.isSuspended ? (
                        <button
                          className="users-action-btn users-action-btn--green"
                          onClick={() => onReactivate(s)}
                          title="Reactivate"
                        >
                          <i className="bx bx-check-circle"></i>
                          Reactivate
                        </button>
                      ) : (
                        <button
                          className="users-action-btn users-action-btn--red"
                          onClick={() => onSuspend(s)}
                          title="Suspend"
                        >
                          <i className="bx bx-block"></i>
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="users-table-empty">
                    <i className="bx bx-user-x"></i>
                    <p>No students found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StudentsTab;