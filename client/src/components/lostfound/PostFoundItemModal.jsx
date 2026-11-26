import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LOST_FOUND_CATEGORIES,
  CUSTODY_OPTIONS,
  postFoundItem,
} from "../../services/lostFoundService";
import { useToast } from "../common/Alert";
import { useAuth } from "../../context/AuthContext";
import { normalizeContactPhone } from "../../utils/contactLinks";
import API from "../../services/api";

const initialForm = {
  title: "",
  category: "electronics",
  foundLocation: "",
  mapNodeId: "",
  foundAt: "",
  custodyType: "finder",
  custodyLocation: "",
  contactPhone: "",
  description: "",
  blurImagePublicly: true,
  verificationQuestion: "",
  verificationAnswerSecret: "",
  privateNotes: "",
};

export default function PostFoundItemModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [mapNodes, setMapNodes] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setForm({
      ...initialForm,
      foundAt: nowLocal,
      contactPhone: user?.phone || "",
    });
    setImageFile(null);
    setError("");

    let active = true;
    API.get("/public/campus-navigation")
      .then((res) => {
        if (!active || !res.data?.success) return;
        const floorsById = new Map(
          (res.data.data?.floors || []).map((f) => [Number(f.id), f.name])
        );
        const list = (res.data.data?.nodes || [])
          .filter((n) => n.nodeType !== "corridor")
          .map((n) => ({
            id: n.id,
            label: n.label,
            floorName: floorsById.get(Number(n.floorId)) || "Campus",
          }));
        setMapNodes(list);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [open, user?.phone]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  const secretLeakedInPublic = (() => {
    const secret = form.verificationAnswerSecret.trim().toLowerCase();
    if (secret.length < 4) return false;
    const pub = `${form.title} ${form.description}`.toLowerCase();
    return pub.includes(secret);
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.title.trim().length < 3) {
      setError("Please enter a clear item title (at least 3 characters).");
      return;
    }
    if (form.foundLocation.trim().length < 2) {
      setError("Please specify where in the college you found this item.");
      return;
    }
    if (form.description.trim().length < 10) {
      setError("Please provide a brief general description (at least 10 characters).");
      return;
    }
    if (form.verificationQuestion.trim().length < 8) {
      setError("Add a hidden ownership verification question (at least 8 characters).");
      return;
    }
    if (form.verificationAnswerSecret.trim().length < 2) {
      setError("Enter the expected secret answer so claims can be verified.");
      return;
    }
    if (secretLeakedInPublic) {
      setError(
        "Your secret answer appears in the public title or description. Remove it from public text so only the true owner knows it."
      );
      return;
    }

    const parsedPhone = normalizeContactPhone(form.contactPhone);
    if (!parsedPhone.valid) {
      setError(parsedPhone.reason || "Enter a valid 10-digit mobile or WhatsApp number.");
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("category", form.category);
      fd.append("foundLocation", form.foundLocation.trim());
      if (form.mapNodeId) fd.append("mapNodeId", String(form.mapNodeId));
      if (form.foundAt) fd.append("foundAt", new Date(form.foundAt).toISOString());
      fd.append("custodyType", form.custodyType);
      fd.append("custodyLocation", form.custodyLocation.trim());
      if (parsedPhone.normalized) {
        fd.append("contactPhone", parsedPhone.normalized);
      }
      fd.append("description", form.description.trim());
      fd.append("blurImagePublicly", String(form.blurImagePublicly));
      fd.append("verificationQuestion", form.verificationQuestion.trim());
      fd.append("verificationAnswerSecret", form.verificationAnswerSecret.trim());
      fd.append("privateNotes", form.privateNotes.trim());
      if (imageFile) {
        fd.append("image", imageFile);
      }

      const data = await postFoundItem(fd);
      const count = Number(data.notifiedCount || 0);
      toast.success(
        count > 0
          ? `Found item ${data.item?.itemCode || ""} posted — notified ${count} campus member${count === 1 ? "" : "s"}.`
          : `Found item ${data.item?.itemCode || ""} posted to Campus Lost & Found.`,
        { title: "Broadcast Sent", duration: 4500 }
      );
      onCreated?.(data.item);
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message || "Could not post found item. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="lf-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Post a Found Item"
    >
      <div className="lf-modal lf-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="lf-modal-header">
          <div>
            <h2>Post a Found Item</h2>
            <p>
              Everyone on campus will be notified automatically. Keep one secret detail private to prevent false claims.
            </p>
          </div>
          <button
            type="button"
            className="lf-icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </div>

        <form className="lf-modal-form" onSubmit={handleSubmit}>
          <div className="lf-modal-body">
          {error && (
            <div className="lf-alert lf-alert--error" role="alert">
              <i className="bx bx-error-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="lf-form-section">
            <h3 className="lf-section-heading">1. Public Campus Notice</h3>
            <div className="lf-grid-2">
              <label className="lf-field">
                <span>Item Title *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g., Wireless Earbuds Case or Scientific Calculator"
                  maxLength={120}
                  required
                />
              </label>

              <label className="lf-field">
                <span>Category *</span>
                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                >
                  {LOST_FOUND_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="lf-grid-2">
              <label className="lf-field">
                <span>Where Was It Found? *</span>
                <input
                  type="text"
                  value={form.foundLocation}
                  onChange={(e) => updateField("foundLocation", e.target.value)}
                  placeholder="e.g., Central Library 2nd Floor, Lab 304, Canteen"
                  maxLength={160}
                  required
                />
              </label>

              <label className="lf-field">
                <span>Date &amp; Time Found</span>
                <input
                  type="datetime-local"
                  value={form.foundAt}
                  onChange={(e) => updateField("foundAt", e.target.value)}
                />
              </label>
            </div>

            {mapNodes.length > 0 && (
              <label className="lf-field">
                <span>Pin on Campus Map (Optional — Enables Turn-by-Turn Pickup Routing)</span>
                <select
                  value={form.mapNodeId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    updateField("mapNodeId", nextId);
                    if (nextId && !form.foundLocation.trim()) {
                      const picked = mapNodes.find((n) => String(n.id) === String(nextId));
                      if (picked) {
                        updateField("foundLocation", `${picked.label} (${picked.floorName})`);
                      }
                    }
                  }}
                >
                  <option value="">No map pin selected</option>
                  {mapNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.label} — {n.floorName}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="lf-grid-2">
              <label className="lf-field">
                <span>Item Custody *</span>
                <select
                  value={form.custodyType}
                  onChange={(e) => updateField("custodyType", e.target.value)}
                >
                  {CUSTODY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="lf-field">
                <span>Handover Desk / Pickup Note (Optional)</span>
                <input
                  type="text"
                  value={form.custodyLocation}
                  onChange={(e) => updateField("custodyLocation", e.target.value)}
                  placeholder="e.g., Main Gate Security Room (9 AM – 5 PM)"
                  maxLength={180}
                />
              </label>
            </div>

            <label className="lf-field">
              <span>Phone / WhatsApp for Pickup Coordination (Optional)</span>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => updateField("contactPhone", e.target.value)}
                placeholder="e.g., 9876543210 or +91 98765 43210"
                maxLength={20}
              />
              <small className="lf-field-hint">
                Enables a one-tap &ldquo;Contact on WhatsApp&rdquo; &amp; Call button on the item details view for signed-in campus members.
              </small>
            </label>

            <label className="lf-field">
              <span>General Public Description *</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe the item generally (e.g., black matte case found near reading desk). Do NOT reveal unique stickers, serial numbers, or contents here."
                maxLength={1200}
                required
              />
            </label>

            <div className="lf-grid-2 lf-align-center">
              <label className="lf-field">
                <span>Optional Photo (Max 5 MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>

              <label className="lf-checkbox-card">
                <input
                  type="checkbox"
                  checked={form.blurImagePublicly}
                  onChange={(e) => updateField("blurImagePublicly", e.target.checked)}
                />
                <span>
                  <strong>Blur photo preview publicly</strong>
                  <small>Hides sensitive marks, ID details, or stickers from non-owners.</small>
                </span>
              </label>
            </div>
          </div>

          <div className="lf-form-section lf-form-section--secure">
            <div className="lf-secure-header">
              <i className="bx bx-shield-quarter" aria-hidden="true" />
              <div>
                <h3 className="lf-section-heading">2. Anti-Fraud Ownership Challenge (Private)</h3>
                <p>
                  Only the genuine owner can answer this question. Your expected answer is stored strictly on the server and never shown to claimants.
                </p>
              </div>
            </div>

            <label className="lf-field">
              <span>Ownership Verification Question (Shown to Claimants) *</span>
              <input
                type="text"
                value={form.verificationQuestion}
                onChange={(e) => updateField("verificationQuestion", e.target.value)}
                placeholder="e.g., What sticker is inside the lid, or what are the last 4 digits of the ID?"
                maxLength={220}
                required
              />
            </label>

            <label className="lf-field">
              <span>Expected Secret Answer (Private — Hidden from Public) *</span>
              <input
                type="text"
                value={form.verificationAnswerSecret}
                onChange={(e) => updateField("verificationAnswerSecret", e.target.value)}
                placeholder="e.g., Pikachu holographic sticker"
                maxLength={160}
                required
              />
              {secretLeakedInPublic && (
                <small className="lf-inline-warn">
                  This answer appears in your public title or description above. Remove it from the public text first.
                </small>
              )}
            </label>

            <label className="lf-field">
              <span>Private Finder Notes (Visible Only to You &amp; Campus Admin)</span>
              <textarea
                rows={2}
                value={form.privateNotes}
                onChange={(e) => updateField("privateNotes", e.target.value)}
                placeholder="Optional extra marks, exact desk/seat number, or contents to double-check during handover."
                maxLength={800}
              />
            </label>
          </div>

          </div>

          <div className="lf-modal-footer">
            <button
              type="button"
              className="lf-btn lf-btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="lf-btn lf-btn--primary"
              disabled={submitting || secretLeakedInPublic}
            >
              <i className={`bx ${submitting ? "bx-loader-alt bx-spin" : "bx-broadcast"}`} aria-hidden="true" />
              <span>{submitting ? "Broadcasting..." : "Post & Notify Campus"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
