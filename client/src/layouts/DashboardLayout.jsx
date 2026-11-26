import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import SpatialDock from "../components/layout/SpatialDock";
import NotificationBell from "../components/notification/NotificationBell";
import PWAInstallButton from "../components/pwa/PWAInstallButton";
import JudgeDemoSwitcher from "../components/demo/JudgeDemoSwitcher";
import useAuthSync from "../hooks/useAuthSync";
import {
  OPEN_COMMAND_PALETTE_EVENT,
  OPEN_SHORTCUTS_HELP_EVENT,
  isMacPlatform,
} from "../utils/shortcuts";
import "../styles/Dashboard.css";

export default function DashboardLayout({
  children,
  role = "User",
  menuItems = null,
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const mac = useMemo(() => isMacPlatform(), []);
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
          
          <button
            type="button"
            className="island-brand island-theme-toggle-left"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode (${mac ? "⌘⇧L" : "Ctrl+Shift+L"})`}
            aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            <i className={`bx ${theme === "dark" ? "bx-sun" : "bx-moon"} neon-text-orange`} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="island-cmd-trigger"
            onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
            aria-label="Open quick search and command palette"
            title={`Quick Search (${mac ? "⌘K" : "Ctrl+K"})`}
          >
            <i className="bx bx-search" aria-hidden="true" />
            <span className="island-cmd-trigger__text">Search...</span>
            <span className="cs-kbd-group" aria-hidden="true">
              <kbd className="cs-kbd">{mac ? "⌘" : "Ctrl"}</kbd>
              <kbd className="cs-kbd">K</kbd>
            </span>
          </button>

          <div className="island-actions">
            {user?.isDemo && <JudgeDemoSwitcher variant="compact" />}
            <PWAInstallButton compact />
            <button
              type="button"
              className="island-shortcuts-btn"
              onClick={() => window.dispatchEvent(new Event(OPEN_SHORTCUTS_HELP_EVENT))}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <i className="bx bx-command" aria-hidden="true" />
            </button>

            <NotificationBell />
            
            <button
              type="button"
              className="island-avatar"
              onClick={() => navigate("/profile")}
              aria-label={`Open profile (${user?.name || "Account"})`}
              title={`Profile — ${user?.name || "Account"}`}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name || "User"} />
              ) : (
                <span>{(user?.name || "U")[0].toUpperCase()}</span>
              )}
            </button>
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
