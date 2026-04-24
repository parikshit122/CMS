import { useNavigate } from "react-router-dom";
import Button from "../common/Button";
import "../../styles/Navbar.css"

export default function Navbar({ menuOpen, setMenuOpen }) {
  const navigate = useNavigate();

  const handleNavigation = (panel) => {
    navigate("/auth", { state: { panel } });
    setMenuOpen(false);
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
            <a href="#features" onClick={() => setMenuOpen(false)}>
              Features
            </a>
          </li>

          <li>
            <a href="#workflow" onClick={() => setMenuOpen(false)}>
              Workflow
            </a>
          </li>

          <li>
            <button
              className="nav-link-btn"
              onClick={() => handleNavigation("login")}
            >
              Login
            </button>
          </li>

          <li>
            <Button
              className="register-btn"
              onClick={() => handleNavigation("register")}
            >
              Register
            </Button>
          </li>
        </ul>
      </nav>
    </>
  );
}