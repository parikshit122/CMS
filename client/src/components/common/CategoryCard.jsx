import React from "react";

const CategoryCard = ({ count, title, color }) => {
  return (
    <div className="category-card">
      <div className="dot" style={{ background: color }}></div>
      <h3>{count}</h3>
      <p>{title}</p>
    </div>
  );
};

export default CategoryCard;