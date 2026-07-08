import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import "../../styles/Login.css";
import "boxicons/css/boxicons.min.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

// ✅ Role based redirect
const getRoleRedirect = (role) => {
  const r = role?.toLowerCase();
  if (r === "admin") return "/admin";
  if (r === "staff") return "/staff";
  return "/dashboard";
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const email = location.state?.email || "";

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  // ✅ Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate("/auth", { replace: true });
    }
  }, [email, navigate]);

  // ✅ Countdown timer
  const startCountdown = useCallback((seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const updated = [...digits];
    updated[index] = value;
    setDigits(updated);
    setError("");
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;
    setDigits(pasted.split(""));
    inputRefs.current[OTP_LENGTH - 1]?.focus();
  };

  // ✅ Verify Email OTP and Auto Login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const otp = digits.join("");

    if (otp.length !== OTP_LENGTH) {
      setError("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    try {
      const response = await API.post("/auth/verify-email", { email, otp });

      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;

        if (accessToken && refreshToken && user) {
          // ✅ Save tokens and user to context
          login(user, accessToken, refreshToken);

          setSuccess(
            `Email verified! Welcome ${user.name}! Redirecting...`
          );

          setTimeout(() => {
            // ✅ Redirect based on role
            navigate(getRoleRedirect(user.role), { replace: true });
          }, 1500);

        } else {
          // ✅ Fallback
          setSuccess("Email verified! Please login.");
          setTimeout(() => {
            navigate("/auth", { replace: true });
          }, 1500);
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        "Verification failed. Please try again."
      );
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend OTP
  const handleResend = async () => {
    setError("");
    setResending(true);
    try {
      await API.post("/auth/resend-verification", { email });
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      setSuccess("New code sent! Check your email.");
      startCountdown(RESEND_SECONDS);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        "Could not resend code. Try again."
      );
    } finally {
      setResending(false);
    }
  };

  const circumference = 2 * Math.PI * 20;
  const progress = cooldown > 0
    ? (cooldown / RESEND_SECONDS) * circumference
    : 0;

  return (
    <div className="auth-page">
      <Link to="/auth" className="auth-back-btn">
        <i className="bx bx-arrow-back" />
        Back to Login
      </Link>

      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-icon-wrap">
            <i className="bx bx-envelope" />
          </div>
          <h1>Verify Your Email</h1>
          <p>
            We sent a 6-digit code to{" "}
            <span className="auth-email-highlight">{email}</span>
          </p>
        </div>

        <div className="auth-card-body">
          {error && (
            <div className="auth-alert error">
              <i className="bx bx-error-circle" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-alert success">
              <i className="bx bx-check-circle" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label>Enter Verification Code</label>
              <div className="otp-row" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    disabled={loading}
                    className="otp-box"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || digits.join("").length !== OTP_LENGTH}
            >
              {loading ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <i className="bx bx-check-shield" />
                  Verify Email
                </>
              )}
            </button>
          </form>

          <div className="auth-resend-wrap">
            {cooldown > 0 ? (
              <div className="resend-countdown">
                <div className="resend-timer">
                  <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle
                      cx="24" cy="24" r="20"
                      fill="none" stroke="#e5e7eb" strokeWidth="3"
                    />
                    <circle
                      cx="24" cy="24" r="20"
                      fill="none" stroke="#0ea0e9" strokeWidth="3"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - progress}
                      strokeLinecap="round"
                      transform="rotate(-90 24 24)"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                    <text
                      x="24" y="24"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="13" fontWeight="700" fill="#0ea0e9"
                    >
                      {cooldown}
                    </text>
                  </svg>
                </div>
                <p className="resend-countdown-text">
                  Resend in <span>{cooldown}s</span>
                </p>
              </div>
            ) : (
              <button
                className="auth-resend-btn"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? (
                  <>
                    <i className="bx bx-loader-alt bx-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <i className="bx bx-refresh" />
                    Resend Code
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}