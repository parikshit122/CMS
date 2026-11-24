import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchAssignedComplaints,
  updateComplaintStatus,
  clearUpdateState,
} from "../../redux/complaintSlice";

import AssignedComplaintsTable from "../../components/staff/AssignedComplaintsTable";
import ComplaintActionModal from "../../components/staff/ComplaintActionModal";
import { useToast } from "../../components/common/Alert";

import "../../styles/StaffDashboard.css";

const StaffComplaints = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  const {
    assigned,
    loading,
    updateLoading,
    updateError,
    updateSuccess,
  } = useSelector((state) => state.complaints);

  const [selectedComplaint, setSelectedComplaint] = useState(null);
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
      toast.success("Complaint status updated successfully.", {
        title: "Status Updated",
      });
      dispatch(clearUpdateState());
      dispatch(fetchAssignedComplaints());
    }
  }, [updateSuccess, dispatch, toast]);

  useEffect(() => {
    if (updateError) {
      toast.error(updateError, { title: "Update Failed" });
    }
  }, [updateError, toast]);

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
            onClick={() => {
              dispatch(fetchAssignedComplaints());
              toast.info("Refreshing assigned complaints...", { duration: 2200 });
            }}
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