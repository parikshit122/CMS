import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchAssignedComplaints,
  fetchStaffStats,
  updateComplaintStatus,
  clearUpdateState,
} from "../../redux/complaintSlice";

import StaffStatCards from "../../components/staff/StaffStatCards";
import StaffChartsRow from "../../components/staff/StaffChartsRow";
import StaffComplaintTimeline from "../../components/staff/StaffComplaintTimeline";
import ComplaintActionModal from "../../components/staff/ComplaintActionModal";
import { useToast } from "../../components/common/Alert";

import "../../styles/StaffDashboard.css";

const StaffDashboard = () => {
  const dispatch = useDispatch();
  const toast = useToast();

  const {
    assigned,
    loading,
    stats,
    statsLoading,
    updateLoading,
    updateError,
    updateSuccess,
  } = useSelector((state) => state.complaints);

  const [minLoadDone, setMinLoadDone] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);

  useEffect(() => {
    dispatch(fetchAssignedComplaints());
    dispatch(fetchStaffStats());
    const t = setTimeout(() => setMinLoadDone(true), 600);
    return () => clearTimeout(t);
  }, [dispatch]);

  useEffect(() => {
    if (updateSuccess) {
      setSelectedComplaint(null);
      toast.success("Complaint status updated and logged to timeline.", {
        title: "Status Updated",
      });
      dispatch(clearUpdateState());
      dispatch(fetchAssignedComplaints());
      dispatch(fetchStaffStats());
      setTimelineRefreshKey((k) => k + 1);
    }
  }, [updateSuccess, dispatch, toast]);

  useEffect(() => {
    if (updateError) {
      toast.error(updateError, { title: "Update Failed" });
    }
  }, [updateError, toast]);

  const handleOpenActionModal = useCallback(
    (complaint) => {
      dispatch(clearUpdateState());
      setSelectedComplaint(complaint);
    },
    [dispatch]
  );

  const handleCloseModal = useCallback(() => {
    dispatch(clearUpdateState());
    setSelectedComplaint(null);
  }, [dispatch]);

  const handleUpdateStatus = useCallback(
    (payload) => {
      dispatch(updateComplaintStatus(payload));
    },
    [dispatch]
  );

  const isLoading = statsLoading || !minLoadDone;

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
          <h1 className="ssd-page__title">My Dashboard</h1>
          <p className="ssd-page__sub">
            Overview of your assigned complaints, analytics, and resolution timeline
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
              setTimelineRefreshKey((k) => k + 1);
              toast.info("Refreshing dashboard metrics and timelines...", {
                duration: 2200,
              });
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
        <StaffStatCards stats={stats} loading={isLoading} />
      </div>

      <div className="ssd-section">
        <div className="ssd-section__label">
          <i className="bx bx-line-chart" />
          Analytics
        </div>
        <StaffChartsRow stats={stats} loading={isLoading} />
      </div>

      <div className="ssd-section">
        <div className="ssd-section__label">
          <i className="bx bx-history" />
          Complaint Progression Timeline
        </div>
        <StaffComplaintTimeline
          complaints={assigned}
          loading={loading || !minLoadDone}
          refreshKey={timelineRefreshKey}
          onOpenActionModal={handleOpenActionModal}
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