import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText } from "lucide-react";
import { motion } from "framer-motion";
import API from "../../services/api";
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
  const user = JSON.parse(localStorage.getItem("user") || "{}");
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

  if (loading) return <div style={{ color: "#fff", padding: "40px" }}>Loading 3D Telemetry...</div>;

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "pending").length;
  const inProgress = complaints.filter((c) => c.status === "in-progress").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;

  const stats = [
    { title: "My Total Submissions", value: total, trend: "up", trendValue: "100", context: "lifetime tickets", isFeatured: true },
    { title: "Pending Review", value: pending, trend: "down", trendValue: "12", context: "in queue", isFeatured: false },
    { title: "In Resolution", value: inProgress, trend: "up", trendValue: "45", context: "assigned to staff", isFeatured: false },
    { title: "Resolved Issues", value: resolved, trend: "up", trendValue: "88", context: "closed tickets", isFeatured: true },
  ];

  const trendMap = {};
  complaints.forEach((c) => {
    const month = new Date(c.createdAt).toLocaleString("default", { month: "short" });
    trendMap[month] = (trendMap[month] || 0) + 1;
  });

  const trendData = Object.keys(trendMap).length
    ? Object.keys(trendMap).map((month) => ({ month, value: trendMap[month] }))
    : [
        { month: "Jan", value: 2 },
        { month: "Feb", value: 5 },
        { month: "Mar", value: 3 },
        { month: "Apr", value: 7 },
      ];

  const categoryMap = {};
  complaints.forEach((c) => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
  });

  const colors = ["#f59e0b", "#e11d48", "#fcd34d", "#fbbf24", "#d97706"];

  const categoryData = Object.keys(categoryMap).length
    ? Object.keys(categoryMap).map((key, index) => ({
        name: key,
        value: categoryMap[key],
        color: colors[index % colors.length],
      }))
    : [
        { name: "IT", value: 4, color: "#f59e0b" },
        { name: "Hostel", value: 3, color: "#e11d48" },
        { name: "Academic", value: 2, color: "#fcd34d" },
      ];

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
          <Plus size={18} /> Submit New Complaint
        </Link>
      </div>

      <div className="kpi-bento-grid">
        {stats.map((item, index) => (
          <StatCard key={index} {...item} />
        ))}
        <SpatialCard className="col-span-12">
          <div style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#fff", marginBottom: "20px" }}>
              Recent Activity
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[1, 2, 3].map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(249, 115, 22, 0.1)", color: "var(--neon-orange)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <FileText size={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SpatialCard>
      </div>

      <div className="charts-bento-grid">
        <SpatialCard className="chart-bento-card">
          <div className="chart-glow-container">
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
              Complaint Activity History
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              Monthly submission breakdown
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} />
                <YAxis stroke="var(--text-muted)" tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(10, 14, 26, 0.9)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#f59e0b" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SpatialCard>

        <SpatialCard className="chart-bento-card">
          <div className="chart-glow-container">
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
              Issues by Category
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              Category breakdown ratio
            </p>
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
                    background: "rgba(20, 20, 28, 0.9)",
                    border: "1px solid rgba(249, 115, 22, 0.3)",
                    borderRadius: "12px",
                    color: "#fff",
                    boxShadow: "0 0 15px rgba(249, 115, 22, 0.2)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SpatialCard>
      </div>
    </motion.div>
  );
}
