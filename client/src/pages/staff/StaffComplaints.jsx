import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchAssignedComplaints,
  updateComplaintStatus,
  clearUpdateState,
} from "../../redux/complaintSlice";

import AssignedComplaintsTable from "../../components/staff/AssignedComplaintsTable";
import ComplaintActionModal from "../../components/staff/ComplaintActionModal";

import "../../styles/StaffDashboard.css";

const StaffComplaints = () => {
  const dispatch = useDispatch();

  const {
    assigned,
    loading,
    updateLoading,
    updateError,
    updateSuccess,
  } = useSelector((state) => state.complaints);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [successToast, setSuccessToast] = useState(false);
  const [minLoadDone, setMinLoadDone] = useState(false);

  useEffect(() => {
    dispatch(fetchAssignedComplaints());
    const t = setTimeout(() => setMinLoadDone(true), 800);
    return () => clearTimeout(t);
  }, [dispatch]);

  const isLoading = loading || !minLoadDone;

  useEffect(() => {
    if (updateSuccess) {
      setSelectedComplaint(null);
      setSuccessToast(true);
      dispatch(clearUpdateState());
      dispatch(fetchAssignedComplaints());
    }
  }, [updateSuccess, dispatch]);

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(false), 3500);
    return () => clearTimeout(t);
  }, [successToast]);

  const handleSelectComplaint = useCallback((complaint) => {
    dispatch(clearUpdateState());
    setSelectedComplaint(complaint);
  }, [dispatch]);

  const handleCloseModal = useCallback(() => {
    dispatch(clearUpdateState());
    setSelectedComplaint(null);
  }, [dispatch]);

  const handleUpdateStatus = useCallback((payload) => {
    dispatch(updateComplaintStatus(payload));
  }, [dispatch]);

  const now = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="ssd-page">

      {successToast && (
        <div className="ssd-toast ssd-toast--success">
          <i className="bx bx-check-circle" />
          Complaint status updated successfully!
        </div>
      )}

      <div className="ssd-page__header">
        <div className="ssd-page__header-left">
          <span className="ssd-page__eyebrow">
            <i className="bx bx-shield-quarter" />
            Staff Portal
          </span>
          <h1 className="ssd-page__title">Assigned Complaints</h1>
          <p className="ssd-page__sub">
            View and update all complaints assigned to you
          </p>
        </div>

        <div className="ssd-page__header-right">
          <div className="ssd-page__meta-box">
            <div className="ssd-page__meta-item">
              <i className="bx bx-time-five" />
              <span>Last updated</span>
            </div>
            <strong className="ssd-page__meta-time">{now}</strong>
          </div>
          <button
            className="ssd-refresh-btn"
            onClick={() => dispatch(fetchAssignedComplaints())}
            title="Refresh complaints"
          >
            <i className="bx bx-refresh" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="ssd-section">
        <div className="ssd-section__label">
          <i className="bx bx-task" />
          All Assigned
        </div>
        <AssignedComplaintsTable
          complaints={assigned}
          loading={isLoading}
          onSelectComplaint={handleSelectComplaint}
        />
      </div>

      {selectedComplaint && (
        <ComplaintActionModal
          complaint={selectedComplaint}
          onClose={handleCloseModal}
          onUpdateStatus={handleUpdateStatus}
          updateLoading={updateLoading}
          updateError={updateError}
        />
      )}
    </div>
  );
};

export default StaffComplaints;