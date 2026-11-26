import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/common/Alert";
import Header from "../components/layout/Header";
import useInstitutionBranding from "../hooks/useInstitutionBranding";

export default function QrReportEntry() {
  const [searchParams] = useSearchParams();
  const spotCode = searchParams.get("spot") || "";
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const branding = useInstitutionBranding();

  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [launchingDemo, setLaunchingDemo] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!spotCode) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await API.get(`/public/qr-spots/${encodeURIComponent(spotCode)}?track=false`);
        if (active && res.data?.success) {
          setSpot(res.data.data);
        } else if (active) {
          setError("Campus QR spot not found or inactive.");
        }
      } catch (err) {
        if (active) {
          setError(err?.response?.data?.message || "Campus QR spot not found.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [spotCode]);

  const handleContinueAsDemoStudent = async () => {
    setLaunchingDemo(true);
    try {
      const res = await API.post("/public/demo-login", { role: "student" });
      if (res.data?.success && res.data?.user) {
        login(res.data.user, res.data.accessToken, res.data.refreshToken);
        window.dispatchEvent(new Event("user-updated"));
        toast.success("QR Spot loaded in Demo Student mode.");
        navigate(spotCode ? `/submit?spot=${encodeURIComponent(spotCode)}` : "/submit", {
          replace: true,
        });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to open demo student session.");
    } finally {
      setLaunchingDemo(false);
    }
  };

  return (
    <>
      <Header />
      <main className="av-page" style={{ padding: "48px 0" }}>
        <div className="av-container" style={{ maxWidth: "640px" }}>
          <div className="av-surface">
            <p className="av-kicker">Campus QR Spot Hub · Wayfinding &amp; Express Reporting</p>
            {loading ? (
              <p style={{ color: "var(--av-ink-muted)" }}>Resolving campus QR location...</p>
            ) : error ? (
              <>
                <h1 style={{ fontSize: "1.4rem", marginBottom: "8px" }}>QR Spot Unavailable</h1>
                <p style={{ color: "var(--av-ink-muted)", marginBottom: "20px" }}>{error}</p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <Link to="/campus-map" className="av-btn av-btn--primary">
                    Open Campus Map
                  </Link>
                  <Link to="/" className="av-btn av-btn--ghost">
                    Return Home
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h1 style={{ fontSize: "1.55rem", marginBottom: "8px" }}>
                  {spot ? spot.label : "Campus QR Location"}
                </h1>
                {spot && (
                  <div className="av-meta-line" style={{ marginBottom: "18px" }}>
                    <span className="av-mono" style={{ color: "var(--av-primary)", fontWeight: 700 }}>
                      {spot.spotCode}
                    </span>
                    <span className="av-meta-sep">·</span>
                    <span>{spot.building}</span>
                    <span className="av-meta-sep">·</span>
                    <span>{spot.floor}</span>
                    <span className="av-meta-sep">·</span>
                    <span>Category: {spot.defaultCategory.toUpperCase()}</span>
                  </div>
                )}

                <p style={{ color: "var(--av-ink-muted)", lineHeight: 1.6, marginBottom: "24px" }}>
                  Lock this QR spot as your indoor <strong>You Are Here</strong> anchor for multi-floor accessible wayfinding, or file an issue here with location and category pre-filled automatically.
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                  {spot && (
                    <Link
                      to={`/campus-map?qr=${encodeURIComponent(spot.spotCode)}`}
                      className="av-btn av-btn--primary"
                    >
                      <i className="bx bx-map-pin" aria-hidden="true" />
                      Navigate from Here
                    </Link>
                  )}

                  {user?.role === "user" ? (
                    <Link
                      to={spotCode ? `/submit?spot=${encodeURIComponent(spotCode)}` : "/submit"}
                      className="av-btn av-btn--secondary"
                    >
                      <i className="bx bx-edit" aria-hidden="true" />
                      Report Issue at This Spot
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="av-btn av-btn--secondary"
                      onClick={handleContinueAsDemoStudent}
                      disabled={launchingDemo}
                    >
                      <i className="bx bx-qr-scan" aria-hidden="true" />
                      {launchingDemo ? "Opening Form..." : "Report Now (Demo Student)"}
                    </button>
                  )}

                  {!user && (
                    <Link
                      to="/auth"
                      state={{ panel: "login" }}
                      className="av-btn av-btn--ghost"
                    >
                      Sign In with Campus Account
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
