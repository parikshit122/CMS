import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  getCustodyLabel,
  submitLostFoundClaim,
} from "../../services/lostFoundService";
import { useToast } from "../common/Alert";
import { useAuth } from "../../context/AuthContext";
import { normalizeContactPhone } from "../../utils/contactLinks";

export default function ClaimAppealModal({ open, item, onClose, onSubmitted }) {
  const toast = useToast();
  const { user } = useAuth();
  const [verificationAnswer, setVerificationAnswer] = useState("");
  const [identifyingDetails, setIdentifyingDetails] = useState("");
  const [lostLocation, setLostLocation] = useState("");
  const [claimantPhone, setClaimantPhone] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [honestyPledge, setHonestyPledge] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setVerificationAnswer("");
    setIdentifyingDetails("");
    setLostLocation("");
    setClaimantPhone(user?.phone || "");
    setProofFile(null);
    setHonestyPledge(false);
    setError("");
  }, [open, item?.id, user?.phone]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (verificationAnswer.trim().length < 2) {
      setError("Please answer the finder's hidden ownership question.");
      return;
    }
    if (identifyingDetails.trim().length < 20) {
      setError(
        "Please provide at least 20 characters of unique proof (scratches, serial number, contents, or purchase details)."
      );
      return;
    }
    if (!honestyPledge) {
      setError("You must accept the Campus Honesty Pledge before submitting.");
      return;
    }

    const parsedPhone = normalizeContactPhone(claimantPhone);
    if (!parsedPhone.valid) {
      setError(parsedPhone.reason || "Enter a valid 10-digit mobile or WhatsApp number.");
      return;
    }

    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("verificationAnswer", verificationAnswer.trim());
      fd.append("identifyingDetails", identifyingDetails.trim());
      fd.append("lostLocation", lostLocation.trim());
      if (parsedPhone.normalized) {
        fd.append("claimantPhone", parsedPhone.normalized);
      }
      fd.append("honestyPledgeAccepted", "true");
      if (proofFile) {
        fd.append("proofImage", proofFile);
      }

      const data = await submitLostFoundClaim(item.id, fd);
      toast.success(
        "Ownership appeal submitted! You will receive a Handover Pickup Code once verified.",
        { title: "Claim Submitted", duration: 4500 }
      );
      onSubmitted?.(data.claim);
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.message || "Could not submit ownership appeal.";
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
      aria-label="Verify Ownership and Claim Item"
    >
      <div className="lf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lf-modal-header">
          <div>
            <h2>Verify Ownership &amp; Claim</h2>
            <p>
              {item.itemCode} · {item.title} · Found near {item.foundLocation}
            </p>
          </div>
          <button
            type="button"
            className="lf-icon-btn"
            onClick={onClose}
            aria-label="Close claim dialog"
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </div>

        <form className="lf-modal-form" onSubmit={handleSubmit}>
          <div className="lf-modal-body">
          <div className="lf-claim-meta-bar">
            <span>
              <strong>Custody:</strong> {getCustodyLabel(item.custodyType)}
              {item.custodyLocation ? ` (${item.custodyLocation})` : ""}
            </span>
            <span className="lf-attempt-indicator">
              {item.myRemainingAttempts} of 2 attempts left
            </span>
          </div>

          {error && (
            <div className="lf-alert lf-alert--error" role="alert">
              <i className="bx bx-error-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div className="lf-question-box">
            <span className="lf-question-label">Finder&apos;s Ownership Question</span>
            <p className="lf-question-text">{item.verificationQuestion}</p>
          </div>

          <label className="lf-field">
            <span>Your Secret Answer *</span>
            <input
              type="text"
              value={verificationAnswer}
              onChange={(e) => setVerificationAnswer(e.target.value)}
              placeholder="Enter the exact detail only the real owner would know..."
              maxLength={260}
              required
            />
          </label>

          <label className="lf-field">
            <span>Additional Unique Proof (Min 20 characters) *</span>
            <textarea
              rows={3}
              value={identifyingDetails}
              onChange={(e) => setIdentifyingDetails(e.target.value)}
              placeholder="Describe unique marks, contents inside, model/serial number, wallpaper, or purchase proof..."
              maxLength={1500}
              required
            />
            <small className="lf-char-count">
              {identifyingDetails.trim().length}/20 minimum characters
            </small>
          </label>

          <div className="lf-grid-2">
            <label className="lf-field">
              <span>Where/When Did You Lose It? (Optional)</span>
              <input
                type="text"
                value={lostLocation}
                onChange={(e) => setLostLocation(e.target.value)}
                placeholder="e.g., Around 2:30 PM near Reading Room B"
                maxLength={160}
              />
            </label>

            <label className="lf-field">
              <span>Supporting Proof Photo (Optional)</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <label className="lf-field">
            <span>Phone / WhatsApp for Pickup Reminder (Optional)</span>
            <input
              type="tel"
              value={claimantPhone}
              onChange={(e) => setClaimantPhone(e.target.value)}
              placeholder="e.g., 9876543210 or +91 98765 43210"
              maxLength={20}
            />
            <small className="lf-field-hint">
              So the finder or campus desk can call or WhatsApp you directly if you miss email notifications or forget to collect your item.
            </small>
          </label>

          <label className="lf-pledge-box">
            <input
              type="checkbox"
              checked={honestyPledge}
              onChange={(e) => setHonestyPledge(e.target.checked)}
              required
            />
            <span>
              <strong>Campus Honesty &amp; Anti-Fraud Pledge:</strong> I confirm this item genuinely belongs to me. My verified college identity will be shared with the reviewer, and false/fraudulent appeals are permanently logged and escalated to Campus Administration (2 flagged false appeals restrict Lost &amp; Found claim access).
            </span>
          </label>

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
              disabled={submitting}
            >
              <i className={`bx ${submitting ? "bx-loader-alt bx-spin" : "bx-shield-alt-2"}`} aria-hidden="true" />
              <span>{submitting ? "Submitting..." : "Submit Verified Appeal"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
