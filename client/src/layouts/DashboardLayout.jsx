import { useState, useEffect } from "react";
import Sidebar from "../components/layout/Sidebar";
import "../styles/Dashboard.css";

const DashboardLayout = ({
  menuItems = [],
  userName = "User",
  role = "User",
  profilePic = "",
  children,
  showSearch = true,
  searchPlaceholder = "Search dashboard...",
  onSearch,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchValue, setSearchValue] = useState("");

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

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch?.(value);
  };

  return (
    <div className="layout-container">
      <header className="layout-header">
        <div className="header-left">
          {isMobile && (
            <button
              className="menu-btn"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
            >
              <i className="bx bx-menu"></i>
            </button>
          )}
          <h2 className="logo">ComplaintSync</h2>
        </div>

        {showSearch && (
          <div className="header-center">
            <div className="dashboard-search">
              <i className="bx bx-search"></i>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        )}

        <div className="header-right">
          <div className="notification-bell">
            <i className="bx bx-bell"></i>
            <span className="notification-badge">3</span>
          </div>

          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{role}</span>
          </div>

          {profilePic ? (
            <img src={profilePic} alt="profile" className="profile-pic" />
          ) : (
            <div className="profile-circle">
              {userName?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </header>

      <div className="layout-body">
        <Sidebar
          menuItems={menuItems}
          role={role}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="layout-content">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;