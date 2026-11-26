import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import JudgeDemoSwitcher from "../components/demo/JudgeDemoSwitcher";
import useInstitutionBranding from "../hooks/useInstitutionBranding";

const INNOVATION_PILLARS = [
  {
    icon: "bx bx-brain",
    title: "AI Smart Triage & Duplicate Guard",
    body: "Gemini structured analysis predicts category, urgency SLA, and English normalization while detecting active semantic duplicates so students tap +1 Affected instead of flooding staff.",
  },
  {
    icon: "bx bx-map-alt",
    title: "Outdoor & Multi-Floor Wayfinding",
    body: "Zero-API-key custom campus & floor-plan routing powered by weighted multi-floor Dijkstra, QR indoor anchor lock, and a Divyangjan wheelchair-accessible mode that avoids stairs.",
  },
  {
    icon: "bx bx-qr-scan",
    title: "QR Spot Reporting & Anchor Lock",
    body: "Printable A5 posters across labs, hostels, and corridors deep-link directly to pre-filled grievance forms or lock indoor 'You Are Here' navigation without Bluetooth beacons.",
  },
  {
    icon: "bx bx-microphone",
    title: "Multilingual Voice Intake (EN · MR · HI)",
    body: "Inclusive speech dictation in English, Marathi, and Hindi with server-side audio transcription fallback and automatic English structuring while preserving original transcripts.",
  },
  {
    icon: "bx bx-shield-alt-2",
    title: "Automated SLA Escalation & NAAC PDF",
    body: "Deterministic SLA engine promotes overdue tickets at 75% (L1) and 100% (L2) breach while generating verifiable NAAC Criterion V & VII institutional PDF dossiers.",
  },
  {
    icon: "bx bx-buildings",
    title: "University Courses & Lost & Found Pins",
    body: "Multi-university department and course hierarchy paired with map-pinned Lost & Found recovery featuring anti-fraud secret verification and 6-character handover codes.",
  },
];

export default function Home() {
  const branding = useInstitutionBranding();
  const [liveStats, setLiveStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await API.get("/public/transparency");
        if (active && res.data?.success) {
          setLiveStats(res.data.data);
        }
      } catch {
        // Honest fallback when database has no records yet
      } finally {
        if (active) setLoadingStats(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const heroKicker = branding.blindEvaluationMode
    ? "Avishkar · Engineering & Technology · Smart Campus Platform"
    : `Avishkar · Engineering & Technology · ${branding.institutionCode} Campus Governance`;

  return (
    <main className="av-page">
      {/* ── Executive Hero & Judge Demo Launcher ── */}
      <section className="av-hero">
        <div className="av-container">
          <div className="av-hero__grid">
            <div>
              <p className="av-kicker">{heroKicker}</p>
              <h1 className="av-hero__title">
                Smart Campus Governance &amp; Indoor Wayfinding, Verified in Real Time.
              </h1>
              <p className="av-hero__lead">
                ComplaintSync unifies custom campus maps with accessible multi-floor Dijkstra routing, QR spot reporting, Marathi/Hindi/English voice intake, Gemini AI triage, map-pinned Lost &amp; Found, and NAAC PDF auditing in one installable PWA.
              </p>

              <div className="av-hero__cta-row">
                <Link to="/campus-map" className="av-btn av-btn--primary">
                  <i className="bx bx-map-alt" aria-hidden="true" />
                  Explore Campus Map
                </Link>
                <Link to="/transparency" className="av-btn av-btn--secondary">
                  <i className="bx bx-bar-chart-alt-2" aria-hidden="true" />
                  Live SLA Leaderboard
                </Link>
                <Link to="/report?spot=CAMPUS-CSLAB-02" className="av-btn av-btn--ghost">
                  <i className="bx bx-qr-scan" aria-hidden="true" />
                  Try QR Spot
                </Link>
              </div>

              <div className="av-meta-line">
                <span>Multi-Floor Dijkstra + Wheelchair Mode</span>
                <span className="av-meta-sep">·</span>
                <span>Server-Side Gemini AI</span>
                <span className="av-meta-sep">·</span>
                <span>Cloud SQL PostgreSQL</span>
                <span className="av-meta-sep">·</span>
                <span>Installable PWA</span>
              </div>
            </div>

            {/* Right Column: Live Judge One-Click Demo Panel */}
            <div className="av-surface av-hero__demo-panel">
              <div style={{ marginBottom: "16px" }}>
                <p className="av-kicker" style={{ marginBottom: "6px" }}>
                  Avishkar Evaluator Fast-Track
                </p>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "4px" }}>
                  One-Click Live Role Exploration
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--av-ink-muted)", lineHeight: 1.5 }}>
                  Launch any role instantly with pre-seeded smart campus maps, academic departments, Lost &amp; Found pins, active QR spots, multilingual transcripts, and live SLA triggers.
                </p>
              </div>
              <JudgeDemoSwitcher variant="cards" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Campus Transparency Telemetry (Zero Hardcoded Stats) ── */}
      <section className="av-section">
        <div className="av-container">
          <div className="av-section__head">
            <div>
              <h2 className="av-section__title">Live Institutional Pulse</h2>
              <p className="av-section__sub">
                Computed directly from Cloud SQL records—never static marketing numbers.
              </p>
            </div>
            <Link to="/transparency" className="av-btn av-btn--ghost av-btn--compact">
              View Full Leaderboard &amp; Ticket Tracker →
            </Link>
          </div>

          <div className="av-kpi-grid">
            <div className="av-kpi-card">
              <div className="av-kpi-card__label">SLA Compliance</div>
              <div className="av-kpi-card__value" style={{ color: "var(--av-success)" }}>
                {loadingStats ? "—" : `${liveStats?.slaCompliancePct ?? 0}%`}
              </div>
              <div className="av-kpi-card__meta">
                {liveStats?.resolvedCount ?? 0} resolved · {liveStats?.totalComplaints ?? 0} total tickets
              </div>
            </div>

            <div className="av-kpi-card">
              <div className="av-kpi-card__label">Avg Resolution Speed</div>
              <div className="av-kpi-card__value">
                {loadingStats ? "—" : `${liveStats?.avgResolutionHours ?? 0}h`}
              </div>
              <div className="av-kpi-card__meta">
                Urgent 4h · High 24h · Medium 72h SLA windows
              </div>
            </div>

            <div className="av-kpi-card">
              <div className="av-kpi-card__label">Duplicates Suppressed</div>
              <div className="av-kpi-card__value" style={{ color: "var(--av-primary)" }}>
                {loadingStats ? "—" : liveStats?.duplicateEndorsementsSaved ?? 0}
              </div>
              <div className="av-kpi-card__meta">
                Merged via AI duplicate matching &amp; +1 endorsements
              </div>
            </div>

            <div className="av-kpi-card">
              <div className="av-kpi-card__label">Active Campus QR Spots</div>
              <div className="av-kpi-card__value">
                {loadingStats ? "—" : liveStats?.activeQrSpotCount ?? 0}
              </div>
              <div className="av-kpi-card__meta">
                {liveStats?.totalQrScans ?? 0} total on-site scans recorded
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Engineering & Technology Innovation Architecture ── */}
      <section className="av-section" style={{ borderBottom: "none" }}>
        <div className="av-container">
          <div className="av-section__head">
            <div>
              <h2 className="av-section__title">Core Engineering Modules</h2>
              <p className="av-section__sub">
                Closed-loop cyber-physical workflow from on-site reporting to accredited institutional compliance.
              </p>
            </div>
          </div>

          <div className="av-pillars-grid">
            {INNOVATION_PILLARS.map((item) => (
              <article key={item.title} className="av-pillar">
                <div className="av-pillar__icon" aria-hidden="true">
                  <i className={item.icon} />
                </div>
                <h3 className="av-pillar__title">{item.title}</h3>
                <p className="av-pillar__body">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
