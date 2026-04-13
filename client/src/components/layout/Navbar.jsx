import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../common/Button";

export default function Navbar({ menuOpen, setMenuOpen }) {
  const navigate = useNavigate();

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
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/auth");
                setMenuOpen(false);
              }}
            >
              Login
            </a>
          </li>

          <li>
            <Button
              className="register-btn"
              onClick={() => {
                navigate("/auth");
                setMenuOpen(false);
              }}
            >
              Register
            </Button>
          </li>
        </ul>
      </nav>
    </>
  );
}