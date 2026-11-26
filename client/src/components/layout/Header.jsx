import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import useInstitutionBranding from "../../hooks/useInstitutionBranding";
import PWAInstallButton from "../pwa/PWAInstallButton";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const branding = useInstitutionBranding();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="av-topbar">
      <div className="av-topbar__inner">
        {/* Zone 1: Brand Identity */}
        <Link to="/" className="av-brand" aria-label="ComplaintSync Home">
          <img
            src="/icon.svg"
            alt=""
            className="av-brand__mark"
            width={32}
            height={32}
          />
          <span>
            {branding.platformName || "ComplaintSync"}
            <span className="av-brand__sub">{branding.headerSubtitle}</span>
          </span>
        </Link>

        {/* Zone 2: Concise Primary Navigation */}
        <nav className="av-nav" aria-label="Primary navigation">
          <Link
            to="/"
            className={`av-nav__link ${isActive("/") ? "is-active" : ""}`}
          >
            Platform
          </Link>
          <Link
            to="/campus-map"
            className={`av-nav__link ${isActive("/campus-map") ? "is-active" : ""}`}
          >
            Campus Map
          </Link>
          <Link
            to="/transparency"
            className={`av-nav__link ${isActive("/transparency") ? "is-active" : ""}`}
          >
            Transparency &amp; SLA
          </Link>
          <Link
            to="/report?spot=CAMPUS-CSLAB-02"
            className={`av-nav__link ${isActive("/report") ? "is-active" : ""}`}
          >
            Try QR Spot
          </Link>
        </nav>

        {/* Zone 3: Compact Actions */}
        <div className="av-topbar__actions">
          <PWAInstallButton compact />

          <button
            type="button"
            className="av-icon-btn"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
          >
            <i className={`bx ${theme === "dark" ? "bx-sun" : "bx-moon"}`} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="av-btn av-btn--primary av-btn--compact"
            onClick={() => navigate("/auth", { state: { panel: "login" } })}
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
}
