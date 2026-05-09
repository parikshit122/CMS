import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchAssignedComplaints,
  fetchStaffStats,
} from "../../redux/complaintSlice";

import StaffStatCards from "../../components/staff/StaffStatCards";
import StaffChartsRow from "../../components/staff/StaffChartsRow";

import "../../styles/StaffDashboard.css";

const StaffDashboard = () => {
  const dispatch = useDispatch();

  const { stats, statsLoading } = useSelector((state) => state.complaints);

  const [minLoadDone, setMinLoadDone] = useState(false);

  useEffect(() => {
    dispatch(fetchAssignedComplaints());
    dispatch(fetchStaffStats());
    const t = setTimeout(() => setMinLoadDone(true), 800);
    return () => clearTimeout(t);
  }, [dispatch]);

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
            Overview of your assigned complaints and performance
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
        <StaffStatCards stats={stats} loading={isLoading} />
      </div>

      <div className="ssd-section">
        <div className="ssd-section__label">
          <i className="bx bx-line-chart" />
          Analytics
        </div>
        <StaffChartsRow stats={stats} loading={isLoading} />
      </div>
    </div>
  );
};

export default StaffDashboard;