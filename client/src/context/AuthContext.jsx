import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext();

const isDev = import.meta.env.DEV;

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on mount ────────
  useEffect(() => {
    try {
      const storedUser  = localStorage.getItem("user");
      const storedToken = localStorage.getItem("accessToken");

      if (
        storedUser  &&
        storedUser  !== "undefined" &&
        storedUser  !== "null"      &&
        storedToken
      ) {
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      if (isDev) console.error("Failed to restore session:", err);
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Listen for user-updated events ───────────────────
  useEffect(() => {
    const reloadUser = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("user"));
        if (stored) setUser(stored);
      } catch (err) {
        if (isDev) console.error("Failed to reload user:", err);
      }
    };

    window.addEventListener("user-updated", reloadUser);
    window.addEventListener("storage",      reloadUser);

    return () => {
      window.removeEventListener("user-updated", reloadUser);
      window.removeEventListener("storage",      reloadUser);
    };
  }, []);

  const login = (userData, accessToken, refreshToken) => {
    if (!userData || !accessToken || !refreshToken) {
      if (isDev) console.error("Invalid login data");
      return;
    }
    localStorage.setItem("accessToken",  accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user",         JSON.stringify(userData));
    setUser(userData);
  };

  const updateUser = (userData) => {
    if (!userData) return;
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    window.dispatchEvent(new Event("user-updated"));
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token");

      const response = await API.post("/auth/refresh-token", { refreshToken });
      localStorage.setItem("accessToken", response.data.accessToken);
      return response.data.accessToken;
    } catch {
      logout();
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, updateUser, refreshAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);