import React from "react";

const StatCard = ({ title, value, change, subtitle }) => {
  return (
    <div className="stat-card">
      <p className="stat-title">{title}</p>
      <h2>{value}</h2>
      <p className="stat-change">{change}</p>
      <p className="stat-subtitle">{subtitle}</p>
    </div>
  );
};

export default StatCard;