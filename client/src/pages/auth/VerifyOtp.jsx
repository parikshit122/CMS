import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  verifyResetOTP,
  requestPasswordReset,
} from "../../services/authService";
import "../../styles/Login.css";
import "boxicons/css/boxicons.min.css";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const COOLDOWN_KEY = "otp_cooldown_expiry";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  const getInitialCooldown = () => {
    const expiry = localStorage.getItem(COOLDOWN_KEY);
    if (!expiry) return 0;
    const remaining = Math.ceil((parseInt(expiry) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  };

  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(getInitialCooldown);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!email) {
      navigate("/auth/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  const startCountdown = useCallback((seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const expiry = Date.now() + seconds * 1000;
    localStorage.setItem(COOLDOWN_KEY, expiry.toString());
    setCooldown(seconds);
    timerRef.current = setInterval(() => {
      const remaining = Math.ceil(
        (parseInt(localStorage.getItem(COOLDOWN_KEY)) - Date.now()) / 1000,
      );
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        localStorage.removeItem(COOLDOWN_KEY);
        setCooldown(0);
      } else {
        setCooldown(remaining);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    const initial = getInitialCooldown();
    if (initial > 0) {
      startCountdown(initial);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCountdown]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const otp = digits.join("");
    if (otp.length !== OTP_LENGTH) {
      setError("Please enter all 6 digits of the OTP.");
      return;
    }
    setLoading(true);
    try {
      const data = await verifyResetOTP(email, otp);
      setSuccess("OTP verified! Redirecting...");
      localStorage.removeItem(COOLDOWN_KEY);
      setTimeout(() => {
        navigate("/auth/reset-password", {
          state: { email: data.email, resetToken: data.resetToken },
        });
      }, 1000);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Verification failed. Please try again.",
      );
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResending(true);
    try {
      await requestPasswordReset(email);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      startCountdown(RESEND_SECONDS);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Could not resend OTP. Try again.",
      );
    } finally {
      setResending(false);
    }
  };

  const circumference = 2 * Math.PI * 20;
  const progress =
    cooldown > 0 ? (cooldown / RESEND_SECONDS) * circumference : 0;

  return (
    <div className="auth-page">
      <Link to="/auth/forgot-password" className="auth-back-btn">
        <i className="bx bx-arrow-back" />
        Change Email
      </Link>

      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-icon-wrap">
            <i className="bx bx-envelope" />
          </div>
          <h1>Check Your Email</h1>
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
              <label>Enter OTP</label>
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
                  Verify OTP
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
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="#0ea0e9"
                      strokeWidth="3"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - progress}
                      strokeLinecap="round"
                      transform="rotate(-90 24 24)"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                    <text
                      x="24"
                      y="24"
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="13"
                      fontWeight="700"
                      fill="#0ea0e9"
                    >
                      {cooldown}
                    </text>
                  </svg>
                </div>
                <p className="resend-countdown-text">
                  Resend OTP in <span>{cooldown}s</span>
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
                    Didn't receive the OTP? Resend
                  </>
                )}
              </button>
            )}
          </div>

          <div className="auth-footer-links">
            <Link to="/auth">
              <i className="bx bx-log-in" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
