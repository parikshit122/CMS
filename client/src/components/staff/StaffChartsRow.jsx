import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import SpatialCard from "../layout/SpatialCard";


/* ── Custom Tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="ssd-tooltip">
      <p className="ssd-tooltip__label">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="ssd-tooltip__item"
          style={{ color: entry.color }}
        >
          <span className="ssd-tooltip__dot"
            style={{ background: entry.color }} />
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ── Default fallback data (until API loads) ── */
const DEFAULT_WEEKLY = [
  { day: "Mon", assigned: 0, resolved: 0 },
  { day: "Tue", assigned: 0, resolved: 0 },
  { day: "Wed", assigned: 0, resolved: 0 },
  { day: "Thu", assigned: 0, resolved: 0 },
  { day: "Fri", assigned: 0, resolved: 0 },
  { day: "Sat", assigned: 0, resolved: 0 },
  { day: "Sun", assigned: 0, resolved: 0 },
];

const DEFAULT_STATUS = [
  { name: "Pending",     value: 0, color: "#f59e0b" },
  { name: "In Progress", value: 0, color: "#f43f5e" },
  { name: "Resolved",    value: 0, color: "#fbbf24" },
  { name: "Rejected",    value: 0, color: "#ef4444" },
];

const StaffChartsRow = ({ stats = {}, loading = false }) => {
  const weeklyData = useMemo(
    () => (stats.weeklyTrend?.length ? stats.weeklyTrend : DEFAULT_WEEKLY),
    [stats.weeklyTrend]
  );

  const statusData = useMemo(
    () =>
      stats.statusBreakdown?.length
        ? stats.statusBreakdown
        : DEFAULT_STATUS,
    [stats.statusBreakdown]
  );

  return (
    <div className="ssd-charts-row">
      {/* ── Line Chart: Assigned vs Resolved ── */}
      <SpatialCard className="ssd-chart-card">
        <div className="ssd-chart-card__header">
          <div>
            <h4 className="ssd-chart-card__title">Weekly Trend</h4>
            <p className="ssd-chart-card__sub">
              Assigned vs Resolved complaints this week
            </p>
          </div>
        </div>

        {loading ? (
          <div className="ssd-skeleton ssd-skeleton--chart" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={weeklyData}
              margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "var(--muted-text)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-text)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="assigned"
                name="Assigned"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f59e0b" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name="Resolved"
                stroke="#f43f5e"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f43f5e" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SpatialCard>

      {/* ── Bar Chart: Status Distribution ── */}
      <SpatialCard className="ssd-chart-card">
        <div className="ssd-chart-card__header">
          <div>
            <h4 className="ssd-chart-card__title">Status Breakdown</h4>
            <p className="ssd-chart-card__sub">
              Current distribution of complaint statuses
            </p>
          </div>
        </div>

        {loading ? (
          <div className="ssd-skeleton ssd-skeleton--chart" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={statusData}
              margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
              barSize={36}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "var(--muted-text)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-text)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Complaints" radius={[6, 6, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        </SpatialCard>
      </div>
    );
};

export default StaffChartsRow;