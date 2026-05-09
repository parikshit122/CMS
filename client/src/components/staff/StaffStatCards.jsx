import React from "react";
import { SkeletonStatCard } from "../common/Loader";

const STAT_CONFIG = [
  {
    key: "totalAssigned",
    label: "Total Assigned",
    icon: "bx bx-list-ul",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.10)",
  },
  {
    key: "pending",
    label: "Pending",
    icon: "bx bx-time-five",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.10)",
  },
  {
    key: "inProgress",
    label: "In Progress",
    icon: "bx bx-loader-alt",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.10)",
  },
  {
    key: "resolved",
    label: "Resolved",
    icon: "bx bx-check-circle",
    color: "#10b981",
    bg: "rgba(16,185,129,0.10)",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: "bx bx-x-circle",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
  },
];

const calcTrend = (current, previous) => {
  if (!previous) {
    const pct = current > 0 ? 100 : 0;
    return { pct, up: pct >= 0 };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return { pct, up: pct >= 0 };
};

const formatPct = (pct) => {
  const val = Number.isFinite(pct) ? pct : 0;
  const clean = String(val).includes(".")
    ? val.toFixed(1).replace(/\.0$/, "")
    : val;
  return `${val > 0 ? "+" : ""}${clean}%`;
};

const StaffStatCards = ({ stats = {}, loading = false }) => {
  const meta = stats.trendMeta || {};

  // ── Skeleton state — show 5 skeleton cards ──────────────
  if (loading) {
    return (
      <div className="ssd-stats-grid" aria-busy="true" aria-label="Loading statistics">
        {STAT_CONFIG.map((cfg) => (
          <SkeletonStatCard key={cfg.key} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="ssd-stats-grid"
      role="list"
      aria-label="Staff complaint statistics"
    >
      {STAT_CONFIG.map((cfg) => {
        const m = meta[cfg.key] || { current: 0, previous: 0 };
        const { pct, up } = calcTrend(m.current, m.previous);
        const trendLabel = `${up ? "Up" : "Down"} ${Math.abs(pct)}% from last week`;

        return (
          <div
            className="ssd-stat-card"
            key={cfg.key}
            role="listitem"
            aria-label={`${cfg.label}: ${stats[cfg.key] ?? 0}. ${trendLabel}`}
          >
            {/* Top row: icon + trend badge */}
            <div className="ssd-stat-card__top">
              <div
                className="ssd-stat-card__icon"
                style={{ background: cfg.bg }}
                aria-hidden="true"
              >
                <i className={cfg.icon} style={{ color: cfg.color }} />
              </div>

              <span
                className={`ssd-stat-card__trend ${
                  up
                    ? "ssd-stat-card__trend--up"
                    : "ssd-stat-card__trend--down"
                }`}
                aria-label={trendLabel}
                title={`${m.previous} last week`}
              >
                <i
                  className={`bx ${up ? "bx-trending-up" : "bx-trending-down"}`}
                  aria-hidden="true"
                />
                {formatPct(pct)}
              </span>
            </div>

            {/* Value */}
            <div className="ssd-stat-card__value">
              <h2 style={{ color: cfg.color }}>{stats[cfg.key] ?? 0}</h2>
            </div>

            {/* Label */}
            <p className="ssd-stat-card__label">{cfg.label}</p>

            {/* Meta */}
            <div className="ssd-stat-card__meta">
              <span className="ssd-stat-card__meta-text">
                {m.previous} last week
              </span>
            </div>

            {/* Progress bar */}
            <div
              className="ssd-stat-card__bar"
              style={{ "--bar-color": cfg.color }}
              role="presentation"
            >
              <div
                className="ssd-stat-card__bar-fill"
                style={{
                  width: `${Math.min(
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
        );
      })}
    </div>
  );
};

export default StaffStatCards;