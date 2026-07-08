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

import { signInWithPopup, getRedirectResult } from "firebase/auth";

import {
  auth,
  authReady,
  googleProvider,
  githubProvider,
  twitterProvider,
  facebookProvider,
} from "../../firebase";

// ✅ Only log in development
const isDev = import.meta.env.DEV;
const devLog = (...args) => {
  if (isDev) console.log(...args);
};

const getRoleRedirect = (role) => {
  const r = role?.toLowerCase();
  if (r === "admin") return "/admin";
  if (r === "staff") return "/staff";
  return "/dashboard";
};

// ✅ Sanitize input before sending to API
const sanitizeInput = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/<[^>]*>/g, "");
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
          onClick={() => onSocialClick(provider)}
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

        if (!firebaseEmail) {
          alert.error("Email not shared. Please try another method.");
          await auth.signOut().catch(() => {});
          return;
        }

        // ✅ Don't log the actual token
        devLog("🔑 Getting ID token...");
        const idToken = await user.getIdToken(true);
        devLog("✅ Got token successfully");

        const response = await API.post("/auth/social-login", {
          idToken,
          email: firebaseEmail,
          name: firebaseName,
          avatar: firebaseAvatar,
          provider: providerName,
        });

        try {
          await auth.signOut();
        } catch (signOutErr) {
          devLog("Sign out warning:", signOutErr);
        }

        if (response.data.success && mounted) {
          const { accessToken, refreshToken, user: userData } = response.data;
          login(userData, accessToken, refreshToken);
          alert.success("Login successful");
          navigate(getRoleRedirect(userData.role), { replace: true });
        }
      } catch (err) {
        devLog("❌ Process error:", err);

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
          alert.error("Login failed. Please try again.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const handleRedirectResult = async () => {
      if (redirectHandledRef.current) return;

      const alreadyProcessed = localStorage.getItem(REDIRECT_PROCESSED_KEY);
      if (alreadyProcessed) {
        localStorage.removeItem(REDIRECT_PROCESSED_KEY);
        await auth.signOut().catch(() => {});
        return;
      }

      redirectHandledRef.current = true;

      try {
        await authReady;

        if (!auth) return;

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const result = await getRedirectResult(auth);
        const providerName =
          localStorage.getItem(REDIRECT_PROVIDER_KEY) || "google";

        if (result?.user && mounted) {
          localStorage.setItem(REDIRECT_PROCESSED_KEY, "true");
          localStorage.removeItem(REDIRECT_PROVIDER_KEY);
          await processSocialLogin(result.user, providerName);
        } else if (auth.currentUser && mounted) {
          const hasFlag = localStorage.getItem(REDIRECT_PROVIDER_KEY);
          if (hasFlag) {
            localStorage.setItem(REDIRECT_PROCESSED_KEY, "true");
            localStorage.removeItem(REDIRECT_PROVIDER_KEY);
            await processSocialLogin(auth.currentUser, providerName);
          }
        }
      } catch (err) {
        devLog("❌ Redirect handler error:", err?.code);
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
    devLog("🔴 handleSocialLogin called:", providerName);

    await authReady;

    const providers = {
      google: googleProvider,
      facebook: facebookProvider,
      github: githubProvider,
      twitter: twitterProvider,
    };

    const provider = providers[providerName];
    if (!provider) return;

    let firebaseEmail = "";

    try {
      setLoading(true);

      let result;
      try {
        result = await signInWithPopup(auth, provider);
      } catch (popupErr) {
        if (
          popupErr.code === "auth/popup-closed-by-user" ||
          popupErr.code === "auth/cancelled-popup-request"
        ) {
          return;
        }
        if (popupErr.code === "auth/popup-blocked") {
          alert.error("Popup blocked! Please allow popups for this site.");
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

      if (!firebaseEmail) {
        alert.error(
          `${providerName} did not share your email. Please try another method.`,
        );
        await auth.signOut().catch(() => {});
        return;
      }

      const idToken = await result.user.getIdToken(true);

      const response = await API.post("/auth/social-login", {
        idToken,
        email: firebaseEmail,
        name: firebaseName,
        avatar: firebaseAvatar,
        provider: providerName,
      });

      await auth.signOut().catch(() => {});

      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        login(user, accessToken, refreshToken);
        alert.success("Login successful");
        navigate(getRoleRedirect(user.role), { replace: true });
      }
    } catch (err) {
      devLog("❌ Social login error:", err?.code);

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
        alert.error("Network error. Please check your internet connection.");
        return;
      }

      alert.error(message || "Social login failed. Please try again.");
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

    const sanitizedData = {
      email: sanitizeInput(email),
      password: password,
    };

    setLoading(true);
    try {
      const response = await loginUser(sanitizedData);
      if (response.success) {
        const { accessToken, refreshToken, user } = response;
        login(user, accessToken, refreshToken);
        alert.success("Login successful!");
        navigate(getRoleRedirect(user.role), { replace: true });
      } else {
        alert.error(response.message || "Login failed. Please try again.");
      }
    } catch (err) {
      // ✅ Redirect to verify email if not verified
      if (err.response?.data?.requiresVerification) {
        alert.error("Please verify your email first.");
        navigate("/auth/verify-email", {
          state: { email: loginData.email },
        });
        return;
      }

      // ✅ Check suspension
      const isSuspended = checkSuspension(err.response, loginData.email);
      if (isSuspended) return;

      // ✅ Check network error
      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        alert.error("Cannot connect to server. Please check your connection.");
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
      alert.error("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      alert.error("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/\d/.test(password)) {
      alert.error("Password must contain at least one number.");
      return;
    }

    if (!/[@$!%*?&#]/.test(password)) {
      alert.error("Password must contain at least one special character.");
      return;
    }

    // ✅ Sanitize before sending
    const sanitizedData = {
      name: sanitizeInput(name),
      email: sanitizeInput(email),
      phone: sanitizeInput(phone),
      password: password, // don't sanitize passwords
    };

    setLoading(true);
    try {
      const response = await registerUser(sanitizedData);
      if (response.requiresVerification) {
        // ✅ Redirect to OTP verification page
        alert.success("Registration successful! Please verify your email.");
        navigate("/auth/verify-email", {
          state: { email: sanitizedData.email },
        });
      } else if (response.success) {
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
          "Registration failed. Please try again.",
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
                maxLength={100}
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
                maxLength={128}
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
                maxLength={50}
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
                maxLength={100}
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
                maxLength={128}
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
