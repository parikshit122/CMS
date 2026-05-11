import "boxicons/css/boxicons.min.css";

const TYPE_ICONS = {
  complaint_submitted:  { icon: "bx-plus-circle",   color: "#3b82f6" },
  complaint_assigned:   { icon: "bx-user-check",    color: "#8b5cf6" },
  complaint_resolved:   { icon: "bx-check-circle",  color: "#22c55e" },
  complaint_rejected:   { icon: "bx-x-circle",      color: "#ef4444" },
  complaint_reassigned: { icon: "bx-transfer",      color: "#f59e0b" },
  complaint_inprogress: { icon: "bx-loader-circle", color: "#0ea0e9" },
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

export default function NotificationList({
  items,
  loading,
  onMarkRead,
  onDelete,
  onClick,
}) {
  if (loading && items.length === 0) {
    return (
      <div className="notif-empty">
        <i className="bx bx-loader-alt bx-spin" />
        <p>Loading...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="notif-empty">
        <i className="bx bx-bell-off" />
        <p>No notifications yet</p>
      </div>
    );
  }

  return (
    <div className="notif-list">
      {items.map((item) => {
        const typeInfo = TYPE_ICONS[item.type] || {
          icon: "bx-bell",
          color: "#6b7280",
        };
        return (
          <div
            key={item._id}
            className={`notif-item ${!item.isRead ? "notif-item-unread" : ""}`}
            onClick={() => onClick(item)}
          >
            <div
              className="notif-item-icon"
              style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}
            >
              <i className={`bx ${typeInfo.icon}`} />
            </div>

            <div className="notif-item-content">
              <p className="notif-item-title">{item.title}</p>
              <p className="notif-item-message">{item.message}</p>
              <p className="notif-item-time">{timeAgo(item.createdAt)}</p>
            </div>

            <div className="notif-item-actions">
              {!item.isRead && (
                <button
                  className="notif-dot-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(item._id);
                  }}
                  title="Mark as read"
                >
                  <span className="notif-unread-dot" />
                </button>
              )}
              <button
                className="notif-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item._id);
                }}
                title="Delete"
              >
                <i className="bx bx-x" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}