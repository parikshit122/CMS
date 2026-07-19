import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import "../../styles/SpatialCard.css";

const SpatialCard = ({ children, className = "", style = {}, glare = false }) => {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs with subtle tilt physics
  const mouseXSpring = useSpring(x, { stiffness: 250, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 250, damping: 25 });

  // Cap tilt to max 8-10 degrees
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["9deg", "-9deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-9deg", "9deg"]);

  // Glare position
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["100%", "0%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["100%", "0%"]);

  // IntersectionObserver to pause calculation when off-screen
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // rAF Throttled Mouse Move Handler
  const rafId = useRef(null);

  const handleMouseMove = (e) => {
    if (!ref.current || !isVisible || prefersReducedMotion) return;

    if (rafId.current) cancelAnimationFrame(rafId.current);

    const rect = ref.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    rafId.current = requestAnimationFrame(() => {
      const width = rect.width;
      const height = rect.height;
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      const xPct = mouseX / width - 0.5;
      const yPct = mouseY / height - 0.5;

      x.set(xPct);
      y.set(yPct);
    });
  };

  const handleMouseLeave = () => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  const handleMouseEnter = () => {
    if (isVisible && !prefersReducedMotion) setIsHovered(true);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
        ...style,
      }}
      className={`spatial-card-container ${glare ? "has-glare" : ""} ${className}`}
    >
      {/* Specular Glare Sweep — Warm Molten Orange */}
      {glare && !prefersReducedMotion && (
        <motion.div
          className="spatial-card-glare"
          style={{
            background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(249, 115, 22, 0.25) 0%, transparent 60%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />
      )}

      <div className="spatial-card-content" style={{ transform: "translateZ(30px)" }}>
        {children}
      </div>
    </motion.div>
  );
};

export default SpatialCard;
