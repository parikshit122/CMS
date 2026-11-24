import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { connectSocket, disconnectSocket, onSocketEvent } from "../services/socketService";
import { loadUnreadCount, loadNotifications } from "../redux/notificationSlice";
import toast from "../utils/toastStore";

const mapNotificationToastType = (type) => {
  if (type === "complaint_resolved") return "success";
  if (type === "complaint_rejected") return "warning";
  return "info";
};

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

      if (notification?.message) {
        toast.show(notification.message, mapNotificationToastType(notification.type), {
          title: notification.title || "Notification",
        });
      }

      // Show browser notification if permitted
      if (
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        new window.Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.svg",
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