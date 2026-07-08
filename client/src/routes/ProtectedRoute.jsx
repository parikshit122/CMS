import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME = {
  admin: "/admin",
  staff: "/staff",
  user:  "/dashboard",
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location          = useLocation();
  const accessToken       = localStorage.getItem("accessToken");

  // ── Still loading auth state ──────────────────────────
  if (loading) {
    return (
      <div style={{
        display:        "flex",
        justifyContent: "center",
        alignItems:     "center",
        minHeight:      "100vh",
        fontSize:       "16px",
        color:          "#666",
      }}>
        Loading...
      </div>
    );
  }

  // ── Not logged in ─────────────────────────────────────
  if (!accessToken || !user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ── Wrong role ────────────────────────────────────────
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const home = ROLE_HOME[user.role] || "/";
    return <Navigate to={home} replace />;
  }

  return children;
};

export default ProtectedRoute;