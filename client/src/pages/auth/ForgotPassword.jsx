import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/authService";
import "../../styles/Login.css";
import "boxicons/css/boxicons.min.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const data = await requestPasswordReset(trimmed);
      setSuccess(data.message || "OTP sent successfully. Redirecting...");
      setTimeout(() => {
        navigate("/auth/verify-otp", { state: { email: trimmed } });
      }, 1500);
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;

      if (status === 404) {
        setError("This email is not registered. Please register first.");
      } else if (status === 403) {
        setError("Your account is suspended. Contact admin.");
      } else if (status === 429) {
        setError("Please wait before requesting another OTP.");
      } else {
        setError(message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Link to="/auth" className="auth-back-btn">
        <i className="bx bx-arrow-back" />
        Back to Login
      </Link>

      <div className="auth-card">
        <div className="auth-card-header">
          <div className="auth-icon-wrap">
            <i className="bx bx-lock-open-alt" />
          </div>
          <h1>Forgot Password?</h1>
          <p>Enter your registered email and we'll send you a 6-digit OTP.</p>
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
              <label htmlFor="fp-email">Email Address</label>
              <div className="auth-input-wrap">
                <input
                  id="fp-email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                  autoFocus
                />
                <i className="bx bxs-envelope" />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <i className="bx bx-send" />
                  Send OTP
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-links">
            <p>Remember your password?</p>
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