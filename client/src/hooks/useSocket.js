import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { connectSocket, disconnectSocket, onSocketEvent } from "../services/socketService";
import { loadUnreadCount, loadNotifications } from "../redux/notificationSlice";

const useSocket = () => {
  const dispatch    = useDispatch();
  const socketRef   = useRef(null);
  const cleanupRefs = useRef([]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    // ── Connect socket ──────────────────────────────────
    const socket = connectSocket(token);
    socketRef.current = socket;

    // ── Listen for new notifications ────────────────────
    const offNewNotif = onSocketEvent("new_notification", (notification) => {
      // Refresh unread count immediately
      dispatch(loadUnreadCount());

      // Show browser notification if permitted
      if (
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        new window.Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico",
        });
      }
    });

    // ── Listen for complaint updates ─────────────────────
    const offComplaintUpdate = onSocketEvent("complaint_updated", () => {
      dispatch(loadNotifications());
    });

    cleanupRefs.current = [offNewNotif, offComplaintUpdate];

    // ── Request browser notification permission ──────────
    if (
      "Notification" in window &&
      window.Notification.permission === "default"
    ) {
      window.Notification.requestPermission();
    }

    return () => {
      cleanupRefs.current.forEach((off) => off());
      disconnectSocket();
    };
  }, [dispatch]);

  return socketRef.current;
};

export default useSocket;