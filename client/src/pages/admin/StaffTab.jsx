import React, { useState, useMemo } from "react";
import API from "../../services/api";
import { useAlert } from "../../components/common/Alert";

const CATEGORIES = [
  "infrastructure",
  "cleanliness",
  "electrical",
  "plumbing",
  "safety",
  "it",
  "academic",
  "other",
];

const StaffTab = ({ staff, loading, onDelete, onRefresh }) => {
  const alert = useAlert();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", category: "" });
  const [saving, setSaving] = useState(false);

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

  const openEdit = (s) => {
    setEditTarget(s);
    setForm({
      name: s.name || "",
      phone: s.phone || "",
      category: s.category || "",
    });
  };

  const handleUpdate = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.category) {
      alert.error("All fields required");
      return;
    }

    if (!/^[0-9]{10}$/.test(form.phone)) {
      alert.error("Phone must be 10 digits");
      return;
    }

    setSaving(true);
    try {
      const res = await API.patch(`/admin/users/staff/${editTarget._id}`, form);
      if (res.data.success) {
        alert.success("Staff updated successfully");
        setEditTarget(null);
        onRefresh();
      }
    } catch (err) {
      alert.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

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
                <th>Phone</th>
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
                  <td>{s.phone || "—"}</td>
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
                        className="users-action-btn users-action-btn--green"
                        onClick={() => openEdit(s)}
                        title="Edit"
                      >
                        <i className="bx bx-edit"></i>
                        Edit
                      </button>
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
                  <td colSpan={8} className="users-table-empty">
                    <i className="bx bx-user-x"></i>
                    <p>No staff found. Click "Add Staff" to create one.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {editTarget && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="bx bx-edit"></i>
                Edit Staff
              </h3>
              <button
                className="modal-close"
                onClick={() => setEditTarget(null)}
              >
                <i className="bx bx-x"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row">
                <label>Full Name</label>
                <input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <label>Phone (10 digits)</label>
                <input
                  value={form.phone}
                  maxLength={10}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </div>

              <div className="form-row">
                <label>Specialization Category</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                >
                  <option value="">Select Category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button
                  className="users-btn users-btn--outline"
                  onClick={() => setEditTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="users-btn users-btn--primary"
                  onClick={handleUpdate}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Update Staff"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTab;