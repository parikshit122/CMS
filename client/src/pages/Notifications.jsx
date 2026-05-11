import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  loadNotifications,
  readNotification,
  readAllNotifications,
  removeNotification,
  clearNotifications,
} from "../redux/notificationSlice";
import "../styles/Notifications.css";
import "boxicons/css/boxicons.min.css";

const TYPE_CONFIG = {
  complaint_submitted:  { icon: "bx-plus-circle",   color: "#3b82f6", bg: "#eff6ff",   label: "Submitted"   },
  complaint_assigned:   { icon: "bx-user-check",    color: "#8b5cf6", bg: "#f5f3ff",   label: "Assigned"    },
  complaint_resolved:   { icon: "bx-check-circle",  color: "#22c55e", bg: "#f0fdf4",   label: "Resolved"    },
  complaint_rejected:   { icon: "bx-x-circle",      color: "#ef4444", bg: "#fef2f2",   label: "Rejected"    },
  complaint_reassigned: { icon: "bx-transfer",      color: "#f59e0b", bg: "#fffbeb",   label: "Reassigned"  },
  complaint_inprogress: { icon: "bx-loader-circle", color: "#0ea0e9", bg: "#f0f9ff",   label: "In Progress" },
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

export default function Notifications() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, unreadCount, loading } = useSelector(
    (state) => state.notifications,
  );

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(loadNotifications());
  }, [dispatch]);

  const filtered = items.filter((item) => {
    if (filter === "unread" && item.isRead) return false;
    if (filter === "read" && !item.isRead) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleClick = (item) => {
    if (!item.isRead) dispatch(readNotification(item._id));
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    dispatch(removeNotification(id));
  };

  const handleMarkRead = (e, id) => {
    e.stopPropagation();
    dispatch(readNotification(id));
  };

  return (
    <div className="notif-page">
      <div className="notif-page-header">
        <div className="notif-page-title-row">
          <div>
            <h1 className="notif-page-title">Notifications</h1>
            <p className="notif-page-subtitle">
              You have <strong>{unreadCount}</strong> unread notification
              {unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="notif-page-actions">
            {unreadCount > 0 && (
              <button
                className="notif-page-btn"
                onClick={() => dispatch(readAllNotifications())}
              >
                <i className="bx bx-check-double" />
                Mark all read
              </button>
            )}
            {items.length > 0 && (
              <button
                className="notif-page-btn notif-page-btn-danger"
                onClick={() => dispatch(clearNotifications())}
              >
                <i className="bx bx-trash" />
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="notif-page-controls">
          <div className="notif-page-filters">
            {["all", "unread", "read"].map((f) => (
              <button
                key={f}
                className={`notif-filter-btn ${filter === f ? "active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" && `All (${items.length})`}
                {f === "unread" && `Unread (${unreadCount})`}
                {f === "read" && `Read (${items.length - unreadCount})`}
              </button>
            ))}
          </div>

          <div className="notif-page-search">
            <i className="bx bx-search" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="notif-page-body">
        {loading && items.length === 0 ? (
          <div className="notif-page-empty">
            <i className="bx bx-loader-alt bx-spin" />
            <p>Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="notif-page-empty">
            <i className="bx bx-bell-off" />
            <h3>No notifications</h3>
            <p>
              {filter !== "all"
                ? "No notifications match this filter."
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="notif-page-list">
            {filtered.map((item) => {
              const config = TYPE_CONFIG[item.type] || {
                icon: "bx-bell",
                color: "#6b7280",
                bg: "#f9fafb",
                label: "Notification",
              };

              return (
                <div
                  key={item._id}
                  className={`notif-page-item ${!item.isRead ? "unread" : ""}`}
                  onClick={() => handleClick(item)}
                >
                  <div
                    className="notif-page-item-icon"
                    style={{ background: config.bg, color: config.color }}
                  >
                    <i className={`bx ${config.icon}`} />
                  </div>

                  <div className="notif-page-item-body">
                    <div className="notif-page-item-top">
                      <h4 className="notif-page-item-title">{item.title}</h4>
                      <span
                        className="notif-page-item-badge"
                        style={{ background: config.bg, color: config.color }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="notif-page-item-message">{item.message}</p>
                    <div className="notif-page-item-meta">
                      <span className="notif-page-item-time">
                        <i className="bx bx-time-five" />
                        {timeAgo(item.createdAt)}
                      </span>
                      {item.sender?.name && (
                        <span className="notif-page-item-sender">
                          <i className="bx bx-user" />
                          {item.sender.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="notif-page-item-actions">
                    {!item.isRead && (
                      <button
                        className="notif-page-item-btn read-btn"
                        onClick={(e) => handleMarkRead(e, item._id)}
                        title="Mark as read"
                      >
                        <i className="bx bx-check" />
                      </button>
                    )}
                    <button
                      className="notif-page-item-btn delete-btn"
                      onClick={(e) => handleDelete(e, item._id)}
                      title="Delete"
                    >
                      <i className="bx bx-trash" />
                    </button>
                  </div>

                  {!item.isRead && <div className="notif-page-item-dot" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}