import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchAssignedComplaints,
  fetchStaffStats,
  updateComplaintStatus,
  clearUpdateState,
} from "../../redux/complaintSlice";

import StaffStatCards          from "../../components/staff/StaffStatCards";
import StaffChartsRow          from "../../components/staff/StaffChartsRow";
import AssignedComplaintsTable from "../../components/staff/AssignedComplaintsTable";
import ComplaintActionModal    from "../../components/staff/ComplaintActionModal";

import "../../styles/StaffDashboard.css";

const StaffDashboard = () => {
  const dispatch = useDispatch();

  const {
    assigned,
    stats,
    loading,
    statsLoading,
    updateLoading,
    updateError,
    updateSuccess,
  } = useSelector((state) => state.complaints);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [successToast,      setSuccessToast]      = useState(false);

  useEffect(() => {
    dispatch(fetchAssignedComplaints());
    dispatch(fetchStaffStats());
  }, [dispatch]);

  useEffect(() => {
    if (updateSuccess) {
      setSelectedComplaint(null);
      setSuccessToast(true);
      dispatch(clearUpdateState());
      dispatch(fetchAssignedComplaints());
      dispatch(fetchStaffStats());
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
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
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
          <h1 className="ssd-page__title">My Dashboard</h1>
          <p className="ssd-page__sub">
            Manage and resolve your assigned complaints efficiently
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
            onClick={() => {
              dispatch(fetchAssignedComplaints());
              dispatch(fetchStaffStats());
            }}
            title="Refresh data"
          >
            <i className="bx bx-refresh" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="ssd-section">
        <div className="ssd-section__label">
          <i className="bx bx-bar-chart-alt-2" />
          Overview
        </div>
        <StaffStatCards stats={stats} loading={statsLoading} />
      </div>

      <div className="ssd-section">
        <div className="ssd-section__label">
          <i className="bx bx-line-chart" />
          Analytics
        </div>
        <StaffChartsRow stats={stats} loading={statsLoading} />
      </div>

      <div className="ssd-section">
        <div className="ssd-section__label">
          <i className="bx bx-task" />
          Assigned Complaints
        </div>
        <AssignedComplaintsTable
          complaints={assigned}
          loading={loading}
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

export default StaffDashboard;