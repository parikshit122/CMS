export const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day:   "2-digit",
    month: "short",
    year:  "numeric",
  });
};

// "15 Jan 2025, 02:30 PM"
export const formatDateTime = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
};

// "2 hours ago", "3 days ago"
export const timeAgo = (date) => {
  if (!date) return "—";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  if (seconds < 60)  return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)  return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7)      return `${days}d ago`;

  if (days < 30)     return `${Math.floor(days / 7)}w ago`;

  if (days < 365)    return `${Math.floor(days / 30)}mo ago`;

  return `${Math.floor(days / 365)}y ago`;
};

// "Jan 2025"
export const formatMonthYear = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    year:  "numeric",
  });
};

// Days remaining until a future date
export const daysUntil = (date) => {
  if (!date) return 0;
  const diff = new Date(date) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// Is the date in the past
export const isPast = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};