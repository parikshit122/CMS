import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const StatCard = ({ title, value, trend, trendValue, context }) => {
  const isUp = trend === "up";

  return (
    <div className="stat-card">
      <p className="stat-title">{title}</p>
      <h2>{value}</h2>

      {trendValue !== undefined && (
        <div className="stat-footer">
          <span className={`stat-trend ${isUp ? "up" : "down"}`}>
            {isUp ? (
              <ArrowUpRight size={15} strokeWidth={2.5} />
            ) : (
              <ArrowDownRight size={15} strokeWidth={2.5} />
            )}
            {isUp ? "+" : ""}
            {trendValue}%
          </span>
          <span className="stat-context">{context}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;