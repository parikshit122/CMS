import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "../services/notificationService";

export const loadNotifications = createAsyncThunk(
  "notifications/loadAll",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchNotifications();
      return data;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed to load");
    }
  },
);

export const loadUnreadCount = createAsyncThunk(
  "notifications/loadUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchUnreadCount();
      return data.unreadCount;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed");
    }
  },
);

export const readNotification = createAsyncThunk(
  "notifications/markRead",
  async (id, { rejectWithValue }) => {
    try {
      await markNotificationRead(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed");
    }
  },
);

export const readAllNotifications = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      await markAllNotificationsRead();
      return true;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed");
    }
  },
);

export const removeNotification = createAsyncThunk(
  "notifications/delete",
  async (id, { rejectWithValue }) => {
    try {
      await deleteNotification(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed");
    }
  },
);

export const clearNotifications = createAsyncThunk(
  "notifications/clearAll",
  async (_, { rejectWithValue }) => {
    try {
      await clearAllNotifications();
      return true;
    } catch (err) {
      return rejectWithValue(err?.response?.data?.message || "Failed");
    }
  },
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    resetNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(loadNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loadUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(readNotification.fulfilled, (state, action) => {
        const id = action.payload;
        const item = state.items.find((n) => n._id === id);
        if (item && !item.isRead) {
          item.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(readAllNotifications.fulfilled, (state) => {
        state.items.forEach((n) => (n.isRead = true));
        state.unreadCount = 0;
      })
      .addCase(removeNotification.fulfilled, (state, action) => {
        const id = action.payload;
        const item = state.items.find((n) => n._id === id);
        if (item && !item.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.items = state.items.filter((n) => n._id !== id);
      })
      .addCase(clearNotifications.fulfilled, (state) => {
        state.items = [];
        state.unreadCount = 0;
      });
  },
});

export const { resetNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;