import { useState, useEffect, useId } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import NotificationBell from "../components/notification/NotificationBell";
import useAuthSync from "../hooks/useAuthSync";
import "../styles/Dashboard.css";
import useSocket from "../hooks/useSocket";
const DashboardLayout = ({
  menuItems = [],
  children,
  showSearch = true,
  searchPlaceholder = "Search dashboard...",
  onSearch,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchId = useId();

  useAuthSync(120000);
  useSocket();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleUpdate = () => forceUpdate((n) => n + 1);
    window.addEventListener("user-updated", handleUpdate);
    return () => window.removeEventListener("user-updated", handleUpdate);
  }, []);

  useEffect(() => {
    if (isMobile && isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isSidebarOpen]);

  useEffect(() => {
    if (!user) return;

    if (user.role === "user" && (!user.phone || !user.course || !user.year)) {
      if (location.pathname !== "/profile") {
        setShowProfileModal(true);
      } else {
        setShowProfileModal(false);
      }
    } else {
      setShowProfileModal(false);
    }
  }, [user, location.pathname]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);
  };

  const handleProfileClick = () => navigate("/profile");

  const displayRole =
    user?.role === "admin"
      ? "Admin"
      : user?.role === "staff"
        ? "Staff"
        : "Student";

  return (
    <div className="layout-container">
      <header className="layout-header" role="banner">
        <div className="header-left">
          {isMobile && (
            <button
              className="menu-btn"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-label={
                isSidebarOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={isSidebarOpen}
              aria-controls="main-sidebar"
            >
              <i className="bx bx-menu" aria-hidden="true" />
            </button>
          )}
          <h2 className="logo">ComplaintSync</h2>
        </div>

        {showSearch && (
          <div className="header-center">
            <div className="dashboard-search">
              <label htmlFor={searchId} className="visually-hidden">
                {searchPlaceholder}
              </label>
              <i className="bx bx-search" aria-hidden="true" />
              <input
                id={searchId}
                type="search"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={handleSearchChange}
                aria-label={searchPlaceholder}
              />
            </div>
          </div>
        )}

        <div className="header-right">
          <NotificationBell />

          <div
            className="user-info"
            aria-label={`Logged in as ${user?.name}, ${displayRole}`}
          >
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{displayRole}</span>
          </div>

          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={`${user?.name}'s profile picture`}
              className="profile-pic"
              onClick={handleProfileClick}
              tabIndex={0}
              role="button"
            />
          ) : (
            <div
              className="profile-circle"
              onClick={handleProfileClick}
              tabIndex={0}
              role="button"
            >
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
        </div>
      </header>

      <div className="layout-body">
        <Sidebar
          menuItems={menuItems}
          role={displayRole}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="layout-content">{children}</main>
      </div>

      {showProfileModal && (
        <div className="profile-block-overlay">
          <div className="profile-block-modal">
            <h3>Complete Your Profile</h3>
            <p>
              Please add your phone number, course, and year before accessing
              other pages.
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/profile")}
            >
              Go to Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
