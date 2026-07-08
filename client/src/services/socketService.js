import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

let socket = null;

// ── Connect with auth token ───────────────────────────────
export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth:              { token },
    transports:        ["websocket", "polling"],
    reconnection:      true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout:           10000,
  });

  socket.on("connect", () => {
    if (import.meta.env.DEV) {
      console.log("🔌 Socket connected:", socket.id);
    }
  });

  socket.on("disconnect", (reason) => {
    if (import.meta.env.DEV) {
      console.log("🔌 Socket disconnected:", reason);
    }
  });

  socket.on("connect_error", (err) => {
    if (import.meta.env.DEV) {
      console.warn("🔌 Socket connection error:", err.message);
    }
  });

  return socket;
};

// ── Disconnect ────────────────────────────────────────────
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// ── Subscribe to an event ─────────────────────────────────
export const onSocketEvent = (event, callback) => {
  if (!socket) return () => {};
  socket.on(event, callback);
  return () => socket.off(event, callback);
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  onSocketEvent,
};