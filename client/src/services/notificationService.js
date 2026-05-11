import API from "./api";

export const fetchNotifications = async (page = 1, limit = 20) => {
  const response = await API.get(`/notifications?page=${page}&limit=${limit}`);
  return response.data;
};

export const fetchUnreadCount = async () => {
  const response = await API.get("/notifications/unread-count");
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await API.patch(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await API.patch("/notifications/mark-all-read");
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await API.delete(`/notifications/${id}`);
  return response.data;
};

export const clearAllNotifications = async () => {
  const response = await API.delete("/notifications/clear-all");
  return response.data;
};