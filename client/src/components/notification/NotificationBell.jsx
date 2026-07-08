import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { onSocketEvent } from "../../services/socketService";
import {
  loadNotifications,
  loadUnreadCount,
  readNotification,
  readAllNotifications,
  removeNotification,
  clearNotifications,
} from "../../redux/notificationSlice";
import NotificationList from "./NotificationList";
import "boxicons/css/boxicons.min.css";

const POLL_INTERVAL = 60000;

export default function NotificationBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { unreadCount, items, loading } = useSelector(
    (state) => state.notifications,
  );

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pollRef = useRef(null);

  const token = localStorage.getItem("accessToken");
  const recentItems = items.slice(0, 5);

  const getNotifPath = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user.role === "admin") return "/admin/notifications";
    if (user.role === "staff") return "/staff/notifications";
    return "/notifications";
  };

  useEffect(() => {
    if (!token) return;

    // Load immediately on mount
    dispatch(loadNotifications());

    const startPolling = () => {
      pollRef.current = setInterval(() => {
        // Only poll when tab is visible
        if (document.visibilityState === "visible") {
          dispatch(loadUnreadCount());
        }
      }, POLL_INTERVAL);
    };

    startPolling();

    // Pause polling when tab hidden, resume when visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Immediately fetch when tab becomes visible again
        dispatch(loadUnreadCount());
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [dispatch, token]);

  useEffect(() => {
    if (!token) return;

    // When a new notification arrives via socket
    const offNew = onSocketEvent("new_notification", () => {
      dispatch(loadUnreadCount());
      if (open) {
        dispatch(loadNotifications());
      }
    });

    return () => offNew();
  }, [dispatch, token, open]);

  useEffect(() => {
    if (open && token) {
      dispatch(loadNotifications());
    }
  }, [open, dispatch, token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (item) => {
    if (!item.isRead) dispatch(readNotification(item._id));
    setOpen(false);
    navigate(getNotifPath());
  };

  const handleMarkRead = (id) => dispatch(readNotification(id));
  const handleMarkAllRead = () => dispatch(readAllNotifications());
  const handleDelete = (id) => dispatch(removeNotification(id));
  const handleClearAll = () => dispatch(clearNotifications());

  const handleViewAll = () => {
    setOpen(false);
    navigate(getNotifPath());
  };

  if (!token) return null;

  return (
    <div className="notif-bell-wrap" ref={dropdownRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <i className="bx bx-bell" />
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <h3>Notifications</h3>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button
                  className="notif-action-btn"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                >
                  <i className="bx bx-check-double" />
                </button>
              )}
              {items.length > 0 && (
                <button
                  className="notif-action-btn notif-action-danger"
                  onClick={handleClearAll}
                  title="Clear all"
                >
                  <i className="bx bx-trash" />
                </button>
              )}
            </div>
          </div>

          <NotificationList
            items={recentItems}
            loading={loading}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            onClick={handleItemClick}
            onClose={() => setOpen(false)}
          />

          <div className="notif-dropdown-footer">
            <button className="notif-footer-btn" onClick={handleViewAll}>
              View all notifications
              <i className="bx bx-right-arrow-alt" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
