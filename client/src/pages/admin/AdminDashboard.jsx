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
import "../../styles/AdminDashboard.css";

const AdminDashboard = () => {
  const weeklyData = [
    { day: "Mon", submitted: 28, resolved: 22 },
    { day: "Tue", submitted: 35, resolved: 30 },
    { day: "Wed", submitted: 42, resolved: 38 },
    { day: "Thu", submitted: 38, resolved: 35 },
    { day: "Fri", submitted: 45, resolved: 40 },
    { day: "Sat", submitted: 20, resolved: 18 },
    { day: "Sun", submitted: 18, resolved: 15 },
  ];

  const monthlyData = [
    { month: "Jan", value: 140 },
    { month: "Feb", value: 165 },
    { month: "Mar", value: 195 },
    { month: "Apr", value: 240 },
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
          <strong>April 11, 2026 • 10:42 AM</strong>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard title="Total Complaints" value="248" change="+12%" />
        <MetricCard title="Pending Review" value="42" change="-8%" />
        <MetricCard title="Resolved" value="186" change="+15%" />
        <MetricCard title="Avg Response Time" value="2.4h" change="-22%" />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h4>Weekly Activity</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="submitted" fill="#3b82f6" />
              <Bar dataKey="resolved" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h4>Volume Trend</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="category-section">
        <h4>Category Breakdown</h4>
        <div className="category-grid">
          <CategoryCard icon="bx bx-cog" label="Technical" value="85" />
          <CategoryCard icon="bx bx-support" label="Service" value="62" />
          <CategoryCard icon="bx bx-building" label="Infrastructure" value="48" />
          <CategoryCard icon="bx bx-credit-card" label="Billing" value="53" />
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, change }) => (
  <div className="metric-card">
    <span>{title}</span>
    <div className="metric-value">
      <h2>{value}</h2>
      <span className="change">{change}</span>
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