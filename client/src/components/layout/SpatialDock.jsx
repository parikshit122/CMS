import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import "../../styles/SpatialDock.css";

const DockItem = ({ item, mouseX }) => {
  const ref = React.useRef(null);
  
  // Calculate distance from mouse to the center of the icon
  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Calculate dynamic scale based on distance
  const scaleSync = useTransform(distance, [-150, 0, 150], [1, 1.4, 1]);
  const scale = useSpring(scaleSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <motion.li ref={ref} style={{ scale }} className="dock-list-item">
      <NavLink
        to={item.path}
        end={item.end ?? false}
        className={({ isActive }) =>
          isActive ? "dock-icon-btn active" : "dock-icon-btn"
        }
        aria-label={item.label}
        title={item.label}
      >
        <i className={item.icon} aria-hidden="true" />
      </NavLink>
    </motion.li>
  );
};

const SpatialDock = ({ menuItems = [] }) => {
  const { logout } = useAuth();
  const mouseX = useMotionValue(Infinity);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <div className="spatial-dock-wrapper">
      <motion.div
        className="spatial-dock-container"
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        <ul className="dock-list">
          {menuItems.map((item, index) => (
            <DockItem key={index} item={item} mouseX={mouseX} />
          ))}
          
          <div className="dock-divider" />
          
          {/* Logout Button */}
          <motion.li className="dock-list-item">
            <button
              className="dock-icon-btn logout"
              onClick={handleLogout}
              aria-label="Logout"
              title="Logout"
            >
              <i className="bx bx-log-out" />
            </button>
          </motion.li>
        </ul>
      </motion.div>
    </div>
  );
};

export default SpatialDock;
