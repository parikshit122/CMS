import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import API from "../../services/api";
import { useToast } from "../../components/common/Alert";
import { downloadNaacAuditPdf } from "../../utils/naacPdfExport";
import useInstitutionBranding from "../../hooks/useInstitutionBranding";
import "../../styles/AdminDashboard.css";
import "../../styles/ComplaintExtras.css";

const formatLastUpdated = (value) => {
  if (!value) return "Live";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminDashboard = () => {
  const toast = useToast();
  const branding = useInstitutionBranding();
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pending: 0,
    resolved: 0,
    inProgress: 0,
    avgResponseTime: 0,
    overdueCount: 0,
    satisfaction: {
      averageRating: 0,
      totalRated: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    weeklyData: [],
    monthlyData: [],
    categoryBreakdown: [],
    avishkar: {
      escalatedL1Count: 0,
      escalatedL2Count: 0,
      qrComplaintCount: 0,
      voiceComplaintCount: 0,
      aiTriagedCount: 0,
      duplicateEndorsementsSaved: 0,
      regionalLanguageCount: 0,
    },
    lastUpdated: null,
  });

  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [naacRange, setNaacRange] = useState("all");
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [lastEscalationLog, setLastEscalationLog] = useState([]);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const res = await API.get("/complaints/stats/admin");
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const handleRunEscalation = async () => {
    if (escalating) return;
    setEscalating(true);
    try {
      const res = await API.post("/avishkar/escalate/run");
      if (res.data?.success) {
        toast.success(res.data.message);
        setLastEscalationLog(res.data.data?.escalated || []);
        await fetchAdminStats();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "SLA escalation sweep failed.");
    } finally {
      setEscalating(false);
    }
  };

  const handleExportNaacPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const res = await API.get(`/avishkar/naac-report?range=${encodeURIComponent(naacRange)}`);
      if (res.data?.success) {
        downloadNaacAuditPdf(res.data.data);
        toast.success("NAAC Criterion V & VII Audit PDF downloaded.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate NAAC audit report.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleSeedDemoData = async () => {
    if (seedingDemo) return;
    setSeedingDemo(true);
    try {
      const res = await API.post("/avishkar/demo/reset");
      if (res.data?.success) {
        toast.success(res.data.message);
        setLastEscalationLog([]);
        await fetchAdminStats();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reset demo campus dataset.");
    } finally {
      setSeedingDemo(false);
    }
  };

  const av = stats.avishkar || {};
  const hasWeeklyData = useMemo(
    () => (stats.weeklyData || []).some((d) => (d.submitted || 0) > 0 || (d.resolved || 0) > 0),
    [stats.weeklyData]
  );
  const hasMonthlyData = useMemo(
    () => (stats.monthlyData || []).some((d) => (d.value || 0) > 0),
    [stats.monthlyData]
  );

  return (
    <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "8px 0 128px" }}>
      {/* ── Executive Header & Primary Action Bar ── */}
      <div className="av-section__head" style={{ marginBottom: "20px" }}>
        <div>
          <p className="av-kicker">
            {branding.blindEvaluationMode
              ? "Smart Campus Governance"
              : `${branding.institutionCode} Campus Governance`}{" "}
            · Updated {formatLastUpdated(stats.lastUpdated)}
          </p>
          <h1 className="av-section__title" style={{ marginBottom: "4px" }}>
            Admin Command &amp; NAAC Compliance
          </h1>
          <p className="av-section__sub">
            Live grievance telemetry, automated multi-tier SLA escalation, QR spot management, and accredited PDF reporting.
          </p>
        </div>

        <div className="av-admin-actions">
          <select
            aria-label="NAAC audit report timeframe"
            value={naacRange}
            onChange={(e) => setNaacRange(e.target.value)}
            style={{
              minHeight: "44px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid var(--av-border-strong)",
              background: "var(--av-surface)",
              color: "var(--av-ink)",
              fontSize: "0.85rem",
            }}
          >
            <option value="all">NAAC: All Time</option>
            <option value="semester">NAAC: Current Semester</option>
            <option value="30d">NAAC: Last 30 Days</option>
          </select>

          <button
            type="button"
            className="av-btn av-btn--primary"
            onClick={handleExportNaacPdf}
            disabled={exportingPdf}
          >
            <i className="bx bxs-file-pdf" aria-hidden="true" />
            {exportingPdf ? "Generating PDF..." : "Export NAAC PDF"}
          </button>

          <button
            type="button"
            className="av-btn av-btn--secondary"
            onClick={handleRunEscalation}
            disabled={escalating}
          >
            <i className="bx bx-shield-quarter" aria-hidden="true" />
            {escalating ? "Scanning SLA..." : "Run SLA Escalation Check"}
          </button>

          <Link to="/admin/campus-studio" className="av-btn av-btn--ghost">
            <i className="bx bx-map-alt" aria-hidden="true" />
            Campus Studio
          </Link>

          <Link to="/admin/qr-spots" className="av-btn av-btn--ghost">
            <i className="bx bx-qr" aria-hidden="true" />
            QR Spot Studio
          </Link>

          <button
            type="button"
            className="av-btn av-btn--ghost"
            onClick={handleSeedDemoData}
            disabled={seedingDemo}
            title="Safely populate or reset smart campus demo complaints, maps, courses, and Lost & Found pins"
          >
            <i className="bx bx-refresh" aria-hidden="true" />
            {seedingDemo ? "Seeding..." : "Reset Demo Data"}
          </button>
        </div>
      </div>

      {/* ── Live Escalation Sweep Feedback Banner ── */}
      {lastEscalationLog.length > 0 && (
        <div
          className="av-surface"
          style={{
            marginBottom: "20px",
            borderColor: "rgba(239, 68, 68, 0.4)",
            background: "var(--av-danger-soft)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: "8px", color: "var(--av-danger)" }}>
            Escalation Engine Actioned {lastEscalationLog.length} Ticket(s)
          </div>
          {lastEscalationLog.map((e) => (
            <div key={e.complaintId} style={{ fontSize: "0.86rem", marginBottom: "4px" }}>
              <span className="av-mono" style={{ fontWeight: 700 }}>
                {e.complaintId}
              </span>{" "}
              (L{e.previousLevel} → L{e.newLevel}): {e.title} — {e.reason}
            </div>
          ))}
        </div>
      )}

      {/* ── Core Operational KPI Strip ── */}
      <div className="av-kpi-grid" style={{ marginBottom: "16px" }}>
        <div className="av-kpi-card">
          <div className="av-kpi-card__label">Total Complaints</div>
          <div className="av-kpi-card__value">{loading ? "—" : stats.totalComplaints}</div>
          <div className="av-kpi-card__meta">
            {stats.pending} pending · {stats.inProgress} in progress
          </div>
        </div>

        <div className="av-kpi-card">
          <div className="av-kpi-card__label">Resolved Tickets</div>
          <div className="av-kpi-card__value" style={{ color: "var(--av-success)" }}>
            {loading ? "—" : stats.resolved}
          </div>
          <div className="av-kpi-card__meta">
            Avg turnaround: {stats.avgResponseTime || 0} hrs
          </div>
        </div>

        <div className="av-kpi-card">
          <div className="av-kpi-card__label">Active SLA Escalations</div>
          <div
            className="av-kpi-card__value"
            style={{
              color:
                (av.escalatedL2Count || 0) > 0
                  ? "var(--av-danger)"
                  : (av.escalatedL1Count || 0) > 0
                    ? "var(--av-warning)"
                    : "var(--av-success)",
            }}
          >
            {loading ? "—" : (av.escalatedL1Count || 0) + (av.escalatedL2Count || 0)}
          </div>
          <div className="av-kpi-card__meta av-mono">
            L1 Warning: {av.escalatedL1Count || 0} · L2 Breach: {av.escalatedL2Count || 0}
          </div>
        </div>

        <div className="av-kpi-card">
          <div className="av-kpi-card__label">Student Satisfaction</div>
          <div className="av-kpi-card__value">
            {loading
              ? "—"
              : stats.satisfaction?.totalRated
                ? `${stats.satisfaction.averageRating} ★`
                : "—"}
          </div>
          <div className="av-kpi-card__meta">
            {stats.satisfaction?.totalRated || 0} verified post-resolution ratings
          </div>
        </div>
      </div>

      {/* ── Avishkar Innovation Telemetry Strip ── */}
      <div className="av-ops-strip">
        <div className="av-kpi-card">
          <div className="av-kpi-card__label">AI Triaged Reports</div>
          <div className="av-kpi-card__value" style={{ fontSize: "1.45rem" }}>
            {loading ? "—" : av.aiTriagedCount || 0}
          </div>
          <div className="av-kpi-card__meta">Gemini structured classification</div>
        </div>

        <div className="av-kpi-card">
          <div className="av-kpi-card__label">Duplicates Prevented</div>
          <div className="av-kpi-card__value" style={{ fontSize: "1.45rem", color: "var(--av-primary)" }}>
            {loading ? "—" : av.duplicateEndorsementsSaved || 0}
          </div>
          <div className="av-kpi-card__meta">Endorsed via +1 Affected</div>
        </div>

        <div className="av-kpi-card">
          <div className="av-kpi-card__label">QR Spot Filings</div>
          <div className="av-kpi-card__value" style={{ fontSize: "1.45rem" }}>
            {loading ? "—" : av.qrComplaintCount || 0}
          </div>
          <div className="av-kpi-card__meta">Direct on-site poster scans</div>
        </div>

        <div className="av-kpi-card">
          <div className="av-kpi-card__label">Voice / Regional Intake</div>
          <div className="av-kpi-card__value" style={{ fontSize: "1.45rem" }}>
            {loading ? "—" : `${av.voiceComplaintCount || 0} / ${av.regionalLanguageCount || 0}`}
          </div>
          <div className="av-kpi-card__meta">Voice filings · Marathi/Hindi</div>
        </div>
      </div>

      {/* ── Real Database Charts Row (Zero Synthetic Fallbacks) ── */}
      <div className="charts-bento-grid" style={{ marginBottom: "24px" }}>
        <div className="av-surface">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>
            7-Day Intake vs Resolution
          </h2>
          <p style={{ color: "var(--av-ink-muted)", fontSize: "0.82rem", marginBottom: "18px" }}>
            Live daily tickets submitted vs closed
          </p>
          {hasWeeklyData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                <XAxis dataKey="day" stroke="var(--av-ink-muted)" tickLine={false} />
                <YAxis stroke="var(--av-ink-muted)" tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--av-surface)",
                    border: "1px solid var(--av-border-strong)",
                    borderRadius: "10px",
                    color: "var(--av-ink)",
                  }}
                />
                <Bar dataKey="submitted" name="Submitted" fill="#ea580c" radius={[5, 5, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--av-ink-muted)", fontSize: "0.875rem" }}>
              No complaint activity in the past 7 days. Click <strong>Reset Demo Data</strong> to populate realistic smart campus records.
            </div>
          )}
        </div>

        <div className="av-surface">
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "4px" }}>
            6-Month Volume Trajectory
          </h2>
          <p style={{ color: "var(--av-ink-muted)", fontSize: "0.82rem", marginBottom: "18px" }}>
            Monthly institutional complaint intake
          </p>
          {hasMonthlyData ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                <XAxis dataKey="month" stroke="var(--av-ink-muted)" tickLine={false} />
                <YAxis stroke="var(--av-ink-muted)" tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--av-surface)",
                    border: "1px solid var(--av-border-strong)",
                    borderRadius: "10px",
                    color: "var(--av-ink)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Complaints"
                  stroke="#ea580c"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#ea580c" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: "48px 16px", textAlign: "center", color: "var(--av-ink-muted)", fontSize: "0.875rem" }}>
              No monthly trend data recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* ── Category Breakdown ── */}
      <div className="av-surface">
        <div className="av-section__head" style={{ marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Category Distribution</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--av-ink-muted)" }}>
              SLA Windows: Urgent 4h · High 24h · Medium 72h · Low 7d
            </p>
          </div>
          <Link to="/transparency" className="av-btn av-btn--ghost av-btn--compact">
            Open Public SLA Board →
          </Link>
        </div>

        {(stats.categoryBreakdown || []).length === 0 ? (
          <p style={{ color: "var(--av-ink-muted)", fontSize: "0.875rem" }}>
            No categorized complaints yet.
          </p>
        ) : (
          <div className="av-kpi-grid">
            {stats.categoryBreakdown.map((item) => (
              <div key={item.label} className="av-kpi-card" style={{ background: "var(--av-surface-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {item.label?.charAt(0).toUpperCase() + item.label?.slice(1)}
                  </span>
                  <i className={item.icon} style={{ color: "var(--av-primary)", fontSize: "1.1rem" }} aria-hidden="true" />
                </div>
                <div className="av-kpi-card__value" style={{ fontSize: "1.5rem" }}>
                  {loading ? "—" : item.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
