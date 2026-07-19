import { useState, useId } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import SpatialDock from "../components/layout/SpatialDock";
import NotificationBell from "../components/notification/NotificationBell";
import useAuthSync from "../hooks/useAuthSync";
import "../styles/Dashboard.css";

export default function DashboardLayout({
  children,
  role = "User",
  menuItems = null,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuth();
  useAuthSync();

  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : role;

  const defaultMenuItems = {
    Admin: [
      { path: "/admin/dashboard", label: "Overview", icon: "bx bx-grid-alt", end: true },
      { path: "/admin/complaints", label: "Complaints", icon: "bx bx-list-ul" },
      { path: "/admin/users", label: "Users", icon: "bx bx-group" },
      { path: "/admin/reports", label: "Reports", icon: "bx bx-pie-chart-alt-2" },
      { path: "/admin/settings", label: "Settings", icon: "bx bx-cog" },
    ],
    Staff: [
      { path: "/staff/dashboard", label: "Dashboard", icon: "bx bx-grid-alt", end: true },
      { path: "/staff/complaints", label: "Tasks", icon: "bx bx-task" },
      { path: "/profile", label: "Profile", icon: "bx bx-user" },
    ],
    User: [
      { path: "/student/dashboard", label: "Hub", icon: "bx bx-home-alt", end: true },
      { path: "/submit", label: "New Request", icon: "bx bx-plus-circle" },
      { path: "/complaints", label: "History", icon: "bx bx-history" },
      { path: "/profile", label: "Profile", icon: "bx bx-user" },
    ],
  };

  const currentMenuItems = menuItems || defaultMenuItems[displayRole] || defaultMenuItems.User;

  // Z-Axis Entrance Animations
  const spatialTransition = {
    initial: { opacity: 0, z: -200, scale: 0.95 },
    animate: { opacity: 1, z: 0, scale: 1 },
    exit: { opacity: 0, z: 100, scale: 1.05 },
    transition: { type: "spring", stiffness: 200, damping: 20, duration: 0.5 },
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="spatial-layout-wrapper">
      
      {/* Minimalistic Dynamic Island Header */}
      <header className="dynamic-island-header">
        <div className="dynamic-island-content">
          
          <div 
            className="island-brand"
            onClick={() => {
              const dashRoute = user?.role === "admin" ? "/admin" : user?.role === "staff" ? "/staff" : "/dashboard";
              navigate(dashRoute);
            }}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            title="Go to Dashboard"
          >
            <i className="bx bx-atom bx-spin-hover neon-text-orange" />
          </div>

          <div className="island-actions">
            <NotificationBell />
            
            <div
              className="island-avatar"
              onClick={() => navigate("/profile")}
              role="button"
              tabIndex={0}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name || "User"} />
              ) : (
                <span>{(user?.name || "U")[0].toUpperCase()}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <div className="spatial-main-viewport">
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            className="main-content-bento"
            initial={prefersReducedMotion ? { opacity: 0 } : spatialTransition.initial}
            animate={prefersReducedMotion ? { opacity: 1 } : spatialTransition.animate}
            exit={prefersReducedMotion ? { opacity: 0 } : spatialTransition.exit}
            transition={prefersReducedMotion ? { duration: 0.2 } : spatialTransition.transition}
            style={{ transformStyle: "preserve-3d", perspective: "1000px" }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Bottom Floating Glass Dock */}
      <SpatialDock menuItems={currentMenuItems} />
    </div>
  );
}
