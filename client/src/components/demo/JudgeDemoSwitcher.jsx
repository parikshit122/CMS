import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../common/Alert";

const DEMO_ROLES = [
  {
    key: "student",
    label: "Demo Student",
    shortLabel: "Student",
    icon: "bx bx-user",
    route: "/dashboard",
    desc: "QR spot filing, Marathi/Hindi voice & AI duplicate detection",
  },
  {
    key: "staff",
    label: "Demo Staff",
    shortLabel: "Staff",
    icon: "bx bx-wrench",
    route: "/staff",
    desc: "Prioritized SLA queue, status updates & activity timelines",
  },
  {
    key: "admin",
    label: "Demo Admin",
    shortLabel: "Admin",
    icon: "bx bx-shield-quarter",
    route: "/admin",
    desc: "Live escalation engine, QR Spot Studio & NAAC PDF reports",
  },
];

export default function JudgeDemoSwitcher({ variant = "cards", redirectAfter = null }) {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loadingRole, setLoadingRole] = useState(null);

  const activeDemoRole = user?.isDemo
    ? user.role === "user"
      ? "student"
      : user.role
    : null;

  const handleSwitch = async (roleObj) => {
    if (loadingRole) return;
    setLoadingRole(roleObj.key);
    try {
      const res = await API.post("/public/demo-login", { role: roleObj.key });
      if (res.data?.success && res.data?.user && res.data?.accessToken) {
        login(res.data.user, res.data.accessToken, res.data.refreshToken);
        window.dispatchEvent(new Event("user-updated"));
        toast.success(`Active Judge Demo: ${roleObj.label}`);
        navigate(redirectAfter || roleObj.route, { replace: true });
      } else {
        toast.error(res.data?.message || "Unable to start demo session.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to switch demo role.");
    } finally {
      setLoadingRole(null);
    }
  };

  if (variant === "compact") {
    return (
      <div className="av-demo-bar" role="group" aria-label="Avishkar Judge Demo Role Switcher">
        <span className="av-demo-bar__tag">Demo</span>
        {DEMO_ROLES.map((r) => {
          const isCurrent = activeDemoRole === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => handleSwitch(r)}
              disabled={Boolean(loadingRole)}
              className={`av-demo-bar__btn ${isCurrent ? "is-active" : ""}`}
              aria-pressed={isCurrent}
              title={`Switch to ${r.label}`}
            >
              {loadingRole === r.key ? "..." : r.shortLabel}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="av-demo-grid" role="group" aria-label="One-Click Avishkar Judge Demo Roles">
      {DEMO_ROLES.map((r) => (
        <button
          key={r.key}
          type="button"
          className="av-demo-card"
          onClick={() => handleSwitch(r)}
          disabled={Boolean(loadingRole)}
        >
          <div className="av-demo-card__head">
            <span className="av-demo-card__icon" aria-hidden="true">
              <i className={r.icon} />
            </span>
            <span className="av-demo-card__title">
              {loadingRole === r.key ? "Launching..." : r.label}
            </span>
            <i className="bx bx-right-arrow-alt av-demo-card__arrow" aria-hidden="true" />
          </div>
          <p className="av-demo-card__desc">{r.desc}</p>
        </button>
      ))}
    </div>
  );
}
