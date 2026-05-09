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

  const calcTrend = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  };

  const formatTrend = (value) => {
    const absValue = Math.abs(value);
    const cleanValue = Number.isInteger(absValue) ? absValue : absValue.toFixed(1);
    return `${value >= 0 ? "+" : "-"}${cleanValue}%`;
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

  const metricCards = useMemo(() => {
    const meta = stats.trendMeta || {};

    const totalTrend = calcTrend(
      meta.totalComplaints?.current || 0,
      meta.totalComplaints?.previous || 0
    );

    const pendingTrend = calcTrend(
      meta.pending?.current || 0,
      meta.pending?.previous || 0
    );

    const resolvedTrend = calcTrend(
      meta.resolved?.current || 0,
      meta.resolved?.previous || 0
    );

    const responseTrend = calcTrend(
      meta.avgResponseTime?.current || 0,
      meta.avgResponseTime?.previous || 0
    );

    return [
      {
        title: "Total Complaints",
        value: stats.totalComplaints || stats.total || 0, 
        change: formatTrend(totalTrend),
        positive: totalTrend >= 0,
      },
      {
        title: "Pending Review",
        value: stats.pending,
        change: formatTrend(pendingTrend),
        positive: pendingTrend <= 0,
      },
      {
        title: "Resolved",
        value: stats.resolved,
        change: formatTrend(resolvedTrend),
        positive: resolvedTrend >= 0,
      },
      {
        title: "Avg Response Time",
        value: `${stats.avgResponseTime || 0}h`,
        change: formatTrend(responseTrend),
        positive: responseTrend <= 0,
      },
    ];
  }, [stats]);

  const weeklyData = stats.weeklyData?.length ? stats.weeklyData : [
    { day: "Mon", submitted: 0, resolved: 0 },
    { day: "Tue", submitted: 0, resolved: 0 },
    { day: "Wed", submitted: 0, resolved: 0 },
    { day: "Thu", submitted: 0, resolved: 0 },
    { day: "Fri", submitted: 0, resolved: 0 },
    { day: "Sat", submitted: 0, resolved: 0 },
    { day: "Sun", submitted: 0, resolved: 0 },
  ];

  const monthlyData = stats.monthlyData?.length ? stats.monthlyData : [
    { month: "Jan", value: 0 },
    { month: "Feb", value: 0 },
    { month: "Mar", value: 0 },
    { month: "Apr", value: 0 },
  ];

  const categoryBreakdown = stats.categoryBreakdown?.length
    ? stats.categoryBreakdown
    : [
      { icon: "bx bx-category", label: "No Data", value: 0 },
    ];

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
            positive={item.positive}
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

const MetricCard = ({ title, value, change, positive }) => (
  <div className="metric-card">
    <span>{title}</span>
    <div className="metric-value">
      <h2>{value}</h2>
      <span className={`change ${positive ? "positive" : "negative"}`}>
        {change}
      </span>
    </div>
  </div>
);

const CategoryCard = ({ icon, label, value }) => (
  <div className="category-card">
    <div className="category-icon">
      <i className={icon}></i>
    </div>
    <div>
      <h3>{value}</h3>
      <p>{label}</p>
    </div>
  </div>
);

export default AdminDashboard;