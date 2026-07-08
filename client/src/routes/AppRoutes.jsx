import { Routes, Route, Navigate } from "react-router-dom";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Home from "../pages/Home";
import Login from "../pages/auth/LoginRegistration";
import ForgotPassword from "../pages/auth/ForgotPassword";
import VerifyOtp from "../pages/auth/VerifyOtp";
import VerifyEmail from "../pages/auth/VerifyEmail";
import ResetPassword from "../pages/auth/ResetPassword";
import NotFound from "../pages/NotFound";
import Maintenance from "../pages/Maintenance";
import ManageUsers from "../pages/admin/ManageUsers";
import MyComplaints from "../pages/student/MyComplaints";
import Notifications from "../pages/Notifications";
import AdminSettings from "../pages/admin/AdminSettings";

import DashboardLayout from "../layouts/DashboardLayout";
import StudentDash from "../pages/student/StudentDash";
import SubmitComplaint from "../pages/student/SubmitComplaint";
import Profile from "../pages/Profilepage";

import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminReports from "../pages/admin/AdminReports";
import StaffDashboard from "../pages/staff/StaffDashboard";
import StaffComplaints from "../pages/staff/StaffComplaints";

import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

const studentMenuItems = [
  { label: "Dashboard", path: "/dashboard", icon: "bx bx-grid-alt" },
  { label: "Submit Complaint", path: "/submit", icon: "bx bx-plus-circle" },
  { label: "My Complaints", path: "/complaints", icon: "bx bx-file" },
  { label: "Notifications", path: "/notifications", icon: "bx bx-bell" },
  { label: "Profile", path: "/profile", icon: "bx bx-user" },
];

const adminMenuItems = [
  { label: "Dashboard", path: "/admin", icon: "bx bx-grid-alt" },
  { label: "Users", path: "/admin/users", icon: "bx bx-group" },
  { label: "Reports", path: "/admin/reports", icon: "bx bx-bar-chart-alt-2" },
  { label: "Notifications", path: "/admin/notifications", icon: "bx bx-bell" },
  { label: "Settings", path: "/admin/settings", icon: "bx bx-cog" },
  { label: "Profile", path: "/profile", icon: "bx bx-user" },
];

const staffMenuItems = [
  { label: "Dashboard", path: "/staff", icon: "bx bx-grid-alt" },
  {
    label: "Assigned Complaints",
    path: "/staff/complaints",
    icon: "bx bx-task",
  },
  { label: "Notifications", path: "/staff/notifications", icon: "bx bx-bell" },
  { label: "Profile", path: "/profile", icon: "bx bx-user" },
];

const getRoleRedirect = (role) => {
  const r = role?.toLowerCase();
  if (r === "admin") return "/admin";
  if (r === "staff") return "/staff";
  return "/dashboard";
};

const getDisplayRole = (role) => {
  const r = role?.toLowerCase();
  if (r === "admin") return "Admin";
  if (r === "staff") return "Staff";
  return "Student";
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontSize: "16px",
          color: "#6b7280",
        }}
      >
        Loading...
      </div>
    );
  }

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
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/verify-otp" element={<VerifyOtp />} />
      <Route path="/auth/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/maintenance" element={<Maintenance />} />

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
        path="/complaints"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <MyComplaints />
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
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <Notifications />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <Notifications />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <AdminSettings />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/notifications"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <DashboardLayout
              menuItems={staffMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <Notifications />
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
