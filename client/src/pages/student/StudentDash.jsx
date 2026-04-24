import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
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
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const userName = user?.name || "John Doe";

  const stats = [
    { label: "Total Complaints", value: 12, change: "+16.7%", positive: true, note: "10 last month" },
    { label: "Pending", value: 3, change: "-25%", positive: false, note: "4 last week" },
    { label: "In Progress", value: 5, change: "+25%", positive: true, note: "4 active" },
    { label: "Resolved", value: 4, change: "+100%", positive: true, note: "2 this week" },
  ];

  const trendData = [
    { month: "Jan", value: 2 },
    { month: "Feb", value: 4 },
    { month: "Mar", value: 3 },
    { month: "Apr", value: 6 },
    { month: "May", value: 5 },
    { month: "Jun", value: 8 },
  ];

  const categoryData = [
    { name: "IT & Technical", value: 4, color: "#6C5CE7" },
    { name: "Maintenance", value: 3, color: "#0984E3" },
    { name: "Security", value: 2, color: "#00B894" },
    { name: "Finance", value: 2, color: "#FDCB6E" },
    { name: "Other", value: 1, color: "#B2BEC3" },
  ];

  const total = categoryData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="student-container">

      {/* HEADER */}
      <div className="student-header">
        <div>
          <h1>{userName}</h1>
          <p>Last login: April 11, 2026 at 9:42 AM</p>
        </div>

        <Link to="/submit" className="submit-btn">
          <Plus size={18} /> Submit Complaint
        </Link>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        {stats.map((item, index) => (
          <div key={index} className="stat-card">
            <span className="stat-title">{item.label}</span>
            <h2>{item.value}</h2>
            <div className={`stat-change ${item.positive ? "positive" : "negative"}`}>
              {item.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {item.change}
              <span>{item.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="chart-section">

        <div className="chart-card large">
          <h3>Complaint Trend</h3>
          <p>Monthly submissions over the last 4 months</p>

          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#6C5CE7" strokeWidth={3} />
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
                {total}
              </text>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* RECENT ACTIVITY */}
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

        {[
          {
            id: "CMP-001",
            status: "In Progress",
            priority: "High",
            title: "Internet connectivity issue",
            category: "IT & Technical",
            date: "2026-03-28",
          },
          {
            id: "CMP-002",
            status: "Pending",
            priority: "Medium",
            title: "Air conditioning not working",
            category: "Maintenance",
            date: "2026-03-27",
          },
        ].map((item, index) => (
          <div key={index} className="recent-row">
            <div>
              <div className="recent-top">
                <span className="complaint-id">{item.id}</span>
                <span className={`status ${item.status.replace(" ", "-").toLowerCase()}`}>
                  {item.status}
                </span>
                <span className={`priority ${item.priority.toLowerCase()}`}>
                  {item.priority}
                </span>
              </div>
              <h4>{item.title}</h4>
              <p>{item.category} • {item.date}</p>
            </div>
            <Link to={`/complaints/${item.id}`} className="view-details">
              View details
            </Link>
          </div>
        ))}
      </div>

      {/* NEED HELP */}
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
          <p><strong>Office Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST</p>
          <p><strong>Emergency Support:</strong> Available 24/7</p>
        </div>
      </div>

    </div>
  );
}