import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import SpatialCard from "../layout/SpatialCard";
import CountUp from "./CountUp";

const StatCard = ({ title, value, trend, trendValue, context, isFeatured = false }) => {
  const isUp = trend === "up";
  const numericVal = typeof value === "number" ? value : parseInt(value, 10);

  return (
    <SpatialCard className="stat-card spatial-stat-card" glare={isFeatured || true}>
      <div style={{ padding: "24px" }}>
        <p className="stat-title" style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500 }}>
          {title}
        </p>

        <h2 style={{ fontSize: "36px", fontWeight: 700, margin: "10px 0", color: "#ffffff" }}>
          {!isNaN(numericVal) ? <CountUp end={numericVal} /> : value}
        </h2>

        {trendValue !== undefined && (
          <div className="stat-footer" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <span
              className={`stat-trend ${isUp ? "up" : "down"}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "2px",
                padding: "2px 8px",
                borderRadius: "20px",
                fontWeight: 600,
                background: isUp ? "rgba(249, 115, 22, 0.15)" : "rgba(225, 29, 72, 0.15)",
                color: isUp ? "var(--neon-orange)" : "var(--neon-rose)",
                boxShadow: isUp ? "0 0 10px rgba(249, 115, 22, 0.2)" : "none",
              }}
            >
              {isUp ? (
                <ArrowUpRight size={15} strokeWidth={2.5} />
              ) : (
                <ArrowDownRight size={15} strokeWidth={2.5} />
              )}
              {isUp ? "+" : ""}
              {trendValue}%
            </span>
            <span className="stat-context" style={{ color: "var(--text-muted)" }}>
              {context}
            </span>
          </div>
        )}
      </div>
    </SpatialCard>
  );
};

export default StatCard;