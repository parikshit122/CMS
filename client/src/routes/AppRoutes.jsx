import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Home from "../pages/Home";
import Login from "../pages/auth/LoginRegistration";
import NotFound from "../pages/NotFound";
import ManageUsers from "../pages/admin/ManageUsers";

import DashboardLayout from "../layouts/DashboardLayout";
import StudentDash from "../pages/student/StudentDash";
import SubmitComplaint from "../pages/student/SubmitComplaint";
import Profile from "../pages/Profilepage";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminReports from "../pages/admin/AdminReports";
import StaffDashboard from "../pages/staff/StaffDashboard";
import StaffComplaints from "../pages/staff/StaffComplaints";

import ProtectedRoute from "./ProtectedRoute";

const studentMenuItems = [
  { label: "Dashboard", path: "/dashboard", icon: "bx bx-grid-alt" },
  { label: "Submit Complaint", path: "/submit", icon: "bx bx-plus-circle" },
  { label: "My Complaints", path: "/complaints", icon: "bx bx-file" },
  { label: "Notifications", path: "/notifications", icon: "bx bx-bell" },
  { label: "Profile", path: "/profile", icon: "bx bx-user" },
];

const adminMenuItems = [
  { label: "Dashboard", path: "/admin", icon: "bx bx-grid-alt" },
  { label: "Users", path: "/admin/users", icon: "bx bx-user" },
  { label: "Reports", path: "/admin/reports", icon: "bx bx-bar-chart-alt-2" },
  { label: "Settings", path: "/admin/settings", icon: "bx bx-cog" },
  { label: "Profile", path: "/profile", icon: "bx bx-user" },
];

const staffMenuItems = [
  { label: "Dashboard", path: "/staff", icon: "bx bx-grid-alt" },
  { label: "Assigned Complaints", path: "/staff/complaints", icon: "bx bx-task" },
  { label: "Notifications", path: "/staff/notifications", icon: "bx bx-bell" },
  { label: "Profile", path: "/profile", icon: "bx bx-user" },
];

const getRoleRedirect = (role) => {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/dashboard";
};

const getDisplayRole = (role) => {
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  return "Student";
};

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    const storedUser = sessionStorage.getItem("user");

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    if (storedUser && storedUser !== "undefined" && storedUser !== "null") {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        sessionStorage.clear();
        setUser(null);
      }
    }

    setLoading(false);
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Routes>

      <Route
        path="/"
        element={
          user ? (
            <Navigate to={getRoleRedirect(user.role)} replace />
          ) : (
            <>
              <Header />
              <Home />
              <Footer />
            </>
          )
        }
      />

      <Route path="/auth" element={<Login />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <StudentDash />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/submit"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <SubmitComplaint />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <AdminDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <AdminReports />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <ManageUsers />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <DashboardLayout
              menuItems={staffMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <StaffDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/complaints"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <DashboardLayout
              menuItems={staffMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <StaffComplaints />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["user", "staff", "admin"]}>
            <DashboardLayout
              menuItems={
                user?.role === "admin"
                  ? adminMenuItems
                  : user?.role === "staff"
                    ? staffMenuItems
                    : studentMenuItems
              }
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <Profile />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default AppRoutes;