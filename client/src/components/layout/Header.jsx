import { useState } from "react";
import "../../styles/Header.css";
import logo from "../../assets/images/logo.png";
import Button from "../common/Button";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      
      <img className="logo" src={logo} alt="Logo" />

      <h1 className="title wave_text">
        {"ComplaintSync".split("").map((char, i) => (
          <span key={i} style={{ "--i": i + 1 }}>
            {char}
          </span>
        ))}
      </h1>

      {/* Hamburger */}
      <div
        className={`menu-toggle ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      {/* Nav */}
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
            <a href="#login" onClick={() => setMenuOpen(false)}>
              Login
            </a>
          </li>

          <li>
            <Button
              className="register-btn"
              onClick={() => setMenuOpen(false)}
            >
              Register
            </Button>
          </li>
        </ul>
      </nav>

    </header>
  );
}