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
import SubmitComplaint from "../pages/student/SubmitComplaint";
import Profile from "../pages/student/StudentProfile";

import AdminDashboard from "../pages/admin/AdminDashboard";
import StaffDashboard from "../pages/staff/StaffDashboard";

import  ProtectedRoute  from "./ProtectedRoute";



const studentMenuItems = [
  { label: "Dashboard",        path: "/dashboard",    icon: "bx bx-grid-alt"    },
  { label: "Submit Complaint", path: "/submit",        icon: "bx bx-plus-circle" },
  { label: "My Complaints",    path: "/complaints",    icon: "bx bx-file"        },
  { label: "Notifications",    path: "/notifications", icon: "bx bx-bell"        },
  { label: "Profile",          path: "/profile",       icon: "bx bx-user"        },
  { label: "Settings",         path: "/settings",      icon: "bx bx-cog"         },
];

const adminMenuItems = [
  { label: "Dashboard", path: "/admin",          icon: "bx bx-grid-alt"        },
  { label: "Users",     path: "/admin/users",    icon: "bx bx-user"            },
  { label: "Reports",   path: "/admin/reports",  icon: "bx bx-bar-chart-alt-2" },
  { label: "Settings",  path: "/admin/settings", icon: "bx bx-cog"             },
];

const staffMenuItems = [
  { label: "Dashboard",           path: "/staff",              icon: "bx bx-grid-alt" },
  { label: "Assigned Complaints", path: "/staff/complaints",   icon: "bx bx-task"     },
  { label: "Notifications",       path: "/staff/notifications",icon: "bx bx-bell"     },
  { label: "Profile",             path: "/staff/profile",      icon: "bx bx-user"     },
];

const getRoleRedirect = (role) => {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/dashboard";
};

function AppRoutes() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const verifyUser = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) { setLoading(false); return; }
      try {
        const res = await API.get("/auth/me");
        if (res.data.success) setUser(res.data.user);
      } catch {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, []);

  if (loading) return <div>Loading…</div>;

  return (
    <Routes>

      <Route
        path="/"
        element={
          user
            ? <Navigate to={getRoleRedirect(user.role)} replace />
            : <><Header /><Home /><Footer /></>
        }
      />

      <Route path="/auth" element={<Login />} />

      {/* Student */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={["user"]}>
          <DashboardLayout menuItems={studentMenuItems}
            userName={user?.name} role="Student">
            <StudentDash />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/submit" element={
        <ProtectedRoute allowedRoles={["user"]}>
          <DashboardLayout menuItems={studentMenuItems}
            userName={user?.name} role="Student">
            <SubmitComplaint />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={["user"]}>
          <DashboardLayout menuItems={studentMenuItems}
            userName={user?.name} role="Student">
            <Profile />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={["admin"]}>
          <DashboardLayout menuItems={adminMenuItems}
            userName={user?.name} role="Admin">
            <AdminDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* Staff */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={["staff"]}>
          <DashboardLayout menuItems={staffMenuItems}
            userName={user?.name} role="Staff">
            <StaffDashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default AppRoutes;