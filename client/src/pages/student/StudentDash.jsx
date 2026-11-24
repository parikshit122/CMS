import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { motion } from "framer-motion";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/common/StatCard";
import SpatialCard from "../../components/layout/SpatialCard";
import "../../styles/StudentDash.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function StudentDash() {
  const { user } = useAuth();
  const userName = user?.name || "Student";

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const response = await API.get("/complaints/my");
        if (response.data.success) {
          setComplaints(response.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  if (loading) return <div className="student-dash-loading">Loading your dashboard...</div>;

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "pending").length;
  const inProgress = complaints.filter((c) => c.status === "in-progress").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;

  const sharePct = (count) => (total > 0 ? Math.round((count / total) * 100) : undefined);

  const stats = [
    {
      title: "My Total Submissions",
      value: total,
      context: total === 1 ? "1 lifetime ticket" : "lifetime tickets",
      isFeatured: true,
    },
    {
      title: "Pending Review",
      value: pending,
      trend: "down",
      trendValue: sharePct(pending),
      context: total > 0 ? "of total in queue" : "awaiting review",
      isFeatured: false,
    },
    {
      title: "In Resolution",
      value: inProgress,
      trend: "up",
      trendValue: sharePct(inProgress),
      context: total > 0 ? "assigned to staff" : "in progress",
      isFeatured: false,
    },
    {
      title: "Resolved Issues",
      value: resolved,
      trend: "up",
      trendValue: sharePct(resolved),
      context: total > 0 ? "resolution rate" : "closed tickets",
      isFeatured: true,
    },
  ];

  const trendMap = {};
  complaints.forEach((c) => {
    const month = new Date(c.createdAt).toLocaleString("default", { month: "short" });
    trendMap[month] = (trendMap[month] || 0) + 1;
  });

  const trendData = Object.keys(trendMap).map((month) => ({ month, value: trendMap[month] }));

  const categoryMap = {};
  complaints.forEach((c) => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
  });

  const colors = ["#f97316", "#e11d48", "#fbbf24", "#10b981", "#3b82f6"];

  const categoryData = Object.keys(categoryMap).map((key, index) => ({
    name: key,
    value: categoryMap[key],
    color: colors[index % colors.length],
  }));

  return (
    <motion.div
      className="student-container-bento"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="student-header-row">
        <div>
          <h1 className="bento-title">Welcome back, {userName}</h1>
          <p className="bento-subtitle">Track, submit, and monitor your campus resolution requests</p>
        </div>

        <Link to="/submit" className="submit-neon-btn">
          <Plus size={18} aria-hidden="true" /> Submit New Complaint
        </Link>
      </div>

      <div className="kpi-bento-grid">
        {stats.map((item, index) => (
          <StatCard key={index} {...item} />
        ))}
      </div>

      <SpatialCard>
        <div className="student-activity-card">
          <div className="student-activity-head">
            <h3 className="student-activity-title">Recent Activity</h3>
            {complaints.length > 0 && (
              <Link to="/complaints" className="student-activity-link">
                View all ({complaints.length})
              </Link>
            )}
          </div>
          <div className="student-activity-list">
            {complaints.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: 0 }}>
                No complaints submitted yet. Click &ldquo;Submit New Complaint&rdquo; to file your first request.
              </p>
            ) : (
              complaints.slice(0, 3).map((c) => (
                <Link key={c._id} to="/complaints" className="student-activity-item">
                  <div className="student-activity-item__left">
                    <div className="student-activity-item__icon">
                      <FileText size={20} aria-hidden="true" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="student-activity-item__name">{c.title}</div>
                      <div className="student-activity-item__meta">
                        {c.complaintId || `#${c._id?.slice(-6)}`} · {c.category} ·{" "}
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : ""}
                      </div>
                    </div>
                  </div>
                  <span className="student-activity-item__status">{c.status}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </SpatialCard>

      <div className="charts-bento-grid">
        <SpatialCard className="chart-bento-card">
          <div className="chart-glow-container">
            <h3 className="student-chart-title">Complaint Activity History</h3>
            <p className="student-chart-sub">Monthly submission breakdown</p>
            {trendData.length === 0 ? (
              <div className="student-chart-empty">
                <p>Monthly trends will appear here once you submit your first complaint.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} />
                  <YAxis stroke="var(--text-muted)" tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                      color: "var(--text-primary)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#f97316" }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SpatialCard>

        <SpatialCard className="chart-bento-card">
          <div className="chart-glow-container">
            <h3 className="student-chart-title">Issues by Category</h3>
            <p className="student-chart-sub">Category breakdown ratio</p>
            {categoryData.length === 0 ? (
              <div className="student-chart-empty">
                <p>Category breakdown will update automatically as your tickets are logged.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={90}
                    stroke="none"
                  >
                    {categoryData.map((item, index) => (
                      <Cell key={index} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "12px",
                      color: "var(--text-primary)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </SpatialCard>
      </div>
    </motion.div>
  );
}
