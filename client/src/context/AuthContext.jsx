import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("accessToken");

      if (
        storedUser &&
        storedUser !== "undefined" &&
        storedUser !== "null" &&
        storedToken
      ) {
        setUser(JSON.parse(storedUser));
        console.log("✅ Restored user from localStorage");
      }
    } catch (err) {
      console.error("Failed to parse user from localStorage:", err);
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const reloadUser = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("user"));
        if (stored) setUser(stored);
      } catch (err) {
        console.error("Failed to reload user:", err);
      }
    };

    window.addEventListener("user-updated", reloadUser);
    window.addEventListener("storage", reloadUser);

    return () => {
      window.removeEventListener("user-updated", reloadUser);
      window.removeEventListener("storage", reloadUser);
    };
  }, []);

  const login = (userData, accessToken, refreshToken) => {
    if (!userData || !accessToken || !refreshToken) {
      console.error("Invalid login data");
      return;
    }
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    console.log("✅ Login data saved to localStorage");
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

      const response = await API.post("/auth/refresh-token", {
        refreshToken,
      });

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