import { useEffect, useState } from "react";
import QRCode from "qrcode";
import API from "../../services/api";
import { useToast } from "../../components/common/Alert";
import useInstitutionBranding from "../../hooks/useInstitutionBranding";

const CAMPUS_LOCATIONS = [
  { id: "lab-cs", label: "Computer Lab" },
  { id: "eng-cse", label: "Engineering — CSE" },
  { id: "eng-ece", label: "Engineering — ECE" },
  { id: "eng-mech", label: "Engineering — Mechanical" },
  { id: "eng-civil", label: "Engineering — Civil" },
  { id: "lab-phy", label: "Physics Lab" },
  { id: "lab-chem", label: "Chemistry Lab" },
  { id: "library", label: "Central Library" },
  { id: "canteen", label: "Campus Canteen" },
  { id: "auditorium", label: "Auditorium" },
  { id: "parking", label: "Parking Area" },
  { id: "hostel-a", label: "Hostel Block A" },
  { id: "hostel-b", label: "Hostel Block B" },
  { id: "hostel-girls", label: "Girls' Hostel" },
  { id: "admin", label: "Admin Office" },
];

const CATEGORIES = [
  "infrastructure",
  "it",
  "electrical",
  "plumbing",
  "cleanliness",
  "safety",
  "academic",
  "other",
];

function QrSpotImage({ url, size = 148 }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: "#0B0F17", light: "#FFFFFF" },
    })
      .then((src) => {
        if (active) setDataUrl(src);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [url, size]);

  if (!dataUrl) {
    return <div style={{ width: size, height: size }} aria-label="Generating QR code" />;
  }
  return <img src={dataUrl} alt={`QR code for ${url}`} width={size} height={size} />;
}

export default function QrSpotStudio() {
  const toast = useToast();
  const branding = useInstitutionBranding();
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [posterSpot, setPosterSpot] = useState(null);

  const displaySpotCode = (code) => {
    const raw = String(code || "");
    if (!branding.blindEvaluationMode) return raw;
    const customCode = String(branding.institutionCode || "").trim();
    if (customCode && customCode.toUpperCase() !== "CAMPUS") {
      return raw.replace(new RegExp(`^${customCode}-`, "i"), "CAMPUS-");
    }
    return raw;
  };

  const [form, setForm] = useState({
    spotCode: "",
    label: "",
    building: "",
    floor: "Ground Floor",
    locationId: "lab-cs",
    defaultCategory: "it",
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const fetchSpots = async () => {
    try {
      setLoading(true);
      const res = await API.get("/avishkar/qr-spots");
      if (res.data?.success) {
        setSpots(res.data.data || []);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load campus QR spots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpots();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.spotCode.trim() || !form.label.trim() || !form.building.trim()) {
      toast.error("Please fill Spot Code, Label, and Building.");
      return;
    }
    setCreating(true);
    try {
      const res = await API.post("/avishkar/qr-spots", form);
      if (res.data?.success) {
        toast.success(res.data.message || "QR spot created.");
        setForm({
          spotCode: "",
          label: "",
          building: "",
          floor: "Ground Floor",
          locationId: "lab-cs",
          defaultCategory: "it",
        });
        fetchSpots();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to create QR spot.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (spot) => {
    try {
      await API.patch(`/avishkar/qr-spots/${spot.id}`, { isActive: !spot.isActive });
      toast.success(spot.isActive ? `${spot.spotCode} paused.` : `${spot.spotCode} activated.`);
      fetchSpots();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update QR spot.");
    }
  };

  const handleDelete = async (spot) => {
    try {
      await API.delete(`/avishkar/qr-spots/${spot.id}`);
      toast.success(`Removed ${spot.spotCode}.`);
      fetchSpots();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete QR spot.");
    }
  };

  const copySpotLink = async (spotCode) => {
    const url = `${origin}/report?spot=${encodeURIComponent(spotCode)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Copied QR reporting link to clipboard.");
    } catch {
      toast.info(url);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "8px 0 128px" }}>
      <div className="av-section__head" style={{ marginBottom: "24px" }}>
        <div>
          <p className="av-kicker">Cyber-Physical Campus Intake</p>
          <h1 className="av-section__title" style={{ marginBottom: "4px" }}>
            QR Code Campus Spot Studio
          </h1>
          <p className="av-section__sub">
            Generate printable A5 location posters for labs, hostels, and corridors. Scanning pre-fills location &amp; category so students file issues in under 20 seconds.
          </p>
        </div>
      </div>

      {/* ── Create New Campus QR Spot Form ── */}
      <form onSubmit={handleCreate} className="av-surface" style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "14px" }}>
          Register New Physical QR Spot
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "12px",
            marginBottom: "14px",
          }}
        >
          <div>
            <label htmlFor="qr-code" style={{ display: "block", fontSize: "0.78rem", color: "var(--av-ink-muted)", marginBottom: "4px" }}>
              Spot Code
            </label>
            <input
              id="qr-code"
              type="text"
              placeholder={branding.blindEvaluationMode ? "CAMPUS-LAB-05" : `${branding.institutionCode || "CAMPUS"}-LAB-05`}
              value={form.spotCode}
              onChange={(e) => setForm((p) => ({ ...p, spotCode: e.target.value }))}
              style={{ width: "100%", minHeight: "42px", padding: "0 12px", borderRadius: "8px" }}
            />
          </div>
          <div>
            <label htmlFor="qr-label" style={{ display: "block", fontSize: "0.78rem", color: "var(--av-ink-muted)", marginBottom: "4px" }}>
              Spot Label
            </label>
            <input
              id="qr-label"
              type="text"
              placeholder="AI & Robotics Lab Desk"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              style={{ width: "100%", minHeight: "42px", padding: "0 12px", borderRadius: "8px" }}
            />
          </div>
          <div>
            <label htmlFor="qr-building" style={{ display: "block", fontSize: "0.78rem", color: "var(--av-ink-muted)", marginBottom: "4px" }}>
              Building
            </label>
            <input
              id="qr-building"
              type="text"
              placeholder="Engineering Block A"
              value={form.building}
              onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))}
              style={{ width: "100%", minHeight: "42px", padding: "0 12px", borderRadius: "8px" }}
            />
          </div>
          <div>
            <label htmlFor="qr-floor" style={{ display: "block", fontSize: "0.78rem", color: "var(--av-ink-muted)", marginBottom: "4px" }}>
              Floor
            </label>
            <input
              id="qr-floor"
              type="text"
              placeholder="2nd Floor"
              value={form.floor}
              onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))}
              style={{ width: "100%", minHeight: "42px", padding: "0 12px", borderRadius: "8px" }}
            />
          </div>
          <div>
            <label htmlFor="qr-loc" style={{ display: "block", fontSize: "0.78rem", color: "var(--av-ink-muted)", marginBottom: "4px" }}>
              Mapped Location
            </label>
            <select
              id="qr-loc"
              value={form.locationId}
              onChange={(e) => setForm((p) => ({ ...p, locationId: e.target.value }))}
              style={{ width: "100%", minHeight: "42px", padding: "0 10px", borderRadius: "8px" }}
            >
              {CAMPUS_LOCATIONS.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="qr-cat" style={{ display: "block", fontSize: "0.78rem", color: "var(--av-ink-muted)", marginBottom: "4px" }}>
              Default Category
            </label>
            <select
              id="qr-cat"
              value={form.defaultCategory}
              onChange={(e) => setForm((p) => ({ ...p, defaultCategory: e.target.value }))}
              style={{ width: "100%", minHeight: "42px", padding: "0 10px", borderRadius: "8px" }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="av-btn av-btn--primary" disabled={creating}>
          <i className="bx bx-qr" aria-hidden="true" />
          {creating ? "Generating Spot..." : "Generate Campus QR Spot"}
        </button>
      </form>

      {/* ── Active QR Spots Grid ── */}
      {loading ? (
        <p style={{ color: "var(--av-ink-muted)" }}>Loading campus QR spots...</p>
      ) : spots.length === 0 ? (
        <div className="av-surface" style={{ textAlign: "center", padding: "36px" }}>
          <p style={{ color: "var(--av-ink-muted)" }}>
            No QR spots created yet. Register a spot above or load the smart campus demo dataset from Admin Dashboard.
          </p>
        </div>
      ) : (
        <div className="av-qr-grid">
          {spots.map((spot) => {
            const reportUrl = `${origin}/report?spot=${encodeURIComponent(spot.spotCode)}`;
            return (
              <article key={spot.id} className="av-qr-card">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <div>
                    <div className="av-mono" style={{ fontSize: "0.78rem", color: "var(--av-primary)", fontWeight: 700 }}>
                      {displaySpotCode(spot.spotCode)}
                    </div>
                    <h3 style={{ fontSize: "0.98rem", marginTop: "2px" }}>{spot.label}</h3>
                  </div>
                  <span className={`av-status ${spot.isActive ? "av-status--ok" : "av-status--warn"}`}>
                    <span className="av-status__dot" />
                    {spot.isActive ? "Active" : "Paused"}
                  </span>
                </div>

                <div className="av-meta-line">
                  <span>{spot.building}</span>
                  <span className="av-meta-sep">·</span>
                  <span>{spot.floor}</span>
                  <span className="av-meta-sep">·</span>
                  <span>{spot.defaultCategory.toUpperCase()}</span>
                </div>

                <div className="av-qr-preview">
                  <QrSpotImage url={reportUrl} size={140} />
                </div>

                <div className="av-meta-line av-mono" style={{ justifyContent: "space-between" }}>
                  <span>{spot.scanCount} scans</span>
                  <span>{spot.complaintCount} filed</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <button
                    type="button"
                    className="av-btn av-btn--primary av-btn--compact"
                    style={{ flex: 1 }}
                    onClick={() => setPosterSpot({ ...spot, reportUrl })}
                  >
                    <i className="bx bx-printer" aria-hidden="true" />
                    Poster
                  </button>
                  <button
                    type="button"
                    className="av-btn av-btn--secondary av-btn--compact"
                    onClick={() => copySpotLink(spot.spotCode)}
                    aria-label={`Copy link for ${spot.spotCode}`}
                  >
                    <i className="bx bx-link" aria-hidden="true" />
                    Link
                  </button>
                  <button
                    type="button"
                    className="av-btn av-btn--ghost av-btn--compact"
                    onClick={() => handleToggleActive(spot)}
                    aria-label={spot.isActive ? `Pause ${spot.spotCode}` : `Activate ${spot.spotCode}`}
                  >
                    {spot.isActive ? "Pause" : "Enable"}
                  </button>
                  <button
                    type="button"
                    className="av-btn av-btn--danger av-btn--compact"
                    onClick={() => handleDelete(spot)}
                    aria-label={`Delete ${spot.spotCode}`}
                  >
                    <i className="bx bx-trash" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Printable A5 Poster Modal ── */}
      {posterSpot && (
        <div
          className="av-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="poster-modal-title"
          onClick={() => setPosterSpot(null)}
        >
          <div className="av-modal-card" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="av-modal-head">
              <h3 id="poster-modal-title">Printable Campus QR Poster</h3>
              <button
                type="button"
                className="av-icon-btn"
                onClick={() => setPosterSpot(null)}
                aria-label="Close poster preview"
              >
                <i className="bx bx-x" />
              </button>
            </div>

            <div className="av-poster-sheet">
              <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", color: "#EA580C" }}>
                {branding.blindEvaluationMode
                  ? "SMART CAMPUS GOVERNANCE · COMPLAINTSYNC"
                  : `${(branding.institutionName || "Smart Campus").toUpperCase()} · COMPLAINTSYNC`}
              </div>
              <h2>Spot an Issue Here? Scan &amp; Report in 20s</h2>
              <p>Supports English, मराठी &amp; हिन्दी Voice Reporting · Auto-Tracked SLA</p>

              <div style={{ margin: "18px auto", display: "inline-block" }}>
                <QrSpotImage url={posterSpot.reportUrl} size={210} />
              </div>

              <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0F172A" }}>
                {posterSpot.label}
              </div>
              <p style={{ marginTop: "4px" }}>
                {posterSpot.building} · {posterSpot.floor} · Code: <strong>{displaySpotCode(posterSpot.spotCode)}</strong>
              </p>
            </div>

            <div className="av-modal-actions">
              <button
                type="button"
                className="av-btn av-btn--ghost"
                onClick={() => copySpotLink(posterSpot.spotCode)}
              >
                Copy Deep Link
              </button>
              <button
                type="button"
                className="av-btn av-btn--primary"
                onClick={() => window.print()}
              >
                <i className="bx bx-printer" aria-hidden="true" />
                Print A5 Poster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
