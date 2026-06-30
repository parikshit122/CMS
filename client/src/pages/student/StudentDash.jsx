import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import API from "../../services/api";
import StatCard from "../../components/common/StatCard";
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
  const userName = user?.name || "User";

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

  if (loading) return <div className="student-container">Loading...</div>;

  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "pending").length;
  const inProgress = complaints.filter(
    (c) => c.status === "in-progress",
  ).length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;

  const now = new Date();
  const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endPrevMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
  );

  const startThisWeek = new Date(now);
  startThisWeek.setDate(now.getDate() - 6);
  startThisWeek.setHours(0, 0, 0, 0);

  const endPrevWeek = new Date(startThisWeek.getTime() - 1);
  const startPrevWeek = new Date(startThisWeek);
  startPrevWeek.setDate(startPrevWeek.getDate() - 7);

  const totalThisMonth = complaints.filter(
    (c) => new Date(c.createdAt) >= startThisMonth,
  ).length;

  const totalPrevMonth = complaints.filter((c) => {
    const d = new Date(c.createdAt);
    return d >= startPrevMonth && d <= endPrevMonth;
  }).length;

  const pendingThisWeek = complaints.filter(
    (c) => c.status === "pending" && new Date(c.createdAt) >= startThisWeek,
  ).length;

  const pendingPrevWeek = complaints.filter((c) => {
    const d = new Date(c.createdAt);
    return c.status === "pending" && d >= startPrevWeek && d <= endPrevWeek;
  }).length;

  const inProgressThisWeek = complaints.filter(
    (c) =>
      c.status === "in-progress" &&
      new Date(c.updatedAt || c.createdAt) >= startThisWeek,
  ).length;

  const inProgressPrevWeek = complaints.filter((c) => {
    const d = new Date(c.updatedAt || c.createdAt);
    return c.status === "in-progress" && d >= startPrevWeek && d <= endPrevWeek;
  }).length;

  const resolvedThisWeek = complaints.filter(
    (c) =>
      c.status === "resolved" &&
      new Date(c.updatedAt || c.createdAt) >= startThisWeek,
  ).length;

  const resolvedPrevWeek = complaints.filter((c) => {
    const d = new Date(c.updatedAt || c.createdAt);
    return c.status === "resolved" && d >= startPrevWeek && d <= endPrevWeek;
  }).length;

  const calcTrend = (current, previous) => {
    if (previous === 0 && current === 0) return { value: 0, isNew: false };
    if (previous === 0 && current > 0) return { value: 0, isNew: true };
    return {
      value: Math.round(((current - previous) / previous) * 1000) / 10,
      isNew: false,
    };
  };

  const totalTrend = calcTrend(totalThisMonth, totalPrevMonth);
  const pendingTrend = calcTrend(pendingThisWeek, pendingPrevWeek);
  const progressTrend = calcTrend(inProgressThisWeek, inProgressPrevWeek);
  const resolvedTrend = calcTrend(resolvedThisWeek, resolvedPrevWeek);

  const stats = [
    {
      title: "Total Complaints",
      value: total,
      trend: totalTrend.isNew ? "new" : totalTrend.value >= 0 ? "up" : "down",
      trendValue: totalTrend.isNew ? "NEW" : Math.abs(totalTrend.value),
      context: `${totalPrevMonth} last month`,
    },
    {
      title: "Pending",
      value: pending,
      trend: pendingTrend.isNew
        ? "new"
        : pendingTrend.value <= 0
          ? "up"
          : "down",
      trendValue: pendingTrend.isNew ? "NEW" : Math.abs(pendingTrend.value),
      context: `${pendingPrevWeek} last week`,
    },
    {
      title: "In Progress",
      value: inProgress,
      trend: progressTrend.isNew
        ? "new"
        : progressTrend.value >= 0
          ? "up"
          : "down",
      trendValue: progressTrend.isNew ? "NEW" : Math.abs(progressTrend.value),
      context: `${inProgressThisWeek} active this week`,
    },
    {
      title: "Resolved",
      value: resolved,
      trend: resolvedTrend.isNew
        ? "new"
        : resolvedTrend.value >= 0
          ? "up"
          : "down",
      trendValue: resolvedTrend.isNew ? "NEW" : Math.abs(resolvedTrend.value),
      context: `${resolvedThisWeek} this week`,
    },
  ];

  const trendMap = {};
  complaints.forEach((c) => {
    const month = new Date(c.createdAt).toLocaleString("default", {
      month: "short",
    });
    trendMap[month] = (trendMap[month] || 0) + 1;
  });

  const trendData = Object.keys(trendMap).map((month) => ({
    month,
    value: trendMap[month],
  }));

  const categoryMap = {};
  complaints.forEach((c) => {
    categoryMap[c.category] = (categoryMap[c.category] || 0) + 1;
  });

  const colors = ["#6C5CE7", "#0984E3", "#00B894", "#FDCB6E", "#B2BEC3"];

  const categoryData = Object.keys(categoryMap).map((key, index) => ({
    name: key,
    value: categoryMap[key],
    color: colors[index % colors.length],
  }));

  const totalCategories = categoryData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="student-container">
      <div className="student-header">
        <div>
          <h1>{userName}</h1>
        </div>

        <Link to="/submit" className="submit-btn">
          <Plus size={18} /> Submit Complaint
        </Link>
      </div>

      <div className="stats-grid">
        {stats.map((item, index) => (
          <StatCard key={index} {...item} />
        ))}
      </div>

      <div className="chart-section">
        <div className="chart-card large">
          <h3>Complaint Trend</h3>
          <p>Monthly submissions</p>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6C5CE7"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>By Category</h3>
          <p>Distribution breakdown</p>

          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                innerRadius={60}
                outerRadius={90}
              >
                {categoryData.map((item, index) => (
                  <Cell key={index} fill={item.color} />
                ))}
              </Pie>
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="donut-total"
              >
                {totalCategories}
              </text>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="recent-card">
        <div className="recent-header">
          <div>
            <h3>Recent Activity</h3>
            <p>Your latest complaint submissions</p>
          </div>
          <Link to="/complaints" className="view-all">
            View all complaints
          </Link>
        </div>

        {complaints.slice(0, 2).map((item, index) => (
          <div key={index} className="recent-row">
            <div>
              <div className="recent-top">
                <span className="complaint-id">{item._id.slice(-6)}</span>
                <span className={`status ${item.status}`}>{item.status}</span>
              </div>
              <h4>{item.title}</h4>
              <p>
                {item.category} •{" "}
                {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="help-card">
        <div className="help-header">
          <h2>Need Help?</h2>
          <p>Our support team is available 24/7 to assist you.</p>
        </div>

        <div className="help-grid">
          <div className="help-box">
            <h4>Call Us</h4>
            <p>24/7 Phone Support</p>
            <strong>+1 (555) 123-4567</strong>
          </div>

          <div className="help-box">
            <h4>Email Us</h4>
            <p>Response within 2 hours</p>
            <strong>support@complaintsync.com</strong>
          </div>

          <div className="help-box">
            <h4>Live Chat</h4>
            <p>Instant assistance</p>
            <strong>Start chat now</strong>
          </div>
        </div>

        <div className="help-footer">
          <p>
            <strong>Office Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM
            EST
          </p>
          <p>
            <strong>Emergency Support:</strong> Available 24/7
          </p>
        </div>
      </div>
    </div>
  );
}
