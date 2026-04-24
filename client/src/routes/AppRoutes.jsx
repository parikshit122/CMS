import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import API from "../services/api";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Home from "../pages/Home";
import Login from "../pages/auth/LoginRegistration";
import NotFound from "../pages/NotFound";
import DashboardLayout from "../layouts/DashboardLayout";
import StudentDash from "../pages/student/StudentDash";
import AdminDashboard from "../pages/admin/AdminDashboard";
import { ProtectedRoute } from "./ProtectedRoute";

const studentMenuItems = [
  { label: "Dashboard", path: "/dashboard", icon: "bx bx-grid-alt" },
  { label: "Submit Complaint", path: "/submit", icon: "bx bx-plus-circle" },
  { label: "My Complaints", path: "/complaints", icon: "bx bx-file" },
  { label: "Notifications", path: "/notifications", icon: "bx bx-bell" },
  { label: "Profile", path: "/profile", icon: "bx bx-user" },
  { label: "Settings", path: "/settings", icon: "bx bx-cog" },
];

const adminMenuItems = [
  { label: "Dashboard", path: "/admin", icon: "bx bx-grid-alt" },
  { label: "Users", path: "/admin/users", icon: "bx bx-user" },
  { label: "Reports", path: "/admin/reports", icon: "bx bx-bar-chart-alt-2" },
  { label: "Settings", path: "/admin/settings", icon: "bx bx-cog" },
];

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyUser = async () => {
      const token = sessionStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await API.get("/auth/me");
        if (res.data.success) {
          setUser(res.data.user);
        }
      } catch (err) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>

      {/* Home */}
      <Route
        path="/"
        element={
          user ? (
            user.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <>
              <Header />
              <Home />
              <Footer />
            </>
          )
        }
      />

      {/* Login */}
      <Route path="/auth" element={<Login />} />

      {/* Student Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRole="user">
            <DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role="User"
            >
              <StudentDash />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Dashboard */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role="Admin"
            >
              <AdminDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default AppRoutes;