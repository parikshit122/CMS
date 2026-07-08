import { useEffect, useRef } from "react";
import API from "../services/api";

const useAuthSync = (intervalMs = 30000) => {
  // Use ref to always have latest intervalMs without re-running effect
  const intervalRef = useRef(intervalMs);
  intervalRef.current = intervalMs;

  useEffect(() => {
    let isMounted = true;

    const sync = async () => {
      try {
        const token = localStorage.getItem("accessToken");

        // Don't sync if no token
        if (!token) return;

        const res = await API.get("/auth/me");
        if (!res.data?.success || !isMounted) return;

        const latest = res.data.user;
        const stored = JSON.parse(localStorage.getItem("user") || "null");

        if (!stored) return;

        // Only update if something actually changed
        if (JSON.stringify(latest) !== JSON.stringify(stored)) {
          localStorage.setItem("user", JSON.stringify(latest));
          window.dispatchEvent(new Event("user-updated"));
        }
      } catch {
        // Silent fail — token expiry handled by api.js interceptor
      }
    };

    // Run once immediately
    sync();

    // Then poll at interval
    const id = setInterval(sync, intervalRef.current);

    return () => {
      isMounted = false;
      clearInterval(id);
    };
  // Empty deps — only run once on mount, interval controlled by ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

export default useAuthSync;