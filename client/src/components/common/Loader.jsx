import React from "react";
import "../../styles/Loader.css";

// ── Spinner Loader ──────────────────────────────────────────
export const Spinner = ({ size = "md", color = "var(--primary-color)" }) => (
  <div
    className={`cms-spinner cms-spinner--${size}`}
    style={{ "--spinner-color": color }}
    role="status"
    aria-label="Loading"
  >
    <div className="cms-spinner__ring" />
  </div>
);

// ── Skeleton Block ──────────────────────────────────────────
export const Skeleton = ({
  width = "100%",
  height = "16px",
  radius = "6px",
  className = "",
}) => (
  <div
    className={`cms-skeleton ${className}`}
    style={{ width, height, borderRadius: radius }}
    aria-hidden="true"
  />
);

// ── Skeleton Card (pre-built stat card shape) ───────────────
export const SkeletonStatCard = () => (
  <div className="cms-skeleton-card" aria-hidden="true">
    <div className="cms-skeleton-card__top">
      <Skeleton width="44px" height="44px" radius="12px" />
      <Skeleton width="60px" height="20px" radius="10px" />
    </div>
    <Skeleton width="70px" height="36px" radius="8px" className="mt-2" />
    <Skeleton width="90px" height="14px" radius="6px" className="mt-1" />
    <Skeleton width="100%" height="4px" radius="4px" className="mt-2" />
  </div>
);

// ── Skeleton Table Row ──────────────────────────────────────
export const SkeletonTableRow = ({ cols = 5 }) => (
  <tr className="cms-skeleton-row" aria-hidden="true">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i}>
        <Skeleton
          width={i === 0 ? "140px" : i === cols - 1 ? "80px" : "100px"}
          height="16px"
        />
      </td>
    ))}
  </tr>
);

// ── Full Page Loader ────────────────────────────────────────
export const PageLoader = () => (
  <div className="cms-page-loader" role="status" aria-label="Loading page">
    <Spinner size="lg" />
    <p className="cms-page-loader__text">Loading...</p>
  </div>
);

export default Spinner;