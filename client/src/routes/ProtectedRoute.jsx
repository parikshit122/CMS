import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const accessToken = localStorage.getItem("accessToken");

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontSize: "16px",
          color: "#666",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!accessToken || !user) {
    console.log("❌ No auth, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const isStudent = user.role === "user";
  const isStaff = user.role === "staff";
  const isAdmin = user.role === "admin";

  const studentIncomplete =
    isStudent && (!user.phone || !user.course || !user.year);

  const staffIncomplete = isStaff && (!user.phone || !user.category);

  const adminIncomplete = isAdmin && !user.phone;

  if (
    (studentIncomplete || staffIncomplete || adminIncomplete) &&
    location.pathname !== "/profile"
  ) {
    return <Navigate to="/profile" replace />;
  }

  return children;
};

export default ProtectedRoute;