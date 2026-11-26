import { useEffect, useRef, useState } from "react";
import API from "../../services/api";
import { useToast } from "../common/Alert";
import { ACCESS_TIER_META, CAMPUS_ACCESS_TIERS } from "../../utils/campusPathfinder";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

export default function BlueprintManagerPanel({
  activeFloor,
  buildings = [],
  onPreviewUrlChange,
  onSaved,
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const newFloorFileRef = useRef(null);

  const [mode, setMode] = useState("replace"); // "replace" | "new"
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Active floor metadata & security policy form
  const [floorEdit, setFloorEdit] = useState({
    floorLabel: "",
    widthMeters: "60",
    heightMeters: "42",
    accessLevel: "public",
    isSensitive: false,
    restrictedNotice: "",
  });

  // New floor creation form
  const [newFloorForm, setNewFloorForm] = useState({
    buildingId: "",
    floorNumber: "1",
    floorLabel: "",
    widthMeters: "60",
    heightMeters: "42",
    isOutdoor: false,
    accessLevel: "public",
    restrictedNotice: "",
  });
  const [newFloorFile, setNewFloorFile] = useState(null);
  const [uploadingNew, setUploadingNew] = useState(false);

  // Sync active floor settings whenever selected floor changes
  useEffect(() => {
    if (!activeFloor) return;
    setFloorEdit({
      floorLabel: activeFloor.floorLabel || "",
      widthMeters: String(activeFloor.widthMeters || 60),
      heightMeters: String(activeFloor.heightMeters || 42),
      accessLevel: activeFloor.accessLevel || "public",
      isSensitive: Boolean(activeFloor.isSensitive || (activeFloor.accessLevel && activeFloor.accessLevel !== "public")),
      restrictedNotice: activeFloor.restrictedNotice || "",
    });
    setSelectedFile(null);
    setFileError("");
    setConfirmReset(false);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, [activeFloor]);

  useEffect(() => {
    if (buildings.length > 0 && !newFloorForm.buildingId) {
      setNewFloorForm((prev) => ({ ...prev, buildingId: String(buildings[0].id) }));
    }
  }, [buildings, newFloorForm.buildingId]);

  useEffect(() => {
    onPreviewUrlChange?.(previewUrl);
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, onPreviewUrlChange]);

  const validateClientFile = (file) => {
    if (!file) return null;
    const type = String(file.type || "").toLowerCase();
    const name = String(file.name || "").toLowerCase();
    if (type.includes("svg") || name.endsWith(".svg")) {
      return "SVG files are blocked for security. Please upload a PNG, JPG, or WebP architectural blueprint.";
    }
    if (!ALLOWED_MIME.includes(type)) {
      return "Unsupported format. Please choose a PNG, JPG, or WebP image file.";
    }
    if (file.size > MAX_BYTES) {
      return "Blueprint exceeds the 5 MB upload ceiling. Compress the image and retry.";
    }
    return null;
  };

  const handleFilePick = (file) => {
    if (!file) return;
    const err = validateClientFile(file);
    if (err) {
      setFileError(err);
      setSelectedFile(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      return;
    }
    setFileError("");
    setSelectedFile(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  };

  const handleSaveActiveFloor = async (e) => {
    e.preventDefault();
    if (!activeFloor) return;
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("floorLabel", floorEdit.floorLabel.trim() || activeFloor.floorLabel);
      fd.append("widthMeters", String(floorEdit.widthMeters || 60));
      fd.append("heightMeters", String(floorEdit.heightMeters || 42));
      fd.append("accessLevel", floorEdit.accessLevel);
      fd.append("isSensitive", String(floorEdit.isSensitive || floorEdit.accessLevel !== "public"));
      fd.append("restrictedNotice", floorEdit.restrictedNotice.trim());
      if (selectedFile) {
        fd.append("mapImage", selectedFile);
      }

      const res = await API.patch(`/campus/floors/${activeFloor.id}`, fd);
      if (res.data?.success) {
        toast.success(res.data.message);
        handleCancelPreview();
        await onSaved?.(activeFloor.id);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update floor blueprint.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetBlueprint = async () => {
    if (!activeFloor) return;
    try {
      setSaving(true);
      const res = await API.patch(`/campus/floors/${activeFloor.id}`, {
        resetBlueprint: true,
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setConfirmReset(false);
        handleCancelPreview();
        await onSaved?.(activeFloor.id);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to reset blueprint.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewFloor = async (e) => {
    e.preventDefault();
    if (!newFloorForm.floorLabel.trim()) {
      toast.error("Enter a floor or campus map title.");
      return;
    }
    if (!newFloorFile) {
      toast.error("Select a PNG, JPG, or WebP architectural blueprint image.");
      return;
    }
    const err = validateClientFile(newFloorFile);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      setUploadingNew(true);
      const fd = new FormData();
      fd.append("floorLabel", newFloorForm.floorLabel.trim());
      fd.append("floorNumber", String(newFloorForm.floorNumber));
      fd.append("widthMeters", String(newFloorForm.widthMeters || 60));
      fd.append("heightMeters", String(newFloorForm.heightMeters || 42));
      fd.append("isOutdoor", String(newFloorForm.isOutdoor));
      fd.append("accessLevel", newFloorForm.accessLevel);
      fd.append("isSensitive", String(newFloorForm.accessLevel !== "public"));
      fd.append("restrictedNotice", newFloorForm.restrictedNotice.trim());
      if (!newFloorForm.isOutdoor && newFloorForm.buildingId) {
        fd.append("buildingId", String(newFloorForm.buildingId));
      }
      fd.append("mapImage", newFloorFile);

      const res = await API.post("/campus/floors", fd);
      if (res.data?.success) {
        toast.success(res.data.message);
        setNewFloorForm((p) => ({ ...p, floorLabel: "", restrictedNotice: "", accessLevel: "public" }));
        setNewFloorFile(null);
        if (newFloorFileRef.current) newFloorFileRef.current.value = "";
        setMode("replace");
        await onSaved?.(res.data.data?.id);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Blueprint upload failed.");
    } finally {
      setUploadingNew(false);
    }
  };

  return (
    <div className="cn-panel">
      <div className="cn-panel__title" style={{ flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
        <span>Blueprint Media &amp; Floor Policy</span>
        <div
          className="cn-seg"
          style={{ padding: "3px", display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%" }}
        >
          <button
            type="button"
            className={`cn-seg__btn ${mode === "replace" ? "is-active" : ""}`}
            style={{ minHeight: "32px", padding: "4px 10px", fontSize: "0.75rem", justifyContent: "center", whiteSpace: "nowrap" }}
            onClick={() => setMode("replace")}
          >
            Active Floor
          </button>
          <button
            type="button"
            className={`cn-seg__btn ${mode === "new" ? "is-active" : ""}`}
            style={{ minHeight: "32px", padding: "4px 10px", fontSize: "0.75rem", justifyContent: "center", whiteSpace: "nowrap" }}
            onClick={() => setMode("new")}
          >
            + New Floor
          </button>
        </div>
      </div>

      {mode === "replace" && activeFloor ? (
        <form onSubmit={handleSaveActiveFloor}>
          <div style={{ fontSize: "0.78rem", color: "var(--av-ink-muted)", marginBottom: "10px" }}>
            Editing{" "}
            <strong style={{ color: "var(--av-ink)" }}>{activeFloor.floorLabel}</strong>
            {activeFloor.blueprintUpdatedAt && (
              <span className="av-mono" style={{ display: "block", fontSize: "0.71rem", marginTop: "2px" }}>
                Updated {new Date(activeFloor.blueprintUpdatedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          <div
            className={`cn-blueprint-dropzone ${selectedFile ? "has-file" : ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFilePick(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={fileInputRef}
              id="st-replace-blueprint"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              aria-label="Upload or replace blueprint image"
              className="cn-sr-file"
              onChange={(e) => handleFilePick(e.target.files?.[0])}
            />
            <label htmlFor="st-replace-blueprint" className="cn-blueprint-dropzone__label">
              <i className="bx bx-cloud-upload" aria-hidden="true" />
              <div>
                <strong>
                  {selectedFile ? selectedFile.name : "Upload or Replace Blueprint"}
                </strong>
                <span>
                  {selectedFile
                    ? `${Math.max(1, Math.round(selectedFile.size / 1024))} KB · Live pin overlay preview active`
                    : "Drop PNG, JPG, or WebP (max 5 MB) — preserves all pins"}
                </span>
              </div>
            </label>
            {selectedFile && (
              <button
                type="button"
                className="av-btn av-btn--ghost av-btn--compact"
                style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
                onClick={handleCancelPreview}
              >
                Cancel Preview
              </button>
            )}
          </div>

          {fileError && (
            <div className="cn-modal__error" role="alert" style={{ marginBottom: "10px" }}>
              <i className="bx bx-error-circle" aria-hidden="true" />
              <span>{fileError}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="cn-field">
              <label htmlFor="st-edit-w">Scale Width (m)</label>
              <input
                id="st-edit-w"
                type="number"
                min="10"
                max="2000"
                className="cn-input av-mono"
                value={floorEdit.widthMeters}
                onChange={(e) => setFloorEdit((p) => ({ ...p, widthMeters: e.target.value }))}
              />
            </div>
            <div className="cn-field">
              <label htmlFor="st-edit-h">Scale Height (m)</label>
              <input
                id="st-edit-h"
                type="number"
                min="10"
                max="2000"
                className="cn-input av-mono"
                value={floorEdit.heightMeters}
                onChange={(e) => setFloorEdit((p) => ({ ...p, heightMeters: e.target.value }))}
              />
            </div>
          </div>

          <div className="cn-field">
            <label htmlFor="st-floor-tier">Floor-Wide Clearance Policy</label>
            <select
              id="st-floor-tier"
              className="cn-select"
              value={floorEdit.accessLevel}
              onChange={(e) => {
                const nextTier = e.target.value;
                setFloorEdit((p) => ({
                  ...p,
                  accessLevel: nextTier,
                  isSensitive: nextTier !== "public",
                }));
              }}
            >
              {CAMPUS_ACCESS_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier === "public"
                    ? "Public — Open Access"
                    : `${ACCESS_TIER_META[tier].label} (${ACCESS_TIER_META[tier].shortLabel})`}
                </option>
              ))}
            </select>
          </div>

          {floorEdit.accessLevel !== "public" && (
            <div className="cn-field">
              <label htmlFor="st-floor-notice">Floor Restriction Notice</label>
              <input
                id="st-floor-notice"
                className="cn-input"
                placeholder="e.g., Authorized Staff Only — Exam & Records Wing"
                value={floorEdit.restrictedNotice}
                onChange={(e) => setFloorEdit((p) => ({ ...p, restrictedNotice: e.target.value }))}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            <button
              type="submit"
              disabled={saving}
              className="av-btn av-btn--primary av-btn--compact"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <i className="bx bx-save" aria-hidden="true" />
              {saving
                ? "Saving..."
                : selectedFile
                  ? "Replace Blueprint & Save Policy"
                  : "Save Floor Scale & Policy"}
            </button>

            {activeFloor.mapImageUrl && !confirmReset && (
              <button
                type="button"
                className="av-btn av-btn--ghost av-btn--compact"
                style={{ width: "100%", justifyContent: "center", color: "var(--av-ink-muted)" }}
                onClick={() => setConfirmReset(true)}
              >
                <i className="bx bx-reset" aria-hidden="true" />
                Reset to Default Grid
              </button>
            )}

            {confirmReset && (
              <div className="cn-inline-confirm" role="alert">
                <span>Clear custom blueprint image for this floor?</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    disabled={saving}
                    className="av-btn av-btn--primary av-btn--compact"
                    style={{ background: "#dc2626" }}
                    onClick={handleResetBlueprint}
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    className="av-btn av-btn--ghost av-btn--compact"
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleCreateNewFloor}>
          <div className="cn-field">
            <label htmlFor="st-fl-label">Floor / Map Title</label>
            <input
              id="st-fl-label"
              className="cn-input"
              placeholder="e.g., Block B — 1st Floor"
              value={newFloorForm.floorLabel}
              onChange={(e) => setNewFloorForm((p) => ({ ...p, floorLabel: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="cn-field">
              <label htmlFor="st-fl-bldg">Building</label>
              <select
                id="st-fl-bldg"
                className="cn-select"
                value={newFloorForm.buildingId}
                onChange={(e) => setNewFloorForm((p) => ({ ...p, buildingId: e.target.value }))}
                disabled={newFloorForm.isOutdoor}
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="cn-field">
              <label htmlFor="st-fl-num">Floor #</label>
              <input
                id="st-fl-num"
                type="number"
                className="cn-input av-mono"
                value={newFloorForm.floorNumber}
                onChange={(e) => setNewFloorForm((p) => ({ ...p, floorNumber: e.target.value }))}
                disabled={newFloorForm.isOutdoor}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div className="cn-field">
              <label htmlFor="st-fl-w">Width (m)</label>
              <input
                id="st-fl-w"
                type="number"
                min="10"
                className="cn-input av-mono"
                value={newFloorForm.widthMeters}
                onChange={(e) => setNewFloorForm((p) => ({ ...p, widthMeters: e.target.value }))}
              />
            </div>
            <div className="cn-field">
              <label htmlFor="st-fl-h">Height (m)</label>
              <input
                id="st-fl-h"
                type="number"
                min="10"
                className="cn-input av-mono"
                value={newFloorForm.heightMeters}
                onChange={(e) => setNewFloorForm((p) => ({ ...p, heightMeters: e.target.value }))}
              />
            </div>
          </div>
          <div className="cn-field">
            <label htmlFor="st-fl-tier">Default Floor Access Tier</label>
            <select
              id="st-fl-tier"
              className="cn-select"
              value={newFloorForm.accessLevel}
              onChange={(e) => setNewFloorForm((p) => ({ ...p, accessLevel: e.target.value }))}
            >
              {CAMPUS_ACCESS_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {ACCESS_TIER_META[tier].label}
                </option>
              ))}
            </select>
          </div>
          <div className="cn-field">
            <label htmlFor="st-fl-img">Blueprint Image (PNG / JPG / WebP, max 5 MB)</label>
            <input
              ref={newFloorFileRef}
              id="st-fl-img"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="cn-input"
              onChange={(e) => setNewFloorFile(e.target.files?.[0] || null)}
            />
          </div>
          <button
            type="submit"
            disabled={uploadingNew}
            className="av-btn av-btn--primary av-btn--compact"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <i className="bx bx-upload" aria-hidden="true" />
            {uploadingNew ? "Uploading..." : "Create Floor & Upload Blueprint"}
          </button>
        </form>
      )}
    </div>
  );
}
