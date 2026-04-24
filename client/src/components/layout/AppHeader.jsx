import "../../styles/AdminDashboard.css";

const AppHeader = ({ userName, role }) => {
  return (
    <header className="dashboard-header">

      <h2 className="dashboard-logo">
        ComplaintSync Admin
      </h2>

      <div className="header-right">

        <input
          type="text"
          placeholder="Search complaints..."
          className="header-search"
        />

        <i className="bx bx-bell header-icon"></i>

        <div className="header-user">
          <div className="avatar">AD</div>
          <div>
            <div className="user-name">{userName}</div>
            <small className="user-role">{role}</small>
          </div>
        </div>

      </div>

    </header>
  );
};

export default AppHeader;