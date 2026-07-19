import React, { useEffect, useState } from "react";

export default function CountUp({ end, duration = 1.2, suffix = "", prefix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    let startTime = null;
    let animId;
    const target = typeof end === "number" ? end : parseFloat(end) || 0;

    const updateCount = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Ease out quad
      const current = Math.floor((1 - (1 - progress) * (1 - progress)) * target);

      setCount(current);

      if (progress < 1) {
        animId = requestAnimationFrame(updateCount);
      } else {
        setCount(target);
      }
    };

    animId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animId);
  }, [end, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}
