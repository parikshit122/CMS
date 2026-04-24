import { Navigate } from "react-router-dom";

const getToken = () => sessionStorage.getItem("token");
const getUser = () => JSON.parse(sessionStorage.getItem("user") || "{}");

export function ProtectedRoute({ children, allowedRole }) {
  const token = getToken();
  const user = getUser();

  if (!token) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}