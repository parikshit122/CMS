import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { resetUserPassword } from "../../services/authService";
import "../../styles/Login.css";
import "boxicons/css/boxicons.min.css";

const REQUIREMENTS = [
  { test: (pw) => pw.length >= 8, label: "At least 8 characters" },
  { test: (pw) => /[A-Z]/.test(pw), label: "One uppercase letter" },
  { test: (pw) => /[a-z]/.test(pw), label: "One lowercase letter" },
  { test: (pw) => /\d/.test(pw), label: "One number" },
  { test: (pw) => /[@$!%*?&]/.test(pw), label: "One special character (@$!%*?&)" },
];

const getStrength = (pw) => {
  if (!pw) return null;
  const score = REQUIREMENTS.filter((r) => r.test(pw)).length;
  if (score <= 2) return { score, key: "weak", label: "Weak" };
  if (score === 3) return { score, key: "fair", label: "Fair" };
  if (score === 4) return { score, key: "good", label: "Good" };
  return { score, key: "strong", label: "Strong" };
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const resetToken = location.state?.resetToken || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const strength = getStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  if (!email || !resetToken) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card-body auth-expired">
            <i
              className="bx bx-error"
              style={{ fontSize: 48, color: "#ef4444", marginBottom: 16 }}
            />
            <p>Invalid or expired reset session.</p>
            <Link
              to="/auth/forgot-password"
              className="auth-submit-btn"
              style={{ textDecoration: "none", marginTop: 0 }}
            >
              <i className="bx bx-refresh" />
              Start Over
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Both fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const data = await resetUserPassword(
        email,
        resetToken,
        newPassword,
        confirmPassword,
      );
      setSuccess(data.message);
      setTimeout(() => {
        navigate("/auth", { replace: true });
      }, 2000);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Reset failed. Please try again.",
      );
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
            <i className="bx bx-key" />
          </div>
          <h1>Set New Password</h1>
          <p>Choose a strong password to secure your account.</p>
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
              <label htmlFor="rp-new">New Password</label>
              <div className="auth-input-wrap">
                <i className="bx bxs-lock-alt" />
                <input
                  id="rp-new"
                  type={showNew ? "text" : "password"}
                  className="auth-input auth-input-password"
                  placeholder="Min 8 chars, upper, lower, number, special"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowNew(!showNew)}
                >
                  <i className={`bx ${showNew ? "bx-hide" : "bx-show"}`} />
                </button>
              </div>

              {strength && (
                <div className="strength-bar-wrap">
                  <div className="strength-bars">
                    {[1, 2, 3, 4, 5].map((bar) => (
                      <div
                        key={bar}
                        className={`strength-bar ${bar <= strength.score ? strength.key : ""}`}
                      />
                    ))}
                  </div>
                  <span className={`strength-label ${strength.key}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="rp-confirm">Confirm Password</label>
              <div className="auth-input-wrap">
                <i className="bx bxs-lock-alt" />
                <input
                  id="rp-confirm"
                  type={showConfirm ? "text" : "password"}
                  className="auth-input auth-input-password"
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  <i className={`bx ${showConfirm ? "bx-hide" : "bx-show"}`} />
                </button>
              </div>

              {passwordsMatch && (
                <p className="pw-match ok">
                  <i className="bx bx-check" />
                  Passwords match
                </p>
              )}
              {passwordsMismatch && (
                <p className="pw-match bad">
                  <i className="bx bx-x" />
                  Passwords do not match
                </p>
              )}
            </div>

            <div className="pw-requirements">
              <p>Password Requirements</p>
              <ul>
                {REQUIREMENTS.map(({ test, label }) => {
                  const met = test(newPassword);
                  return (
                    <li key={label} className={met ? "met" : ""}>
                      <i className={`bx ${met ? "bx-check-circle" : "bx-circle"}`} />
                      {label}
                    </li>
                  );
                })}
              </ul>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <i className="bx bx-shield-quarter" />
                  Reset Password
                </>
              )}
            </button>
          </form>

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