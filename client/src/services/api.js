import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});
const AUTH_BYPASS_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/social-login",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
  "/auth/refresh-token",
];

const FORCE_LOGOUT_MESSAGES = ["User no longer exists", "Account deactivated"];

const isAuthBypassPath = (url) => {
  if (!url) return false;
  return AUTH_BYPASS_PATHS.some((path) => url.includes(path));
};

const forceLogout = () => {
  sessionStorage.clear();
  window.location.href = "/auth";
};

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const message = error.response?.data?.message || "";
    const status = error.response?.status;

    if (isAuthBypassPath(originalRequest?.url)) {
      return Promise.reject(error);
    }

    if (
      status === 401 &&
      FORCE_LOGOUT_MESSAGES.some((m) => message.includes(m))
    ) {
      forceLogout();
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = sessionStorage.getItem("refreshToken");

      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          "http://localhost:5000/api/auth/refresh-token",
          { refreshToken },
        );

        const newAccessToken = response.data.accessToken;
        sessionStorage.setItem("accessToken", newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return API(originalRequest);
      } catch {
        forceLogout();
      }
    }

    return Promise.reject(error);
  },
);

export default API;
