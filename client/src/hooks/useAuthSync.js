import { useEffect } from "react";
import API from "../services/api";

const useAuthSync = (intervalMs = 5000) => {
  useEffect(() => {
    const sync = async () => {
      try {
        const res = await API.get("/auth/me");
        if (!res.data?.success) return;

        const latest = res.data.user;
        const stored = JSON.parse(sessionStorage.getItem("user"));

        if (!stored) return;

        if (JSON.stringify(latest) !== JSON.stringify(stored)) {
          sessionStorage.setItem("user", JSON.stringify(latest));
          window.dispatchEvent(new Event("user-updated"));
        }
      } catch {
        // silent fail
      }
    };

    sync();
    const id = setInterval(sync, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
};

export default useAuthSync;