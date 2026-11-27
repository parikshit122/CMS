import { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "../components/common/PageTransition";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Home from "../pages/Home";
import ProtectedRoute from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../layouts/DashboardLayout";
import lazyWithRetry from "../utils/lazyWithRetry";

// Lazy-load secondary & authenticated routes with automatic stale-chunk reload recovery
const Login = lazyWithRetry(() => import("../pages/auth/LoginRegistration"));
const ForgotPassword = lazyWithRetry(() => import("../pages/auth/ForgotPassword"));
const VerifyOtp = lazyWithRetry(() => import("../pages/auth/VerifyOtp"));
const VerifyEmail = lazyWithRetry(() => import("../pages/auth/VerifyEmail"));
const ResetPassword = lazyWithRetry(() => import("../pages/auth/ResetPassword"));
const NotFound = lazyWithRetry(() => import("../pages/NotFound"));
const Maintenance = lazyWithRetry(() => import("../pages/Maintenance"));

const StudentDash = lazyWithRetry(() => import("../pages/student/StudentDash"));
const SubmitComplaint = lazyWithRetry(() => import("../pages/student/SubmitComplaint"));
const MyComplaints = lazyWithRetry(() => import("../pages/student/MyComplaints"));
const Profile = lazyWithRetry(() => import("../pages/Profilepage"));

const AdminDashboard = lazyWithRetry(() => import("../pages/admin/AdminDashboard"));
const ManageUsers = lazyWithRetry(() => import("../pages/admin/ManageUsers"));
const AdminReports = lazyWithRetry(() => import("../pages/admin/AdminReports"));
const AdminSettings = lazyWithRetry(() => import("../pages/admin/AdminSettings"));

const StaffDashboard = lazyWithRetry(() => import("../pages/staff/StaffDashboard"));
const StaffComplaints = lazyWithRetry(() => import("../pages/staff/StaffComplaints"));
const Notifications = lazyWithRetry(() => import("../pages/Notifications"));
const LostFound = lazyWithRetry(() => import("../pages/LostFound"));
const PublicTransparency = lazyWithRetry(() => import("../pages/PublicTransparency"));
const QrReportEntry = lazyWithRetry(() => import("../pages/QrReportEntry"));
const QrSpotStudio = lazyWithRetry(() => import("../pages/admin/QrSpotStudio"));
const CampusNavigator = lazyWithRetry(() => import("../pages/CampusNavigator"));
const CampusStudio = lazyWithRetry(() => import("../pages/admin/CampusStudio"));

const studentMenuItems = [
  { label: "Dashboard", path: "/dashboard", icon: "bx bx-grid-alt" },
  { label: "Submit Complaint", path: "/submit", icon: "bx bx-plus-circle" },
  { label: "My Complaints", path: "/complaints", icon: "bx bx-file" },
  { label: "Campus Map", path: "/campus-map", icon: "bx bx-map-alt" },
  { label: "Lost & Found", path: "/lost-found", icon: "bx bx-search-alt-2" },
  { label: "Notifications", path: "/notifications", icon: "bx bx-bell" },
  { label: "Profile", path: "/profile", icon: "bx bx-user" },
];

const adminMenuItems = [
  { label: "Dashboard", path: "/admin", icon: "bx bx-grid-alt" },
  { label: "Campus Studio", path: "/admin/campus-studio", icon: "bx bx-map-alt" },
  { label: "QR Spots", path: "/admin/qr-spots", icon: "bx bx-qr" },
  { label: "Users", path: "/admin/users", icon: "bx bx-group" },
  { label: "Reports", path: "/admin/reports", icon: "bx bx-bar-chart-alt-2" },
  { label: "Lost & Found", path: "/lost-found", icon: "bx bx-search-alt-2" },
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
  { label: "Campus Map", path: "/campus-map", icon: "bx bx-map-alt" },
  { label: "Lost & Found", path: "/lost-found", icon: "bx bx-search-alt-2" },
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

const RouteFallback = (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      fontSize: "15px",
      color: "#9ca3af",
    }}
  >
    Loading...
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return RouteFallback;
  }

  return (
    <Suspense fallback={RouteFallback}>
      <AnimatePresence mode="wait" initial={false}>
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
        <Route path="/transparency" element={<PageTransition><PublicTransparency /></PageTransition>} />
        <Route path="/report" element={<PageTransition><QrReportEntry /></PageTransition>} />
        <Route
          path="/campus-map"
          element={
            user ? (
              <PageTransition>
                <DashboardLayout
                  menuItems={
                    user.role === "admin"
                      ? adminMenuItems
                      : user.role === "staff"
                        ? staffMenuItems
                        : studentMenuItems
                  }
                  userName={user?.name}
                  role={getDisplayRole(user?.role)}
                >
                  <CampusNavigator />
                </DashboardLayout>
              </PageTransition>
            ) : (
              <PageTransition>
                <Header />
                <CampusNavigator />
                <Footer />
              </PageTransition>
            )
          }
        />

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
        path="/admin/qr-spots"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PageTransition><DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <QrSpotStudio />
            </DashboardLayout></PageTransition>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/campus-studio"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <PageTransition><DashboardLayout
              menuItems={adminMenuItems}
              userName={user?.name}
              role={getDisplayRole(user?.role)}
            >
              <CampusStudio />
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
        path="/lost-found"
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
              <LostFound />
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
    </Suspense>
  );
}

export default AppRoutes;
