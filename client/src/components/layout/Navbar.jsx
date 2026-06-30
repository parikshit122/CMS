import { useNavigate, useLocation } from "react-router-dom";
import Button from "../common/Button";
import "../../styles/Navbar.css";

export default function Navbar({ menuOpen, setMenuOpen }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (panel) => {
    navigate("/auth", { state: { panel } });
    setMenuOpen(false);
  };

  const handleSectionScroll = (sectionId) => {
    setMenuOpen(false);

    if (location.pathname !== "/") {
      navigate(`/#${sectionId}`);
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <div
        className={`menu-toggle ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      <nav className={`navbar ${menuOpen ? "active" : ""}`}>
        <ul className="nav-links">
          <li>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleSectionScroll("features")}
            >
              <i className="bx bx-star" /> Features
            </button>
          </li>

          <li>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleSectionScroll("workflow")}
            >
              <i className="bx bx-git-branch" /> Workflow
            </button>
          </li>

          <li>
            <button
              type="button"
              className="nav-link-btn"
              onClick={() => handleNavigation("login")}
            >
              <i className="bx bx-log-in" /> Login
            </button>
          </li>

          <li>
            <Button
              className="register-btn"
              onClick={() => handleNavigation("register")}
            >
              <i className="bx bx-user-plus" /> Register
            </Button>
          </li>
        </ul>
      </nav>
    </>
  );
}