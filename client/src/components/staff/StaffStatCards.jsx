import React from "react";

const STAT_CONFIG = [
  {
    key:   "totalAssigned",
    label: "Total Assigned",
    icon:  "bx bx-list-ul",
    color: "#6366f1",
    bg:    "rgba(99,102,241,0.10)",
    trend: "+12%",
    trendUp: true,
  },
  {
    key:   "pending",
    label: "Pending",
    icon:  "bx bx-time-five",
    color: "#f59e0b",
    bg:    "rgba(245,158,11,0.10)",
    trend: "+3%",
    trendUp: false,
  },
  {
    key:   "inProgress",
    label: "In Progress",
    icon:  "bx bx-loader-alt",
    color: "#3b82f6",
    bg:    "rgba(59,130,246,0.10)",
    trend: "+8%",
    trendUp: true,
  },
  {
    key:   "resolved",
    label: "Resolved",
    icon:  "bx bx-check-circle",
    color: "#10b981",
    bg:    "rgba(16,185,129,0.10)",
    trend: "+24%",
    trendUp: true,
  },
  {
    key:   "rejected",
    label: "Rejected",
    icon:  "bx bx-x-circle",
    color: "#ef4444",
    bg:    "rgba(239,68,68,0.10)",
    trend: "-2%",
    trendUp: false,
  },
];

const StaffStatCards = ({ stats = {}, loading = false }) => {
  return (
    <div className="ssd-stats-grid">
      {STAT_CONFIG.map((cfg) => (
        <div className="ssd-stat-card" key={cfg.key}>
          <div className="ssd-stat-card__top">
            <div
              className="ssd-stat-card__icon"
              style={{ background: cfg.bg }}
            >
              <i className={cfg.icon} style={{ color: cfg.color }} />
            </div>
            <span
              className={`ssd-stat-card__trend ${
                cfg.trendUp
                  ? "ssd-stat-card__trend--up"
                  : "ssd-stat-card__trend--down"
              }`}
            >
              <i
                className={`bx ${
                  cfg.trendUp ? "bx-trending-up" : "bx-trending-down"
                }`}
              />
              {cfg.trend}
            </span>
          </div>

          <div className="ssd-stat-card__value">
            {loading ? (
              <span className="ssd-skeleton ssd-skeleton--value" />
            ) : (
              <h2 style={{ color: cfg.color }}>{stats[cfg.key] ?? 0}</h2>
            )}
          </div>

          <p className="ssd-stat-card__label">{cfg.label}</p>

          <div
            className="ssd-stat-card__bar"
            style={{ "--bar-color": cfg.color }}
          >
            <div
              className="ssd-stat-card__bar-fill"
              style={{
                width: loading
                  ? "0%"
                  : `${Math.min(
                      ((stats[cfg.key] ?? 0) /
                        Math.max(stats.totalAssigned ?? 1, 1)) *
                        100,
                      100
                    )}%`,
                background: cfg.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default StaffStatCards;