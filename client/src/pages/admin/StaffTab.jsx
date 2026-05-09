import React, { useState, useMemo } from "react";

const StaffTab = ({ staff, loading, onDelete, onRefresh }) => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = useMemo(() => {
    const set = new Set(staff.map((s) => s.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [staff]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "all" || s.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [staff, search, categoryFilter]);

  return (
    <div className="users-table-card">
      <div className="users-table-toolbar">
        <div className="users-search">
          <i className="bx bx-search"></i>
          <input
            placeholder="Search staff by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All Categories" : c}
            </option>
          ))}
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
                <th>Staff</th>
                <th>Email</th>
                <th>Category</th>
                <th>Assigned</th>
                <th>Resolved</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div className="users-cell-user">
                      <div className="users-avatar users-avatar--staff">
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
                    <span className="users-category-badge">
                      {s.category || "Not set"}
                    </span>
                  </td>
                  <td>
                    <span className="users-count">{s.assignedCount || 0}</span>
                  </td>
                  <td>
                    <span className="users-count users-count--green">
                      {s.resolvedCount || 0}
                    </span>
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
                      <button
                        className="users-action-btn users-action-btn--red"
                        onClick={() => onDelete(s)}
                        title="Delete"
                      >
                        <i className="bx bx-trash"></i>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="users-table-empty">
                    <i className="bx bx-user-x"></i>
                    <p>No staff found. Click "Add Staff" to create one.</p>
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

export default StaffTab;