import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Button from "../../components/common/Button";
import { useAlert } from "../../components/common/Alert";
import { loginUser, registerUser } from "../../services/authService";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import SuspendedScreen from "../../components/auth/SuspendedScreen";
import AuthMotionBackground from "../../components/auth/AuthMotionBackground";
import "../../styles/Login.css";
import "boxicons/css/boxicons.min.css";
import use3DTilt from "../../hooks/use3DTilt";
import {
  getRoleRedirect,
  validateLoginInput,
  validateRegisterInput,
  getSocialAuthErrorMessage,
} from "../../utils/authValidation";

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

const SOCIAL_PROVIDERS = ["google", "github", "twitter", "facebook"];

const PROVIDER_LABELS = {
  google: "Sign in with Google",
  github: "Sign in with GitHub",
  twitter: "Sign in with Twitter",
  facebook: "Sign in with Facebook",
};

const REDIRECT_PROVIDER_KEY = "auth_redirect_provider";
const REDIRECT_PROCESSED_KEY = "auth_redirect_processed";

function SocialButtons({ onSocialClick, loading, disabledTab }) {
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
          tabIndex={disabledTab ? -1 : 0}
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suspensionData, setSuspensionData] = useState(null);

  const redirectHandledRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();
  const alert = useAlert();
  const { user: currentUser, loading: authLoading, login } = useAuth();
  const tiltRef = use3DTilt({ max: 15, scale: 1.02 });

  // Redirect already authenticated users away from /auth
  useEffect(() => {
    if (!authLoading && currentUser && !suspensionData) {
      navigate(getRoleRedirect(currentUser.role), { replace: true });
    }
  }, [authLoading, currentUser, suspensionData, navigate]);

  useEffect(() => {
    const panel = location.state?.panel;
    setIsActive(panel === "register");
  }, [location.state]);

  const checkSuspension = useCallback((errorResponse, attemptedEmail) => {
    if (errorResponse?.status === 403 && errorResponse?.data?.suspendedUntil) {
      setSuspensionData({
        email: attemptedEmail,
        suspendedUntil: errorResponse.data.suspendedUntil,
        reason: errorResponse.data.reason || "",
      });
      return true;
    }
    return false;
  }, []);

  const exchangeFirebaseUser = useCallback(
    async (firebaseUser, providerName) => {
      const firebaseEmail =
        firebaseUser.email || firebaseUser.providerData?.[0]?.email || "";
      const firebaseName =
        firebaseUser.displayName ||
        firebaseUser.providerData?.[0]?.displayName ||
        "";

      if (!firebaseEmail) {
        alert.error(
          `${providerName} did not share your email address. Please ensure your email is verified or try another method.`,
        );
        await auth?.signOut().catch(() => {});
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken(true);
        const response = await API.post("/auth/social-login", {
          idToken,
          name: firebaseName,
        });

        await auth?.signOut().catch(() => {});

        if (response.data.success) {
          const { accessToken, refreshToken, user, isNewUser } = response.data;
          login(user, accessToken, refreshToken);
          alert.success(
            isNewUser ? "Account created and logged in!" : "Login successful!",
          );
          navigate(getRoleRedirect(user.role), { replace: true });
        }
      } catch (err) {
        devLog("❌ Social token exchange error:", err?.code || err?.response?.status);
        await auth?.signOut().catch(() => {});

        if (checkSuspension(err?.response, firebaseEmail)) return;

        const message = getSocialAuthErrorMessage(
          err,
          providerName,
          firebaseEmail,
        );
        if (message) alert.error(message);
      }
    },
    [alert, checkSuspension, login, navigate],
  );

  // Only inspect pending Firebase redirect results when a redirect flag exists
  useEffect(() => {
    let mounted = true;

    const handleRedirectResult = async () => {
      if (redirectHandledRef.current) return;
      redirectHandledRef.current = true;

      const alreadyProcessed = localStorage.getItem(REDIRECT_PROCESSED_KEY);
      if (alreadyProcessed) {
        localStorage.removeItem(REDIRECT_PROCESSED_KEY);
        if (auth) await auth.signOut().catch(() => {});
        return;
      }

      const pendingProvider = localStorage.getItem(REDIRECT_PROVIDER_KEY);
      if (!pendingProvider) return;

      try {
        await authReady;
        if (!auth || !mounted) return;

        setLoading(true);
        const result = await getRedirectResult(auth);
        localStorage.removeItem(REDIRECT_PROVIDER_KEY);

        const targetUser = result?.user || auth.currentUser;
        if (targetUser && mounted) {
          localStorage.setItem(REDIRECT_PROCESSED_KEY, "true");
          await exchangeFirebaseUser(targetUser, pendingProvider);
        }
      } catch (err) {
        devLog("❌ Redirect handler error:", err?.code);
        localStorage.removeItem(REDIRECT_PROVIDER_KEY);
        const msg = getSocialAuthErrorMessage(err, pendingProvider);
        if (msg && mounted) alert.error(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    handleRedirectResult();

    return () => {
      mounted = false;
    };
  }, [alert, exchangeFirebaseUser]);

  const handleBack = () => navigate("/");

  const handleLoginChange = (e) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });

  const handleRegisterChange = (e) =>
    setRegisterData({ ...registerData, [e.target.name]: e.target.value });

  const handleSocialLogin = async (providerName) => {
    devLog("🔴 handleSocialLogin called:", providerName);

    await authReady;

    if (!auth) {
      alert.error("Social login is not configured in this preview environment.");
      return;
    }

    const providers = {
      google: googleProvider,
      facebook: facebookProvider,
      github: githubProvider,
      twitter: twitterProvider,
    };

    const provider = providers[providerName];
    if (!provider) return;

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      await exchangeFirebaseUser(result.user, providerName);
    } catch (err) {
      devLog("❌ Social popup error:", err?.code);
      await auth.signOut().catch(() => {});
      const message = getSocialAuthErrorMessage(err, providerName);
      if (message) alert.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const validation = validateLoginInput(loginData);
    if (!validation.valid) {
      alert.error(validation.error);
      return;
    }

    const sanitizedData = validation.sanitized;

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
        alert.error(
          err.response?.data?.message || "Please verify your email first.",
        );
        navigate("/auth/verify-email", {
          state: { email: err.response?.data?.email || sanitizedData.email },
        });
        return;
      }

      // ✅ Check suspension
      if (checkSuspension(err.response, sanitizedData.email)) return;

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

    const validation = validateRegisterInput(registerData);
    if (!validation.valid) {
      alert.error(validation.error);
      return;
    }

    const sanitizedData = validation.sanitized;

    setLoading(true);
    try {
      const response = await registerUser(sanitizedData);
      if (response.requiresVerification) {
        // ✅ Redirect to OTP verification page
        alert.success("Registration successful! Please verify your email.");
        navigate("/auth/verify-email", {
          state: { email: response.email || sanitizedData.email },
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
      // ✅ Smoothly route unverified duplicate accounts to verification screen
      if (err.response?.data?.requiresVerification) {
        alert.info(
          err.response?.data?.message ||
            "This email is registered and waiting for verification.",
        );
        navigate("/auth/verify-email", {
          state: { email: err.response?.data?.email || sanitizedData.email },
        });
        return;
      }

      if (err.code === "ERR_NETWORK" || err.message === "Network Error") {
        alert.error("Cannot connect to server. Please check your connection.");
        return;
      }

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
    <div className="outer-container" style={{ perspective: "1500px" }}>
      <AuthMotionBackground />
      <Button
        className="back-btn-absolute"
        onClick={handleBack}
        aria-label="Go back to home page"
      >
        <i className="bx bx-arrow-back" aria-hidden="true" />{" "}
        <span className="back-text">Back</span>
      </Button>

      <div
        className={`logincontainer ${isActive ? "active" : ""}`}
        aria-live="polite"
        ref={tiltRef}
        style={{ transformStyle: "preserve-3d" }}
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
                tabIndex={isActive ? -1 : 0}
              />
              <i className="bx bxs-envelope" aria-hidden="true" />
            </div>

            <div className="input-box">
              <label htmlFor="login-password" className="visually-hidden">
                Password
              </label>
              <input
                id="login-password"
                type={showLoginPassword ? "text" : "password"}
                name="password"
                required
                placeholder="Enter Password"
                value={loginData.password}
                onChange={handleLoginChange}
                autoComplete="current-password"
                aria-required="true"
                maxLength={128}
                tabIndex={isActive ? -1 : 0}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowLoginPassword((prev) => !prev)}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
                aria-pressed={showLoginPassword}
                tabIndex={isActive ? -1 : 0}
              >
                <i
                  className={`bx ${showLoginPassword ? "bx-hide" : "bx-show"}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="forgot-link">
              <Link
                to="/auth/forgot-password"
                className="forgot-btn"
                tabIndex={isActive ? -1 : 0}
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="login-btn"
              disabled={loading}
              aria-busy={loading}
              tabIndex={isActive ? -1 : 0}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>

            <p>Or login with social platforms</p>
            <SocialButtons
              onSocialClick={handleSocialLogin}
              loading={loading}
              disabledTab={isActive}
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
                placeholder="Enter Full Name"
                value={registerData.name}
                onChange={handleRegisterChange}
                autoComplete="name"
                aria-required="true"
                maxLength={50}
                tabIndex={isActive ? 0 : -1}
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
                tabIndex={isActive ? 0 : -1}
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
                maxLength={10}
                placeholder="Enter 10-digit Mobile Number"
                value={registerData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  handleRegisterChange({ target: { name: "phone", value } });
                }}
                autoComplete="tel"
                aria-required="true"
                tabIndex={isActive ? 0 : -1}
              />
              <i className="bx bxs-phone" aria-hidden="true" />
            </div>

            <div className="input-box">
              <label htmlFor="reg-password" className="visually-hidden">
                Password
              </label>
              <input
                id="reg-password"
                type={showRegisterPassword ? "text" : "password"}
                name="password"
                required
                placeholder="Create Password (8+ chars)"
                value={registerData.password}
                onChange={handleRegisterChange}
                autoComplete="new-password"
                aria-required="true"
                maxLength={128}
                tabIndex={isActive ? 0 : -1}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowRegisterPassword((prev) => !prev)}
                aria-label={
                  showRegisterPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showRegisterPassword}
                tabIndex={isActive ? 0 : -1}
              >
                <i
                  className={`bx ${showRegisterPassword ? "bx-hide" : "bx-show"}`}
                  aria-hidden="true"
                />
              </button>
            </div>

            <Button
              type="submit"
              className="register-btn"
              disabled={loading}
              aria-busy={loading}
              tabIndex={isActive ? 0 : -1}
            >
              {loading ? "Registering..." : "Register"}
            </Button>

            <p>Or register with social platforms</p>
            <SocialButtons
              onSocialClick={handleSocialLogin}
              loading={loading}
              disabledTab={!isActive}
            />
          </form>
        </div>

        <div className="toggle-box">
          <div className="toggle-panel toggle-left" aria-hidden={isActive}>
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
          <div className="toggle-panel toggle-right" aria-hidden={!isActive}>
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
