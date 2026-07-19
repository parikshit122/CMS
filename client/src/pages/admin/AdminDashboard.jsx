import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import API from "../../services/api";
import SpatialCard from "../../components/layout/SpatialCard";
import StatCard from "../../components/common/StatCard";
import "../../styles/AdminDashboard.css";

// Helpers
const calcShareOfTotal = (current, total) => {
  if (!total || total === 0) return { value: 0, type: "none" };
  if (current === 0) return { value: 0, type: "none" };
  const share = (current / total) * 100;
  return { value: Math.round(share * 10) / 10, type: "share" };
};

const formatShare = (trend) => {
  if (trend.type === "none") return "0";
  const absValue = Math.abs(trend.value);
  return `${Number.isInteger(absValue) ? absValue : absValue.toFixed(1)}`;
};

const formatLastUpdated = (value) => {
  if (!value) return "Live";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const CategoryCard = ({ icon, label, value }) => (
  <SpatialCard className="category-bento-card">
    <div style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "rgba(249, 115, 22, 0.1)",
          border: "1px solid rgba(249, 115, 22, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          color: "var(--neon-orange)",
          boxShadow: "0 0 12px rgba(249, 115, 22, 0.2)",
        }}
      >
        <i className={icon} />
      </div>
      <div>
        <h3 style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff" }}>{value}</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          {label?.charAt(0).toUpperCase() + label?.slice(1)}
        </p>
      </div>
    </div>
  </SpatialCard>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pending: 0,
    resolved: 0,
    inProgress: 0,
    avgResponseTime: 0,
    weeklyData: [],
    monthlyData: [],
    categoryBreakdown: [],
    trendMeta: {},
    lastUpdated: null,
  });

  const [loading, setLoading] = useState(true);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const res = await API.get("/complaints/stats/admin");
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const metricCards = useMemo(() => {
    const meta = stats.trendMeta || {};
    const total = stats.totalComplaints || 0;
    const totalPending = stats.pending || 0;
    const totalResolved = stats.resolved || 0;

    const totalCurrent = meta.totalComplaints?.current || 0;
    const pendingCurrent = meta.pending?.current || 0;
    const resolvedCurrent = meta.resolved?.current || 0;

    const totalShare = calcShareOfTotal(totalCurrent, total);
    const pendingShare = calcShareOfTotal(pendingCurrent, totalPending);
    const resolvedShare = calcShareOfTotal(resolvedCurrent, totalResolved);

    return [
      {
        title: "Total System Complaints",
        value: total,
        trend: "up",
        trendValue: formatShare(totalShare),
        context: "added this month",
        isFeatured: true,
      },
      {
        title: "Pending Review",
        value: totalPending,
        trend: "down",
        trendValue: formatShare(pendingShare),
        context: "new pending",
        isFeatured: false,
      },
      {
        title: "Resolved Tickets",
        value: totalResolved,
        trend: "up",
        trendValue: formatShare(resolvedShare),
        context: "resolved successfully",
        isFeatured: true,
      },
      {
        title: "Avg Resolution Velocity",
        value: stats.avgResponseTime || 0,
        trend: "up",
        trendValue: "98.4",
        context: "hours turnaround",
        isFeatured: false,
      },
    ];
  }, [stats]);

  const weeklyData = stats.weeklyData?.length
    ? stats.weeklyData
    : [
        { day: "Mon", submitted: 12, resolved: 8 },
        { day: "Tue", submitted: 19, resolved: 14 },
        { day: "Wed", submitted: 15, resolved: 12 },
        { day: "Thu", submitted: 22, resolved: 18 },
        { day: "Fri", submitted: 28, resolved: 24 },
        { day: "Sat", submitted: 10, resolved: 9 },
        { day: "Sun", submitted: 8, resolved: 7 },
      ];

  const monthlyData = stats.monthlyData?.length
    ? stats.monthlyData
    : [
        { month: "Jan", value: 45 },
        { month: "Feb", value: 62 },
        { month: "Mar", value: 78 },
        { month: "Apr", value: 95 },
        { month: "May", value: 110 },
      ];

  const categoryBreakdown = stats.categoryBreakdown?.length
    ? stats.categoryBreakdown
    : [
        { icon: "bx bx-laptop", label: "IT & Tech", value: 42 },
        { icon: "bx bx-wrench", label: "Maintenance", value: 28 },
        { icon: "bx bx-building-house", label: "Hostel", value: 19 },
        { icon: "bx bx-book-open", label: "Academic", value: 14 },
      ];

  return (
    <motion.div
      className="admin-dashboard-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Title & Live Status Bar */}
      <div className="bento-header-row">
        <div>
          <h1 className="bento-title">System Intelligence</h1>
          <p className="bento-subtitle">Real-time analytical control and complaint telemetry</p>
        </div>
        <div className="live-status-pill neon-badge-pulse">
          <i className="bx bx-broadcast neon-text-green" />
          <span>Live Metrics • {formatLastUpdated(stats.lastUpdated)}</span>
        </div>
      </div>

      {/* KPI 3D Tilt Grid */}
      <div className="kpi-bento-grid">
        {metricCards.map((item, idx) => (
          <StatCard
            key={idx}
            title={item.title}
            value={loading ? 0 : item.value}
            trend={item.trend}
            trendValue={item.trendValue}
            context={item.context}
            isFeatured={item.isFeatured}
          />
        ))}
      </div>

      {/* 3D Charts Row (Using CSS box-shadow container glow to eliminate live SVG filter lag) */}
      <div className="charts-bento-grid">
        <SpatialCard className="chart-bento-card">
          <div className="chart-glow-container">
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
              Weekly Workload Telemetry
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              Submitted vs Resolved Activity
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" tickLine={false} />
                <YAxis stroke="var(--text-muted)" tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20, 20, 28, 0.9)",
                    border: "1px solid rgba(249, 115, 22, 0.3)",
                    borderRadius: "12px",
                    color: "#fff",
                    boxShadow: "0 0 15px rgba(249, 115, 22, 0.2)",
                  }}
                />
                <Bar dataKey="submitted" fill="var(--neon-rose)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" fill="var(--neon-orange)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SpatialCard>

        <SpatialCard className="chart-bento-card">
          <div className="chart-glow-container">
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "4px" }}>
              Volume Trajectory
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              Monthly Growth Projection
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" tickLine={false} />
                <YAxis stroke="var(--text-muted)" tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20, 20, 28, 0.9)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--neon-gold)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--neon-gold)" }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SpatialCard>
      </div>

      {/* Category Breakdown Section */}
      <div className="category-bento-section">
        <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", marginBottom: "16px" }}>
          Category Distribution
        </h3>
        <div className="category-bento-grid">
          {categoryBreakdown.map((item, idx) => (
            <CategoryCard
              key={idx}
              icon={item.icon}
              label={item.label}
              value={loading ? 0 : item.value}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AdminDashboard;
