import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Button from "../../components/common/Button";
import { useAlert } from "../../components/common/Alert";
import { loginUser, registerUser } from "../../services/authService";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import SuspendedScreen from "../../components/auth/SuspendedScreen";
import "../../styles/Login.css";
import "boxicons/css/boxicons.min.css";

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

import {
  auth,
  authReady,
  googleProvider,
  githubProvider,
  twitterProvider,
  facebookProvider,
  isMobileDevice,
} from "../../firebase";

console.log("🔥 Firebase auth loaded:", !!auth, auth?.app?.name);

const getRoleRedirect = (role) => {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/dashboard";
};

const SOCIAL_PROVIDERS = ["google", "github", "twitter", "facebook"];

const PROVIDER_LABELS = {
  google: "Sign in with Google",
  github: "Sign in with GitHub",
  twitter: "Sign in with Twitter",
  facebook: "Sign in with Facebook",
};

const REDIRECT_PROVIDER_KEY = "auth_redirect_provider";
const REDIRECT_PROCESSED_KEY = "auth_redirect_processed";

function SocialButtons({ onSocialClick, loading }) {
  return (
    <div
      className="social-icons"
      role="group"
      aria-label="Social login options"
    >
      {SOCIAL_PROVIDERS.map((provider) => (
        <button
          key={provider}
          type="button"
          className="social-btn"
          onClick={() => {
            console.log("🔴 Button clicked:", provider);
            onSocialClick(provider);
          }}
          disabled={loading}
          aria-label={PROVIDER_LABELS[provider]}
          title={PROVIDER_LABELS[provider]}
        >
          <i className={`bx bxl-${provider}`} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function Login() {
  const [isActive, setIsActive] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [suspensionData, setSuspensionData] = useState(null);

  const redirectHandledRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const alert = useAlert();
  const { login } = useAuth();

  useEffect(() => {
    const testIDB = async () => {
      try {
        const req = indexedDB.open("test-db", 1);
        req.onsuccess = () => console.log("✅ IndexedDB works");
        req.onerror = () => console.log("❌ IndexedDB blocked");
      } catch (e) {
        console.log("❌ IndexedDB error:", e);
      }
    };
    testIDB();
  }, []);

  useEffect(() => {
    const panel = location.state?.panel;
    setIsActive(panel === "register");
  }, [location.state]);

  useEffect(() => {
    let mounted = true;

    const processSocialLogin = async (user, providerName) => {
      try {
        setLoading(true);

        const firebaseEmail = user.email || user.providerData?.[0]?.email || "";
        const firebaseName =
          user.displayName || user.providerData?.[0]?.displayName || "";
        const firebaseAvatar =
          user.photoURL || user.providerData?.[0]?.photoURL || "";

        console.log("📧 Email:", firebaseEmail);

        if (!firebaseEmail) {
          alert.error("Email not shared. Please try another method.");
          await auth.signOut().catch(() => {});
          return;
        }

        console.log("🔑 Getting ID token...");
        const idToken = await user.getIdToken(true);
        console.log("✅ Got token, length:", idToken.length);

        console.log("🌐 Calling backend...");
        const response = await API.post("/auth/social-login", {
          idToken,
          email: firebaseEmail,
          name: firebaseName,
          avatar: firebaseAvatar,
          provider: providerName,
        });

        console.log("✅ Backend response:", response.data);

        try {
          await auth.signOut();
          console.log("✅ Firebase session cleared");
        } catch (signOutErr) {
          console.warn("Sign out warning:", signOutErr);
        }

        if (response.data.success && mounted) {
          const { accessToken, refreshToken, user: userData } = response.data;
          login(userData, accessToken, refreshToken);
          alert.success("Login successful");
          navigate(getRoleRedirect(userData.role), { replace: true });
        }
      } catch (err) {
        console.error("❌ Process error:", err);

        try {
          await auth.signOut();
        } catch (e) {}

        const status = err?.response?.status;
        const message = err?.response?.data?.message;

        if (status === 404) {
          alert.error("Account not registered. Please register first.");
        } else if (message) {
          alert.error(message);
        } else {
          alert.error("Login failed");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const handleRedirectResult = async () => {
      if (redirectHandledRef.current) {
        console.log("⏭️ Already handled");
        return;
      }

      const alreadyProcessed = localStorage.getItem(REDIRECT_PROCESSED_KEY);
      if (alreadyProcessed) {
        console.log("⏭️ Already processed");
        localStorage.removeItem(REDIRECT_PROCESSED_KEY);
        await auth.signOut().catch(() => {});
        return;
      }

      redirectHandledRef.current = true;

      try {
        await authReady;
        console.log("✅ Auth persistence ready");

        if (!auth) {
          console.error("❌ Auth not initialized!");
          return;
        }

        console.log("🔍 Checking redirect result...");
        console.log(
          "📋 localStorage flag:",
          localStorage.getItem(REDIRECT_PROVIDER_KEY),
        );
        console.log(
          "👤 auth.currentUser before:",
          auth.currentUser?.email || "null",
        );

        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("⏰ After 2s wait");
        console.log(
          "👤 auth.currentUser after wait:",
          auth.currentUser?.email || "null",
        );

        const result = await getRedirectResult(auth);
        console.log(
          "📦 Redirect result:",
          result ? `Found: ${result.user.email}` : "None",
        );

        const providerName =
          localStorage.getItem(REDIRECT_PROVIDER_KEY) || "google";

        if (result?.user && mounted) {
          console.log("✅ Processing via getRedirectResult");
          localStorage.setItem(REDIRECT_PROCESSED_KEY, "true");
          localStorage.removeItem(REDIRECT_PROVIDER_KEY);
          await processSocialLogin(result.user, providerName);
        } else if (auth.currentUser && mounted) {
          const hasFlag = localStorage.getItem(REDIRECT_PROVIDER_KEY);
          if (hasFlag) {
            console.log("⚠️ Processing via currentUser fallback");
            localStorage.setItem(REDIRECT_PROCESSED_KEY, "true");
            localStorage.removeItem(REDIRECT_PROVIDER_KEY);
            await processSocialLogin(auth.currentUser, providerName);
          }
        } else {
          console.log("❌ No user found anywhere");
        }
      } catch (err) {
        console.error("❌ Redirect handler error:", err);
        console.error("Code:", err?.code);
      }
    };

    handleRedirectResult();

    return () => {
      mounted = false;
    };
  }, []);

  const handleBack = () => navigate("/");

  const handleLoginChange = (e) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });

  const handleRegisterChange = (e) =>
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });

  const checkSuspension = (errorResponse, attemptedEmail) => {
    if (errorResponse?.status === 403 && errorResponse?.data?.suspendedUntil) {
      setSuspensionData({
        email: attemptedEmail,
        suspendedUntil: errorResponse.data.suspendedUntil,
        reason: errorResponse.data.reason || "",
      });
      return true;
    }
    return false;
  };

  const handleSocialLogin = async (providerName) => {
    console.log("🔴 handleSocialLogin called:", providerName);

    await authReady;
    console.log("✅ Auth ready for sign-in");

    const providers = {
      google: googleProvider,
      facebook: facebookProvider,
      github: githubProvider,
      twitter: twitterProvider,
    };

    const provider = providers[providerName];
    if (!provider) {
      console.error("❌ Provider not found:", providerName);
      return;
    }

    let firebaseEmail = "";

    try {
      setLoading(true);

      console.log("🪟 Opening popup...");

      let result;
      try {
        result = await signInWithPopup(auth, provider);
        console.log("✅ Popup login succeeded");
        console.log("👤 User email:", result.user.email);
      } catch (popupErr) {
        console.warn("Popup error:", popupErr.code, popupErr.message);

        if (popupErr.code === "auth/popup-closed-by-user") {
          return;
        }
        if (popupErr.code === "auth/cancelled-popup-request") {
          return;
        }
        if (popupErr.code === "auth/popup-blocked") {
          alert.error(
            "Popup blocked! Please allow popups for this site in browser settings, then try again.",
          );
          return;
        }

        throw popupErr;
      }

      firebaseEmail =
        result.user.email || result.user.providerData?.[0]?.email || "";

      const firebaseName =
        result.user.displayName ||
        result.user.providerData?.[0]?.displayName ||
        "";

      const firebaseAvatar =
        result.user.photoURL || result.user.providerData?.[0]?.photoURL || "";

      console.log("📧 Email:", firebaseEmail);
      console.log("👤 Name:", firebaseName);

      if (!firebaseEmail) {
        alert.error(
          `${providerName.charAt(0).toUpperCase() + providerName.slice(1)} did not share your email.`,
        );
        await auth.signOut().catch(() => {});
        return;
      }

      console.log("🔑 Getting ID token...");
      const idToken = await result.user.getIdToken(true);
      console.log("✅ Got token, length:", idToken.length);

      console.log("🌐 ABOUT TO CALL BACKEND");
      console.log("📍 API base URL:", import.meta.env.VITE_API_URL);
      console.log(
        "📍 Full URL will be:",
        `${import.meta.env.VITE_API_URL}/auth/social-login`,
      );

      const response = await API.post("/auth/social-login", {
        idToken,
        email: firebaseEmail,
        name: firebaseName,
        avatar: firebaseAvatar,
        provider: providerName,
      });

      console.log("✅ Backend responded:", response.status);
      console.log("📦 Response data:", response.data);

      await auth.signOut().catch(() => {});

      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        login(user, accessToken, refreshToken);
        alert.success("Login successful");
        console.log("🚀 Navigating to:", getRoleRedirect(user.role));
        navigate(getRoleRedirect(user.role), { replace: true });
      }
    } catch (err) {
      console.error("❌ Social login error:");
      console.error("  Error type:", err.constructor.name);
      console.error("  Error code:", err?.code);
      console.error("  Error message:", err?.message);
      console.error("  Error response status:", err?.response?.status);
      console.error("  Error response data:", err?.response?.data);
      console.error("  Full error:", err);

      await auth.signOut().catch(() => {});

      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      const isSuspended = checkSuspension(err.response, firebaseEmail);
      if (isSuspended) return;

      if (status === 404) {
        alert.error(
          `${firebaseEmail} is not registered. Please register first.`,
        );
        return;
      }

      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        alert.error("Network error. Please check your internet and try again.");
        return;
      }

      alert.error(message || "Social login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const { email, password } = loginData;

    if (!email) {
      alert.error("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert.error("Please enter a valid email address.");
      return;
    }

    if (!password) {
      alert.error("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const response = await loginUser(loginData);
      if (response.success) {
        const { accessToken, refreshToken, user } = response;
        login(user, accessToken, refreshToken);
        alert.success("Login successful!");
        navigate(getRoleRedirect(user.role), { replace: true });
      } else {
        alert.error(response.message || "Login failed. Please try again.");
      }
    } catch (err) {
      const isSuspended = checkSuspension(err.response, loginData.email);
      if (isSuspended) return;

      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        alert.error(
          "Cannot connect to server. Please check your internet connection.",
        );
        return;
      }

      alert.error(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0] ||
          "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    const { name, email, phone, password } = registerData;

    if (!name || name.trim().length < 2) {
      alert.error("Name must be at least 2 characters long.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert.error("Please enter a valid email address.");
      return;
    }

    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      alert.error("Phone number must be exactly 10 digits.");
      return;
    }

    if (!password) {
      alert.error("Password is required.");
      return;
    }

    if (password.length < 8) {
      alert.error("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      alert.error("Password must contain at least one uppercase letter (A-Z).");
      return;
    }

    if (!/[a-z]/.test(password)) {
      alert.error("Password must contain at least one lowercase letter (a-z).");
      return;
    }

    if (!/\d/.test(password)) {
      alert.error("Password must contain at least one number (0-9).");
      return;
    }

    if (!/[@$!%*?&#]/.test(password)) {
      alert.error(
        "Password must contain at least one special character (@$!%*?&#).",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await registerUser(registerData);
      if (response.success) {
        const { accessToken, refreshToken, user } = response;
        login(user, accessToken, refreshToken);
        alert.success("Registration successful!");
        navigate(getRoleRedirect(user.role), { replace: true });
      } else {
        alert.error(response.message || "Registration failed");
      }
    } catch (err) {
      alert.error(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0] ||
          "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="outer-container">
      <Button
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 9999,
        }}
        onClick={handleBack}
        aria-label="Go back to home page"
      >
        <i className="bx bx-arrow-back" aria-hidden="true" /> Back
      </Button>

      <div
        className={`logincontainer ${isActive ? "active" : ""}`}
        aria-live="polite"
      >
        <div
          className="form-box login"
          role="region"
          aria-label="Login form"
          aria-hidden={isActive}
        >
          <form onSubmit={handleLogin} noValidate>
            <h1 id="login-heading">Login</h1>

            <div className="input-box">
              <label htmlFor="login-email" className="visually-hidden">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                required
                placeholder="Enter Email"
                value={loginData.email}
                onChange={handleLoginChange}
                autoComplete="email"
                aria-required="true"
              />
              <i className="bx bxs-envelope" aria-hidden="true" />
            </div>

            <div className="input-box">
              <label htmlFor="login-password" className="visually-hidden">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                required
                placeholder="Enter Password"
                value={loginData.password}
                onChange={handleLoginChange}
                autoComplete="current-password"
                aria-required="true"
              />
              <i className="bx bxs-lock-alt" aria-hidden="true" />
            </div>

            <div className="forgot-link">
              <Link to="/auth/forgot-password" className="forgot-btn">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="login-btn"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            <p>Or login with social platforms</p>
            <SocialButtons
              onSocialClick={handleSocialLogin}
              loading={loading}
            />
          </form>
        </div>

        <div
          className="form-box register"
          role="region"
          aria-label="Registration form"
          aria-hidden={!isActive}
        >
          <form onSubmit={handleRegister} noValidate>
            <h1 id="register-heading">Registration</h1>

            <div className="input-box">
              <label htmlFor="reg-name" className="visually-hidden">
                Full name
              </label>
              <input
                id="reg-name"
                type="text"
                name="name"
                required
                placeholder="Enter Username"
                value={registerData.name}
                onChange={handleRegisterChange}
                autoComplete="name"
                aria-required="true"
              />
              <i className="bx bxs-user" aria-hidden="true" />
            </div>

            <div className="input-box">
              <label htmlFor="reg-email" className="visually-hidden">
                Email address
              </label>
              <input
                id="reg-email"
                type="email"
                name="email"
                required
                placeholder="Enter Email"
                value={registerData.email}
                onChange={handleRegisterChange}
                autoComplete="email"
                aria-required="true"
              />
              <i className="bx bxs-envelope" aria-hidden="true" />
            </div>

            <div className="input-box">
              <label htmlFor="reg-phone" className="visually-hidden">
                Mobile number
              </label>
              <input
                id="reg-phone"
                type="tel"
                name="phone"
                required
                pattern="[0-9]{10}"
                maxLength="10"
                placeholder="Enter 10-digit Mobile Number"
                value={registerData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  handleRegisterChange({ target: { name: "phone", value } });
                }}
                autoComplete="tel"
                aria-required="true"
              />
              <i className="bx bxs-phone" aria-hidden="true" />
            </div>

            <div className="input-box">
              <label htmlFor="reg-password" className="visually-hidden">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                name="password"
                required
                placeholder="Enter Password"
                value={registerData.password}
                onChange={handleRegisterChange}
                autoComplete="new-password"
                aria-required="true"
              />
              <i className="bx bxs-lock-alt" aria-hidden="true" />
            </div>

            <Button
              type="submit"
              className="register-btn"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Registering..." : "Register"}
            </Button>

            <p>Or register with social platforms</p>
            <SocialButtons
              onSocialClick={handleSocialLogin}
              loading={loading}
            />
          </form>
        </div>

        <div className="toggle-box" aria-hidden="true">
          <div className="toggle-panel toggle-left">
            <h1>Hello, Welcome!</h1>
            <p>Don't have an account?</p>
            <Button
              className="register-btn"
              onClick={() => setIsActive(true)}
              tabIndex={isActive ? -1 : 0}
            >
              Register
            </Button>
          </div>
          <div className="toggle-panel toggle-right">
            <h1>Welcome Back!</h1>
            <p>Already have an account?</p>
            <Button
              className="login-btn"
              onClick={() => setIsActive(false)}
              tabIndex={isActive ? 0 : -1}
            >
              Login
            </Button>
          </div>
        </div>
      </div>

      {suspensionData && (
        <SuspendedScreen
          email={suspensionData.email}
          suspendedUntil={suspensionData.suspendedUntil}
          reason={suspensionData.reason}
          onClose={() => setSuspensionData(null)}
        />
      )}
    </div>
  );
}

export default Login;
