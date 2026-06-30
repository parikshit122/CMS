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
import API from "../../services/api";
import "../../styles/AdminDashboard.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// ✅ NEW: percentage of total = (this month / lifetime total) * 100
const calcShareOfTotal = (current, total) => {
  if (!total || total === 0) return { value: 0, type: "none" };
  if (current === 0) return { value: 0, type: "none" };
  const share = (current / total) * 100;
  return { value: Math.round(share * 10) / 10, type: "share" };
};

const formatShare = (trend) => {
  if (trend.type === "none") return "—";
  if (trend.value === 0) return "0%";
  const absValue = Math.abs(trend.value);
  const cleanValue = Number.isInteger(absValue)
    ? absValue
    : absValue.toFixed(1);
  return `${cleanValue}%`;
};

// Color logic: positive = growth, neutral = no activity
const getShareColor = (trend, lowerIsBetter = false) => {
  if (trend.type === "none") return "neutral";
  if (lowerIsBetter) {
    // For pending: high % means lots of new unresolved = bad
    return trend.value > 50 ? "negative" : "positive";
  }
  // For total/resolved: any new activity is good
  return "positive";
};

const formatLastUpdated = (value) => {
  if (!value) return "Just now";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── Sub Components ──────────────────────────────────────────────────────────

const MetricCard = ({ title, value, change, color, hint }) => (
  <div className="metric-card">
    <span className="metric-title">{title}</span>
    <div className="metric-value">
      <h2>{value}</h2>
      <span className={`change ${color}`}>{change}</span>
    </div>
    {hint && <span className="metric-hint">{hint}</span>}
  </div>
);

const CategoryCard = ({ icon, label, value }) => {
  // Pick a color based on category name (consistent per category)
  const getColorClass = (label) => {
    const colors = {
      technical: "cat-blue",
      it: "cat-blue",
      software: "cat-blue",
      hardware: "cat-blue",
      network: "cat-blue",

      electrical: "cat-yellow",
      plumbing: "cat-cyan",
      infrastructure: "cat-gray",
      maintenance: "cat-gray",
      cleanliness: "cat-green",

      hostel: "cat-purple",
      accommodation: "cat-purple",
      food: "cat-orange",
      mess: "cat-orange",

      academic: "cat-indigo",
      exam: "cat-indigo",
      library: "cat-indigo",
      faculty: "cat-indigo",

      billing: "cat-pink",
      payment: "cat-pink",
      transport: "cat-teal",
      parking: "cat-teal",

      safety: "cat-red",
      security: "cat-red",
      medical: "cat-red",
      emergency: "cat-red",

      service: "cat-violet",
      feedback: "cat-violet",
      other: "cat-gray",
    };
    return colors[label?.toLowerCase()] || "cat-gray";
  };

  const colorClass = getColorClass(label);

  return (
    <div className={`category-card ${colorClass}`}>
      <div className="category-icon">
        <i className={icon}></i>
      </div>
      <div className="category-info">
        <h3>{value}</h3>
        <p>{label?.charAt(0).toUpperCase() + label?.slice(1)}</p>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

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

  // ── Metric Cards ───────────────────────────────────────────────────────────
  const metricCards = useMemo(() => {
    const meta = stats.trendMeta || {};

    const total = stats.totalComplaints || 0;
    const totalPending = stats.pending || 0;
    const totalResolved = stats.resolved || 0;

    // This month counts (added/changed in this month)
    const totalCurrent = meta.totalComplaints?.current || 0;
    const pendingCurrent = meta.pending?.current || 0;
    const resolvedCurrent = meta.resolved?.current || 0;
    const responseCurrent = meta.avgResponseTime?.current || 0;

    // % share of THIS MONTH out of TOTAL
    const totalShare = calcShareOfTotal(totalCurrent, total);
    const pendingShare = calcShareOfTotal(pendingCurrent, totalPending);
    const resolvedShare = calcShareOfTotal(resolvedCurrent, totalResolved);

    return [
      {
        title: "Total Complaints",
        value: total,
        change: formatShare(totalShare),
        color: getShareColor(totalShare, false),
        hint:
          totalCurrent === 0
            ? "No new complaints this month"
            : `${totalCurrent} of ${total} added this month`,
      },
      {
        title: "Pending Review",
        value: totalPending,
        change: formatShare(pendingShare),
        color: getShareColor(pendingShare, true),
        hint:
          pendingCurrent === 0
            ? "No new pending this month"
            : `${pendingCurrent} of ${totalPending} new this month`,
      },
      {
        title: "Resolved",
        value: totalResolved,
        change: formatShare(resolvedShare),
        color: getShareColor(resolvedShare, false),
        hint:
          resolvedCurrent === 0
            ? "Nothing resolved this month"
            : `${resolvedCurrent} of ${totalResolved} resolved this month`,
      },
      {
        title: "Avg Response Time",
        value: `${stats.avgResponseTime || 0}h`,
        change: responseCurrent > 0 ? `${responseCurrent}h` : "—",
        color: responseCurrent === 0 ? "neutral" : "positive",
        hint:
          responseCurrent === 0
            ? "No resolutions this month"
            : `${responseCurrent}h avg this month`,
      },
    ];
  }, [stats]);

  // ── Chart Data Fallbacks ───────────────────────────────────────────────────
  const weeklyData = stats.weeklyData?.length
    ? stats.weeklyData
    : [
        { day: "Mon", submitted: 0, resolved: 0 },
        { day: "Tue", submitted: 0, resolved: 0 },
        { day: "Wed", submitted: 0, resolved: 0 },
        { day: "Thu", submitted: 0, resolved: 0 },
        { day: "Fri", submitted: 0, resolved: 0 },
        { day: "Sat", submitted: 0, resolved: 0 },
        { day: "Sun", submitted: 0, resolved: 0 },
      ];

  const monthlyData = stats.monthlyData?.length
    ? stats.monthlyData
    : [
        { month: "Jan", value: 0 },
        { month: "Feb", value: 0 },
        { month: "Mar", value: 0 },
        { month: "Apr", value: 0 },
      ];

  const categoryBreakdown = stats.categoryBreakdown?.length
    ? stats.categoryBreakdown
    : [{ icon: "bx bx-category", label: "No Data", value: 0 }];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-dashboard">
      <div className="dashboard-header-row">
        <div>
          <h1>System Overview</h1>
          <p>Real-time complaint management metrics</p>
        </div>
        <div className="update-info">
          <span>Last updated</span>
          <strong>{formatLastUpdated(stats.lastUpdated)}</strong>
        </div>
      </div>

      <div className="metrics-grid">
        {metricCards.map((item) => (
          <MetricCard
            key={item.title}
            title={item.title}
            value={loading ? "..." : item.value}
            change={item.change}
            color={item.color}
            hint={item.hint}
          />
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h4>Weekly Activity</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="submitted" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4>Volume Trend</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 4, fill: "#6366f1" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="category-section">
        <h4>Category Breakdown</h4>
        <div className="category-grid">
          {categoryBreakdown.map((item) => (
            <CategoryCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={loading ? "..." : item.value}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
