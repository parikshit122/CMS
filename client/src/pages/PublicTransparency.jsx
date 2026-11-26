import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import JudgeDemoSwitcher from "../components/demo/JudgeDemoSwitcher";
import useInstitutionBranding from "../hooks/useInstitutionBranding";

const CATEGORY_LABELS = {
  it: "IT & Network",
  infrastructure: "Infrastructure",
  electrical: "Electrical",
  plumbing: "Plumbing & Water",
  cleanliness: "Cleanliness & Hygiene",
  safety: "Campus Safety",
  academic: "Academic Affairs",
  other: "General Campus",
};

const formatCategory = (cat) =>
  CATEGORY_LABELS[String(cat || "").toLowerCase()] ||
  (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : "General");

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PublicTransparency() {
  const branding = useInstitutionBranding();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("compositeScore");

  const [lookupCode, setLookupCode] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await API.get("/public/transparency");
        if (active && res.data?.success) {
          setStats(res.data.data);
        }
      } catch {
        // Empty fallback handled honestly in UI
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sortedLeaderboard = useMemo(() => {
    const list = [...(stats?.leaderboard || [])];
    return list.sort((a, b) => {
      if (sortBy === "avgResolutionHours") {
        return (a.avgResolutionHours || 999) - (b.avgResolutionHours || 999);
      }
      return (b[sortBy] || 0) - (a[sortBy] || 0);
    });
  }, [stats, sortBy]);

  const handleTrack = async (e) => {
    e.preventDefault();
    const code = lookupCode.trim();
    if (!code) {
      setLookupError("Enter a complaint reference ID such as CMP-2026-0001.");
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const res = await API.get(`/public/track/${encodeURIComponent(code)}`);
      if (res.data?.success) {
        setLookupResult(res.data.data);
      } else {
        setLookupError(res.data?.message || "Complaint not found.");
      }
    } catch (err) {
      setLookupError(err?.response?.data?.message || "No matching public ticket found.");
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="av-page">
        <section className="av-hero">
          <div className="av-container">
            <p className="av-kicker">Open Institutional Governance · Live Cloud SQL Telemetry</p>
            <h1 className="av-hero__title">Campus Transparency &amp; SLA Leaderboard</h1>
            <p className="av-hero__lead">
              Real-time accountability metrics for{" "}
              {branding.blindEvaluationMode
                ? "smart campus"
                : `${branding.institutionCode} campus`}{" "}
              maintenance, IT, hostel, and academic departments. Student personal data is strictly masked while resolution velocity and SLA compliance remain publicly verifiable.
            </p>

            <div className="av-kpi-grid" style={{ marginTop: "28px" }}>
              <div className="av-kpi-card">
                <div className="av-kpi-card__label">Resolution Rate</div>
                <div className="av-kpi-card__value">
                  {loading ? "—" : `${stats?.resolutionRatePct ?? 0}%`}
                </div>
                <div className="av-kpi-card__meta">
                  {stats?.resolvedCount ?? 0} of {stats?.totalComplaints ?? 0} tickets closed
                </div>
              </div>

              <div className="av-kpi-card">
                <div className="av-kpi-card__label">SLA Compliance</div>
                <div className="av-kpi-card__value" style={{ color: "var(--av-success)" }}>
                  {loading ? "—" : `${stats?.slaCompliancePct ?? 0}%`}
                </div>
                <div className="av-kpi-card__meta">
                  Resolved or active within priority window
                </div>
              </div>

              <div className="av-kpi-card">
                <div className="av-kpi-card__label">Avg Turnaround</div>
                <div className="av-kpi-card__value">
                  {loading ? "—" : `${stats?.avgResolutionHours ?? 0}h`}
                </div>
                <div className="av-kpi-card__meta">
                  Mean hours from submission to resolution
                </div>
              </div>

              <div className="av-kpi-card">
                <div className="av-kpi-card__label">Duplicates Prevented</div>
                <div className="av-kpi-card__value" style={{ color: "var(--av-primary)" }}>
                  {loading ? "—" : stats?.duplicateEndorsementsSaved ?? 0}
                </div>
                <div className="av-kpi-card__meta">
                  Merged via AI duplicate endorsement (+1)
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Department SLA Leaderboard ── */}
        <section className="av-section">
          <div className="av-container">
            <div className="av-section__head">
              <div>
                <h2 className="av-section__title">Department SLA Leaderboard</h2>
                <p className="av-section__sub">
                  Ranked by composite score (50% SLA compliance · 30% resolution rate · 20% verified student satisfaction).
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label htmlFor="leaderboard-sort" style={{ fontSize: "0.82rem", color: "var(--av-ink-muted)" }}>
                  Sort by
                </label>
                <select
                  id="leaderboard-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    minHeight: "40px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--av-border-strong)",
                    background: "var(--av-surface)",
                    color: "var(--av-ink)",
                  }}
                >
                  <option value="compositeScore">Overall Score</option>
                  <option value="slaCompliancePct">SLA Compliance %</option>
                  <option value="avgResolutionHours">Fastest Resolution</option>
                  <option value="avgRating">Student Rating</option>
                </select>
              </div>
            </div>

            <div className="av-surface" style={{ padding: "8px 0" }}>
              {loading ? (
                <p style={{ padding: "24px", color: "var(--av-ink-muted)" }}>
                  Loading live department rankings...
                </p>
              ) : sortedLeaderboard.length === 0 ? (
                <div style={{ padding: "32px", textAlign: "center" }}>
                  <p style={{ color: "var(--av-ink-muted)", marginBottom: "14px" }}>
                    No complaints recorded yet. Launch any Judge Demo role below to populate the smart campus dataset.
                  </p>
                </div>
              ) : (
                <div className="av-table-wrap">
                  <table className="av-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Department / Category</th>
                        <th>Tickets</th>
                        <th>SLA Compliance</th>
                        <th>Avg Turnaround</th>
                        <th>Satisfaction</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedLeaderboard.map((row, idx) => (
                        <tr key={row.category}>
                          <td className="av-mono" style={{ fontWeight: 700 }}>
                            #{idx + 1}
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatCategory(row.category)}</td>
                          <td className="av-mono">
                            {row.resolved} / {row.total}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div className="av-bar-track">
                                <div
                                  className={`av-bar-fill ${
                                    row.slaCompliancePct >= 80
                                      ? ""
                                      : row.slaCompliancePct >= 55
                                        ? "av-bar-fill--warn"
                                        : "av-bar-fill--danger"
                                  }`}
                                  style={{ width: `${row.slaCompliancePct}%` }}
                                />
                              </div>
                              <span className="av-mono">{row.slaCompliancePct}%</span>
                            </div>
                          </td>
                          <td className="av-mono">{row.avgResolutionHours || "—"}h</td>
                          <td className="av-mono">
                            {row.ratedCount > 0 ? `${row.avgRating} ★ (${row.ratedCount})` : "No ratings"}
                          </td>
                          <td className="av-mono" style={{ fontWeight: 700, color: "var(--av-primary)" }}>
                            {row.compositeScore} / 100
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Privacy-Safe Public Ticket Tracker ── */}
        <section className="av-section">
          <div className="av-container">
            <div className="av-section__head">
              <div>
                <h2 className="av-section__title">Privacy-Safe Complaint Status Lookup</h2>
                <p className="av-section__sub">
                  Verify progress and SLA escalation status for any reference ID without exposing student identity or private attachments.
                </p>
              </div>
            </div>

            <div className="av-surface">
              <form
                onSubmit={handleTrack}
                style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}
              >
                <label htmlFor="public-track-input" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
                  Complaint Reference ID
                </label>
                <input
                  id="public-track-input"
                  type="text"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value)}
                  placeholder="Enter Reference ID (e.g. CMP-2026-0001)"
                  style={{
                    flex: "1 1 280px",
                    minHeight: "44px",
                    padding: "0 14px",
                    borderRadius: "10px",
                    border: "1px solid var(--av-border-strong)",
                    background: "var(--av-surface-subtle)",
                    color: "var(--av-ink)",
                    fontFamily: "var(--av-font-mono)",
                  }}
                />
                <button
                  type="submit"
                  className="av-btn av-btn--primary"
                  disabled={lookupLoading}
                >
                  <i className="bx bx-search" aria-hidden="true" />
                  {lookupLoading ? "Checking..." : "Track Ticket"}
                </button>
              </form>

              {lookupError && (
                <p style={{ marginTop: "14px", color: "var(--av-danger)", fontSize: "0.875rem" }} role="alert">
                  {lookupError}
                </p>
              )}

              {lookupResult && (
                <div
                  style={{
                    marginTop: "20px",
                    paddingTop: "20px",
                    borderTop: "1px solid var(--av-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <div className="av-mono" style={{ fontSize: "0.82rem", color: "var(--av-primary)", fontWeight: 700 }}>
                        {lookupResult.complaintId} · {formatCategory(lookupResult.category)} ·{" "}
                        {String(lookupResult.sourceChannel || "web").toUpperCase()}
                      </div>
                      <h3 style={{ fontSize: "1.15rem", marginTop: "4px" }}>{lookupResult.title}</h3>
                    </div>
                    <div className="av-meta-line">
                      <span
                        className={`av-status ${
                          lookupResult.status === "resolved"
                            ? "av-status--ok"
                            : lookupResult.escalationLevel >= 2
                              ? "av-status--danger"
                              : "av-status--warn"
                        }`}
                      >
                        <span className="av-status__dot" />
                        {lookupResult.status.toUpperCase()}
                      </span>
                      <span className="av-meta-sep">·</span>
                      <span className="av-mono">
                        {lookupResult.endorsementCount} student{lookupResult.endorsementCount === 1 ? "" : "s"} affected
                      </span>
                      {lookupResult.escalationLevel > 0 && (
                        <>
                          <span className="av-meta-sep">·</span>
                          <span className="av-status av-status--danger">
                            Escalated L{lookupResult.escalationLevel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="av-meta-line" style={{ marginBottom: "16px" }}>
                    <span>Location: {lookupResult.location}</span>
                    <span className="av-meta-sep">·</span>
                    <span>Priority: {String(lookupResult.priority || "").toUpperCase()}</span>
                    <span className="av-meta-sep">·</span>
                    <span>SLA Due: {formatDateTime(lookupResult.slaDueAt)}</span>
                  </div>

                  {lookupResult.timeline?.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {lookupResult.timeline.map((step, i) => (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "12px",
                            padding: "10px 12px",
                            borderRadius: "8px",
                            background: "var(--av-surface-subtle)",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span>{step.body}</span>
                          <span className="av-mono" style={{ color: "var(--av-ink-muted)", flexShrink: 0 }}>
                            {formatDateTime(step.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Judge Demo Bar at Bottom of Public Portal ── */}
        <section className="av-section" style={{ borderBottom: "none" }}>
          <div className="av-container">
            <div className="av-section__head">
              <div>
                <h2 className="av-section__title">Avishkar Live Judge Demo</h2>
                <p className="av-section__sub">
                  Switch directly into any role with pre-populated campus complaints, QR spots, and active SLA timers.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <Link to="/campus-map" className="av-btn av-btn--secondary">
                  <i className="bx bx-map-alt" aria-hidden="true" />
                  Explore Campus Map
                </Link>
                <Link to="/" className="av-btn av-btn--ghost">
                  Back to Home
                </Link>
              </div>
            </div>
            <JudgeDemoSwitcher variant="cards" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
