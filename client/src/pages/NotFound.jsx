import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const getRoleHome = (role) => {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  if (role === "user")  return "/dashboard";
  return "/";
};

export default function NotFound() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [count, setCount] = useState(5);

  useEffect(() => {
    // Countdown timer
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(getRoleHome(user?.role), { replace: true });
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [navigate, user]);

  const handleGoHome = () => {
    navigate(getRoleHome(user?.role), { replace: true });
  };

  const homeLabel =
    user?.role === "admin" ? "Admin Dashboard"  :
    user?.role === "staff" ? "Staff Dashboard"  :
    user?.role === "user"  ? "Student Dashboard":
                             "Home Page";

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* ── Icon ── */}
        <div style={styles.iconWrap}>
          <i className="bx bx-confused" style={styles.icon}></i>
        </div>

        {/* ── Code ── */}
        <h1 style={styles.code}>404</h1>

        {/* ── Message ── */}
        <h2 style={styles.title}>Page Not Found</h2>
        <p style={styles.sub}>
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* ── Countdown ── */}
        <div style={styles.countdown}>
          <div style={styles.countCircle}>{count}</div>
          <p style={styles.countText}>
            Redirecting to <strong>{homeLabel}</strong>…
          </p>
        </div>

        {/* ── Button ── */}
        <button style={styles.btn} onClick={handleGoHome}>
          <i className="bx bx-home-alt" style={{ marginRight: "8px" }}></i>
          Go to {homeLabel}
        </button>

        {/* ── Path hint ── */}
        <p style={styles.path}>
          <i className="bx bx-link" style={{ marginRight: "4px" }}></i>
          {window.location.pathname}
        </p>

      </div>
    </div>
  );
}

// ── Inline styles — no CSS file needed ───────────────────
const styles = {
  page: {
    minHeight:       "100vh",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    background:      "#f8fafc",
    fontFamily:      "Inter, system-ui, sans-serif",
    padding:         "1rem",
  },
  card: {
    background:    "#ffffff",
    borderRadius:  "20px",
    padding:       "3rem 2.5rem",
    textAlign:     "center",
    maxWidth:      "440px",
    width:         "100%",
    boxShadow:     "0 4px 32px rgba(0,0,0,0.08)",
    border:        "1px solid #e2e8f0",
  },
  iconWrap: {
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    width:           "72px",
    height:          "72px",
    borderRadius:    "50%",
    background:      "#eef2ff",
    margin:          "0 auto 1.25rem",
  },
  icon: {
    fontSize: "2.2rem",
    color:    "#6366f1",
  },
  code: {
    fontSize:    "5rem",
    fontWeight:  "800",
    color:       "#6366f1",
    margin:      "0 0 0.25rem",
    lineHeight:  "1",
    letterSpacing: "-2px",
  },
  title: {
    fontSize:   "1.4rem",
    fontWeight: "700",
    color:      "#0f172a",
    margin:     "0 0 0.5rem",
  },
  sub: {
    fontSize:  "0.9rem",
    color:     "#64748b",
    margin:    "0 0 1.75rem",
    lineHeight: "1.6",
  },
  countdown: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "0.75rem",
    background:     "#f8fafc",
    border:         "1px solid #e2e8f0",
    borderRadius:   "12px",
    padding:        "0.85rem 1.25rem",
    marginBottom:   "1.25rem",
  },
  countCircle: {
    width:          "2.2rem",
    height:         "2.2rem",
    borderRadius:   "50%",
    background:     "#6366f1",
    color:          "#fff",
    fontWeight:     "700",
    fontSize:       "1rem",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    flexShrink:     "0",
  },
  countText: {
    fontSize: "0.875rem",
    color:    "#334155",
    margin:   "0",
  },
  btn: {
    display:       "inline-flex",
    alignItems:    "center",
    justifyContent:"center",
    padding:       "0.75rem 1.75rem",
    background:    "#6366f1",
    color:         "#fff",
    border:        "none",
    borderRadius:  "10px",
    fontSize:      "0.9rem",
    fontWeight:    "600",
    cursor:        "pointer",
    width:         "100%",
    marginBottom:  "1rem",
    transition:    "background 0.15s",
  },
  path: {
    fontSize:   "0.75rem",
    color:      "#94a3b8",
    margin:     "0",
    display:    "flex",
    alignItems: "center",
    justifyContent: "center",
    wordBreak:  "break-all",
  },
};