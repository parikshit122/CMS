import API from "./api";

export const fetchSettings = async () => {
  const response = await API.get("/settings");
  return response.data;
};

export const updateSettings = async (updates) => {
  const response = await API.patch("/settings", updates);
  return response.data;
};

export const fetchSystemStats = async () => {
  const response = await API.get("/settings/system-stats");
  return response.data;
};

export const addCategory = async (category) => {
  const response = await API.post("/settings/categories", { category });
  return response.data;
};

export const deleteCategory = async (name) => {
  const response = await API.delete(`/settings/categories/${name}`);
  return response.data;
};

export const sendTestEmail = async (email) => {
  const response = await API.post("/settings/test-email", { email });
  return response.data;
};

export const clearOldResolved = async (days) => {
  const response = await API.post("/settings/danger/clear-old-resolved", {
    days,
  });
  return response.data;
};

export const clearAllNotifications = async () => {
  const response = await API.post("/settings/danger/clear-notifications");
  return response.data;
};