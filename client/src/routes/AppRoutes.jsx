import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "../components/common/PageTransition";

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
  const location = useLocation();

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
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={getRoleRedirect(user.role)} replace />
            ) : (
              <PageTransition>
                <Header />
                <Home />
                <Footer />
              </PageTransition>
            )
          }
        />

        <Route path="/auth" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/auth/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/auth/verify-otp" element={<PageTransition><VerifyOtp /></PageTransition>} />
        <Route path="/auth/verify-email" element={<PageTransition><VerifyEmail /></PageTransition>} />
        <Route path="/auth/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route path="/maintenance" element={<PageTransition><Maintenance /></PageTransition>} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <PageTransition><DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <StudentDash />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/submit"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <PageTransition><DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <SubmitComplaint />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/complaints"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <PageTransition><DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <MyComplaints />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PageTransition><DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <AdminDashboard />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PageTransition><DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <ManageUsers />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/reports"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PageTransition><DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <AdminReports />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <PageTransition><DashboardLayout
              menuItems={staffMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <StaffDashboard />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/complaints"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <PageTransition><DashboardLayout
              menuItems={staffMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <StaffComplaints />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <PageTransition><DashboardLayout
              menuItems={studentMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <Notifications />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/notifications"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PageTransition><DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <Notifications />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PageTransition><DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <AdminSettings />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/staff/notifications"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <PageTransition><DashboardLayout
              menuItems={staffMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <Notifications />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={["user", "staff", "admin"]}>
            <PageTransition><DashboardLayout
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
              </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

export default AppRoutes;
