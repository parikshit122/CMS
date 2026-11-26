import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  fetchItemClaims,
  reviewLostFoundClaim,
  confirmLostFoundHandover,
} from "../../services/lostFoundService";
import {
  buildContactLinks,
  buildPickupReminderMessage,
  buildOwnerToFinderMessage,
} from "../../utils/contactLinks";
import { useToast } from "../common/Alert";

const MATCH_LABELS = {
  high: { label: "High Match", cls: "lf-match--high", icon: "bx-check-shield" },
  partial: { label: "Partial Match", cls: "lf-match--partial", icon: "bx-info-circle" },
  low: { label: "Low Match", cls: "lf-match--low", icon: "bx-error" },
};

const CLAIM_STATUS_LABELS = {
  pending: { label: "Pending Review", cls: "lf-status--pending" },
  approved: { label: "Approved — Awaiting Pickup", cls: "lf-status--approved" },
  rejected: { label: "Rejected", cls: "lf-status--rejected" },
  fraud_flagged: { label: "Flagged False Appeal", cls: "lf-status--fraud" },
  completed: { label: "Handover Completed", cls: "lf-status--returned" },
};

export default function ReviewClaimsModal({ open, item, onClose, onUpdated }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [notesByClaim, setNotesByClaim] = useState({});
  const [busyClaimId, setBusyClaimId] = useState(null);
  const [handoverCode, setHandoverCode] = useState("");
  const [handoverBusy, setHandoverBusy] = useState(false);
  const [error, setError] = useState("");

  const loadClaims = useCallback(async () => {
    if (!item?.id) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetchItemClaims(item.id);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load claims.");
    } finally {
      setLoading(false);
    }
  }, [item?.id]);

  useEffect(() => {
    if (open && item?.id) {
      setHandoverCode("");
      loadClaims();
    }
  }, [open, item?.id, loadClaims]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const canReview = Boolean(data?.canReview || item.canReview);

  const handleReview = async (claimId, decision) => {
    const note = (notesByClaim[claimId] || "").trim();
    if ((decision === "reject" || decision === "flag_fraud") && note.length < 6) {
      toast.warning(
        "Please enter a brief reason (at least 6 characters) before rejecting or flagging."
      );
      return;
    }

    try {
      setBusyClaimId(claimId);
      const res = await reviewLostFoundClaim(claimId, {
        decision,
        reviewNote: note,
      });
      if (decision === "approve") {
        toast.success(res.message, { title: "Claim Approved", duration: 5000 });
      } else if (decision === "flag_fraud") {
        toast.warning(res.message, { title: "Fraud Strike Logged", duration: 5000 });
      } else {
        toast.info(res.message, { title: "Claim Rejected", duration: 3500 });
      }
      await loadClaims();
      onUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not process review decision.");
    } finally {
      setBusyClaimId(null);
    }
  };

  const handleHandover = async (e) => {
    e.preventDefault();
    if (!handoverCode.trim()) return;
    try {
      setHandoverBusy(true);
      const res = await confirmLostFoundHandover(item.id, handoverCode.trim());
      toast.success(res.message, { title: "Handover Verified", duration: 4500 });
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Pickup code did not match. Please double-check."
      );
    } finally {
      setHandoverBusy(false);
    }
  };

  const copyPickupCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Pickup code copied to clipboard.", { duration: 2200 });
    } catch {
      toast.info(`Show this pickup code in person: ${code}`);
    }
  };

  return createPortal(
    <div
      className="lf-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={canReview ? "Review Ownership Claims" : "My Ownership Appeals"}
    >
      <div className="lf-modal lf-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="lf-modal-header">
          <div>
            <h2>{canReview ? "Ownership Verification Console" : "My Claim Appeals"}</h2>
            <p>
              {item.itemCode} · {item.title} · Found at {item.foundLocation}
            </p>
          </div>
          <button
            type="button"
            className="lf-icon-btn"
            onClick={onClose}
            aria-label="Close review console"
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </div>

        <div className="lf-modal-body">
          {error && (
            <div className="lf-alert lf-alert--error" role="alert">
              <i className="bx bx-error-circle" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          {/* Approved Claimant's Private Handover Code Banner */}
          {item.myApprovedClaim && item.handoverCode && item.status === "approved" && (() => {
            const finderLinks = buildContactLinks(
              item.contactPhone || item.finder?.phone,
              buildOwnerToFinderMessage({
                finderName: item.finder?.name,
                itemTitle: item.title,
                itemCode: item.itemCode,
                handoverCode: item.handoverCode,
              })
            );
            return (
              <div className="lf-handover-ticket">
                <div>
                  <span className="lf-ticket-kicker">Ownership Verified — Show at Pickup</span>
                  <div className="lf-ticket-code-row">
                    <code className="lf-ticket-code">{item.handoverCode}</code>
                    <button
                      type="button"
                      className="lf-btn lf-btn--ghost lf-btn--sm"
                      onClick={() => copyPickupCode(item.handoverCode)}
                    >
                      <i className="bx bx-copy" aria-hidden="true" />
                      <span>Copy Code</span>
                    </button>
                  </div>
                  <p>
                    Present this code in person to{" "}
                    <strong>{item.finder?.name || "the finder"}</strong>
                    {item.finder?.email ? ` (${item.finder.email})` : ""} to complete verified handover.
                  </p>
                  {finderLinks && (
                    <div className="lf-contact-bar" role="group" aria-label="Contact finder for pickup">
                      <span className="lf-contact-bar__num">
                        <i className="bx bx-phone" aria-hidden="true" />
                        <span>{finderLinks.displayPhone}</span>
                      </span>
                      <div className="lf-contact-bar__btns">
                        <a
                          href={finderLinks.telHref}
                          className="lf-btn lf-btn--call lf-btn--sm"
                        >
                          <i className="bx bx-phone-call" aria-hidden="true" />
                          <span>Call Finder</span>
                        </a>
                        <a
                          href={finderLinks.whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lf-btn lf-btn--whatsapp lf-btn--sm"
                        >
                          <i className="bx bxl-whatsapp" aria-hidden="true" />
                          <span>Contact on WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Private Finder Reference Box (Only Reviewers Ever See This) */}
          {canReview && data && (
            <div className="lf-secret-ref">
              <div className="lf-secret-ref__row">
                <div>
                  <span className="lf-secret-ref__label">Hidden Question</span>
                  <p>{item.verificationQuestion}</p>
                </div>
                <div>
                  <span className="lf-secret-ref__label">Expected Secret Answer (Private)</span>
                  <p className="lf-secret-ref__answer">{data.expectedAnswer}</p>
                </div>
              </div>
              {data.privateNotes && (
                <div className="lf-secret-ref__notes">
                  <span className="lf-secret-ref__label">Private Finder Notes</span>
                  <p>{data.privateNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Two-Factor Handover Verification Form for Finder / Admin */}
          {canReview && item.status === "approved" && (() => {
            const approvedClaim = (data?.claims || []).find((c) => c.status === "approved");
            const ownerPhone = approvedClaim?.claimantPhone || approvedClaim?.claimant?.phone;
            const pickupPlace = item.custodyLocation || item.foundLocation;
            const ownerLinks = buildContactLinks(
              ownerPhone,
              buildPickupReminderMessage({
                recipientName: approvedClaim?.claimant?.name,
                itemTitle: item.title,
                itemCode: item.itemCode,
                pickupPlace,
                status: "approved",
              })
            );
            return (
              <div className="lf-handover-stack">
                <form className="lf-handover-form" onSubmit={handleHandover}>
                  <div className="lf-handover-form__copy">
                    <h3>Confirm Physical Handover</h3>
                    <p>
                      Ask the verified owner for their 6-character Pickup Code when meeting in person. Never hand over the item without verifying the code.
                    </p>
                  </div>
                  <div className="lf-handover-form__controls">
                    <input
                      type="text"
                      value={handoverCode}
                      onChange={(e) => setHandoverCode(e.target.value.toUpperCase())}
                      placeholder="LF-XXXXXX"
                      aria-label="Enter 6-character handover pickup code"
                      maxLength={12}
                      required
                    />
                    <button
                      type="submit"
                      className="lf-btn lf-btn--primary"
                      disabled={handoverBusy}
                    >
                      <i className={`bx ${handoverBusy ? "bx-loader-alt bx-spin" : "bx-check-double"}`} aria-hidden="true" />
                      <span>{handoverBusy ? "Verifying..." : "Confirm Handover"}</span>
                    </button>
                  </div>
                </form>

                {approvedClaim && (
                  <div className="lf-reminder-strip">
                    <div className="lf-reminder-strip__copy">
                      <strong>Owner hasn&apos;t picked up yet?</strong>
                      <span>
                        {ownerLinks
                          ? `Reach ${approvedClaim.claimant?.name || "the verified owner"} directly at ${ownerLinks.displayPhone} if they missed email alerts.`
                          : `${approvedClaim.claimant?.name || "The verified owner"} did not add a phone number — contact via ${approvedClaim.claimant?.email || "campus email"}.`}
                      </span>
                    </div>
                    <div className="lf-reminder-strip__actions">
                      {ownerLinks ? (
                        <>
                          <a
                            href={ownerLinks.telHref}
                            className="lf-btn lf-btn--call lf-btn--sm"
                          >
                            <i className="bx bx-phone-call" aria-hidden="true" />
                            <span>Call Owner</span>
                          </a>
                          <a
                            href={ownerLinks.whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="lf-btn lf-btn--whatsapp lf-btn--sm"
                          >
                            <i className="bx bxl-whatsapp" aria-hidden="true" />
                            <span>WhatsApp Reminder</span>
                          </a>
                        </>
                      ) : approvedClaim.claimant?.email ? (
                        <a
                          href={`mailto:${approvedClaim.claimant.email}?subject=${encodeURIComponent(`Pickup Reminder: ${item.title} (${item.itemCode})`)}`}
                          className="lf-btn lf-btn--ghost lf-btn--sm"
                        >
                          <i className="bx bx-envelope" aria-hidden="true" />
                          <span>Email Reminder</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Claims List */}
          {loading ? (
            <div className="lf-empty-inline">
              <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
              <span>Loading ownership appeals...</span>
            </div>
          ) : !data?.claims?.length ? (
            <div className="lf-empty-inline">
              <i className="bx bx-inbox" aria-hidden="true" />
              <span>No ownership appeals submitted for this item yet.</span>
            </div>
          ) : (
            <div className="lf-claims-list">
              {data.claims.map((claim) => {
                const matchMeta = MATCH_LABELS[claim.answerMatchLevel] || MATCH_LABELS.low;
                const statusMeta =
                  CLAIM_STATUS_LABELS[claim.status] || CLAIM_STATUS_LABELS.pending;
                const isBusy = busyClaimId === claim.id;

                const claimPhone = claim.claimantPhone || claim.claimant?.phone;
                const claimantLinks = canReview
                  ? buildContactLinks(
                      claimPhone,
                      buildPickupReminderMessage({
                        recipientName: claim.claimant?.name,
                        itemTitle: item.title,
                        itemCode: item.itemCode,
                        pickupPlace: item.custodyLocation || item.foundLocation,
                        status: claim.status,
                      })
                    )
                  : null;

                return (
                  <article key={claim.id} className="lf-claim-card">
                    <div className="lf-claim-card__top">
                      <div>
                        <div className="lf-claim-card__identity">
                          <strong>{claim.claimant?.name || "Campus User"}</strong>
                          <span aria-hidden="true">·</span>
                          <span>{claim.claimant?.email || ""}</span>
                          {claimPhone && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="lf-mono">{claimantLinks ? claimantLinks.displayPhone : claimPhone}</span>
                            </>
                          )}
                        </div>
                        <div className="lf-claim-card__sub">
                          <span>Attempt #{claim.attemptNumber}</span>
                          <span aria-hidden="true">·</span>
                          <span>{new Date(claim.createdAt).toLocaleString()}</span>
                          {canReview && claim.claimantFraudStrikes > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="lf-strike-warning">
                                {claim.claimantFraudStrikes} prior fraud strike
                                {claim.claimantFraudStrikes === 1 ? "" : "s"}
                              </span>
                            </>
                          )}
                        </div>
                        {claimantLinks && (
                          <div className="lf-claim-contact-row">
                            <a
                              href={claimantLinks.telHref}
                              className="lf-btn lf-btn--call lf-btn--xs"
                              aria-label={`Call ${claim.claimant?.name || "claimant"}`}
                            >
                              <i className="bx bx-phone-call" aria-hidden="true" />
                              <span>Call</span>
                            </a>
                            <a
                              href={claimantLinks.whatsappHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="lf-btn lf-btn--whatsapp lf-btn--xs"
                              aria-label={`WhatsApp ${claim.claimant?.name || "claimant"}`}
                            >
                              <i className="bx bxl-whatsapp" aria-hidden="true" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="lf-claim-card__signals">
                        {canReview && typeof claim.answerMatchScore === "number" && (
                          <span className={`lf-match-signal ${matchMeta.cls}`}>
                            <i className={`bx ${matchMeta.icon}`} aria-hidden="true" />
                            <span>
                              {matchMeta.label} ({claim.answerMatchScore}%)
                            </span>
                          </span>
                        )}
                        <span className={`lf-status-text ${statusMeta.cls}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>

                    <div className="lf-claim-card__body">
                      <div className="lf-claim-detail">
                        <span>Submitted Secret Answer</span>
                        <p className="lf-claim-answer">{claim.verificationAnswer}</p>
                      </div>
                      <div className="lf-claim-detail">
                        <span>Unique Identifying Proof</span>
                        <p>{claim.identifyingDetails}</p>
                      </div>
                      {claim.lostLocation && (
                        <div className="lf-claim-detail">
                          <span>Reported Loss Location / Time</span>
                          <p>{claim.lostLocation}</p>
                        </div>
                      )}
                      {claim.proofImageUrl && (
                        <div className="lf-claim-detail">
                          <span>Attached Proof</span>
                          <img
                            src={claim.proofImageUrl}
                            alt="Claimant proof"
                            className="lf-claim-proof-img"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      {claim.reviewNote && (
                        <div className="lf-claim-detail lf-claim-detail--note">
                          <span>
                            Reviewer Note
                            {claim.reviewer?.name ? ` (${claim.reviewer.name})` : ""}
                          </span>
                          <p>{claim.reviewNote}</p>
                        </div>
                      )}
                    </div>

                    {canReview && claim.status === "pending" && (
                      <div className="lf-claim-card__actions">
                        <input
                          type="text"
                          value={notesByClaim[claim.id] || ""}
                          onChange={(e) =>
                            setNotesByClaim((prev) => ({
                              ...prev,
                              [claim.id]: e.target.value,
                            }))
                          }
                          placeholder="Review note (required if rejecting or flagging as false appeal)..."
                          aria-label={`Review note for ${claim.claimant?.name || "claimant"}`}
                        />
                        <div className="lf-claim-card__btns">
                          <button
                            type="button"
                            className="lf-btn lf-btn--approve"
                            disabled={isBusy}
                            onClick={() => handleReview(claim.id, "approve")}
                          >
                            <i className="bx bx-check-circle" aria-hidden="true" />
                            <span>Approve &amp; Issue Code</span>
                          </button>
                          <button
                            type="button"
                            className="lf-btn lf-btn--ghost"
                            disabled={isBusy}
                            onClick={() => handleReview(claim.id, "reject")}
                          >
                            <i className="bx bx-x-circle" aria-hidden="true" />
                            <span>Reject</span>
                          </button>
                          <button
                            type="button"
                            className="lf-btn lf-btn--danger"
                            disabled={isBusy}
                            onClick={() => handleReview(claim.id, "flag_fraud")}
                            title="Reject, log a permanent fraud strike, and alert Campus Administration"
                          >
                            <i className="bx bx-shield-x" aria-hidden="true" />
                            <span>Flag False Appeal</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="lf-modal-footer">
          <button type="button" className="lf-btn lf-btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
