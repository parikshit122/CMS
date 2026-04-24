import React from "react";

const PriorityItem = ({ id, priority, title, category, time }) => {
  return (
    <div className="priority-item">
      <div>
        <span className={`badge-${priority}`}>{priority}</span>
        <h4>{title}</h4>
        <p>{category} • {time}</p>
      </div>
      <button className="review-btn">Review</button>
    </div>
  );
};

export default PriorityItem;