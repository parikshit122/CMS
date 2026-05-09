import React, { useState, useEffect } from "react";
import API from "../../services/api";

const AssignStaffModal = ({ complaint, onClose, onAssigned }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoading(true);
        const res = await API.get(
          `/admin/staff/by-category/${complaint.category}`
        );
        if (res.data.success) {
          setStaffList(res.data.data);
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load staff"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, [complaint.category]);

  const handleAssign = async () => {
    if (!selectedStaff || submitting) return;

    setSubmitting(true);
    try {
      const res = await API.patch(
        `/admin/complaints/${complaint._id}/assign`,
        { staffId: selectedStaff._id }
      );
      if (res.data.success) {
        onAssigned(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign staff");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="bx bx-user-check"></i>
            Assign Staff
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="bx bx-x"></i>
          </button>
        </div>

        <div className="modal-body">
          <div className="assign-complaint-info">
            <div className="assign-row">
              <span>Complaint ID</span>
              <strong>{complaint.complaintId || `#${complaint._id?.slice(-6)}`}</strong>
            </div>
            <div className="assign-row">
              <span>Title</span>
              <strong>{complaint.title}</strong>
            </div>
            <div className="assign-row">
              <span>Category</span>
              <strong className="assign-category-badge">
                {complaint.category}
              </strong>
            </div>
            <div className="assign-row">
              <span>Priority</span>
              <strong className={`assign-priority assign-priority--${complaint.priority}`}>
                {complaint.priority}
              </strong>
            </div>
          </div>

          <h4 className="assign-section-title">
            Available {complaint.category} Staff ({staffList.length})
          </h4>

          {loading && (
            <div className="assign-loader">
              <div className="users-spinner"></div>
              <p>Loading staff...</p>
            </div>
          )}

          {!loading && error && (
            <div className="assign-error">
              <i className="bx bx-error-circle"></i>
              {error}
            </div>
          )}

          {!loading && !error && staffList.length === 0 && (
            <div className="assign-empty">
              <i className="bx bx-user-x"></i>
              <p>No staff available for "{complaint.category}" category.</p>
              <p className="assign-empty-hint">
                Add staff members with this specialization from the Users page.
              </p>
            </div>
          )}

          {!loading && !error && staffList.length > 0 && (
            <div className="assign-staff-list">
              {staffList.map((staff) => (
                <div
                  key={staff._id}
                  className={`assign-staff-card ${
                    selectedStaff?._id === staff._id ? "selected" : ""
                  }`}
                  onClick={() => setSelectedStaff(staff)}
                >
                  <div className="assign-staff-avatar">
                    {staff.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="assign-staff-info">
                    <div className="assign-staff-name">{staff.name}</div>
                    <div className="assign-staff-email">{staff.email}</div>
                  </div>
                  <div className="assign-staff-stats">
                    <span className="assign-workload">
                      <i className="bx bx-task"></i>
                      {staff.activeCount || 0} active
                    </span>
                  </div>
                  {selectedStaff?._id === staff._id && (
                    <div className="assign-check">
                      <i className="bx bx-check-circle"></i>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="modal-footer">
            <button
              className="users-btn users-btn--outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              className="users-btn users-btn--primary"
              onClick={handleAssign}
              disabled={!selectedStaff || submitting}
            >
              {submitting ? "Assigning..." : "Assign & Update Status"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignStaffModal;