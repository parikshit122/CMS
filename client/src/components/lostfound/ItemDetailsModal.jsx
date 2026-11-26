import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  getCategoryMeta,
  getCustodyLabel,
  getItemStatusMeta,
} from "../../services/lostFoundService";
import {
  buildContactLinks,
  buildFinderInquiryMessage,
} from "../../utils/contactLinks";

export default function ItemDetailsModal({
  open,
  item,
  canClaim,
  onClose,
  onOpenClaim,
  onOpenReview,
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  const catMeta = getCategoryMeta(item.category);
  const statusMeta = getItemStatusMeta(item.status);
  const shouldMaskPhoto =
    Boolean(item.imageUrl) &&
    item.blurImagePublicly &&
    !item.canReview &&
    !item.myApprovedClaim &&
    item.status !== "returned";

  const storedPhone = item.contactPhone || item.finder?.phone || "";
  const contactLinks = buildContactLinks(
    storedPhone,
    buildFinderInquiryMessage({
      finderName: item.finder?.name,
      itemTitle: item.title,
      itemCode: item.itemCode,
      foundLocation: item.foundLocation,
      handoverCode: item.myApprovedClaim ? item.handoverCode : undefined,
    })
  );

  return createPortal(
    <div
      className="lf-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Item details for ${item.title}`}
    >
      <div className="lf-modal lf-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="lf-modal-header">
          <div>
            <div className="lf-detail-kicker">
              <span className="lf-mono">{item.itemCode}</span>
              <span aria-hidden="true">·</span>
              <span>{catMeta.label}</span>
              <span
                className={`lf-status-badge ${statusMeta.badgeCls}`}
                aria-label={`Status: ${statusMeta.label}`}
              >
                <span className="lf-status-badge__dot" aria-hidden="true" />
                <i className={`bx ${statusMeta.icon}`} aria-hidden="true" />
                <span>{statusMeta.label}</span>
              </span>
            </div>
            <h2>{item.title}</h2>
          </div>
          <button
            type="button"
            className="lf-icon-btn"
            onClick={onClose}
            aria-label="Close item details"
          >
            <i className="bx bx-x" aria-hidden="true" />
          </button>
        </div>

        <div className="lf-modal-body">
          {/* Media Preview */}
          <div className="lf-detail-media">
            {item.imageUrl ? (
              <>
                <img
                  src={item.imageUrl}
                  alt={shouldMaskPhoto ? `Protected preview of ${item.title}` : item.title}
                  className={shouldMaskPhoto ? "lf-card__img lf-card__img--blurred" : "lf-card__img"}
                  referrerPolicy="no-referrer"
                />
                {shouldMaskPhoto && (
                  <div className="lf-card__blur-scrim">
                    <i className="bx bx-lock-alt" aria-hidden="true" />
                    <span>Protected Preview · Unlocks After Ownership Verification</span>
                  </div>
                )}
              </>
            ) : (
              <div className="lf-card__media-fallback">
                <i className={`bx ${catMeta.icon}`} aria-hidden="true" />
                <span>{catMeta.label}</span>
              </div>
            )}
          </div>

          {/* Full Description & Structured Facts */}
          <div className="lf-detail-section">
            <h3 className="lf-section-heading">Item Description</h3>
            <p className="lf-detail-desc">{item.description}</p>

            <dl className="lf-detail-facts">
              <div>
                <dt>Found Location</dt>
                <dd>{item.foundLocation}</dd>
              </div>
              <div>
                <dt>Date &amp; Time Found</dt>
                <dd>{item.foundAt ? new Date(item.foundAt).toLocaleString() : "—"}</dd>
              </div>
              <div>
                <dt>Custody</dt>
                <dd>
                  {getCustodyLabel(item.custodyType)}
                  {item.custodyLocation ? ` — ${item.custodyLocation}` : ""}
                </dd>
              </div>
              <div>
                <dt>Reported By</dt>
                <dd>{item.finder?.name || "Campus Member"}</dd>
              </div>
            </dl>
          </div>

          {/* Approved Claimant's Pickup Code */}
          {item.myApprovedClaim && item.handoverCode && item.status === "approved" && (
            <div className="lf-inline-ticket">
              <span>Your Verified Pickup Code</span>
              <code>{item.handoverCode}</code>
            </div>
          )}

          {/* Direct WhatsApp & Phone Contact Card (wa.me link — chat without saving contact) */}
          <div className="lf-detail-contact-card" role="region" aria-label="Direct contact options">
            <div className="lf-detail-contact-card__copy">
              <div className="lf-detail-contact-card__title">
                <i className="bx bxl-whatsapp" aria-hidden="true" />
                <h3>Quick Pickup Coordination</h3>
              </div>
              {contactLinks ? (
                <p>
                  Start a direct WhatsApp chat with{" "}
                  <strong>{item.finder?.name || "the finder"}</strong> ({contactLinks.displayPhone})
                  without saving their number to your contacts.
                </p>
              ) : (
                <p>
                  No phone number is stored for this listing yet. Submit a verified ownership claim to coordinate via campus notifications.
                </p>
              )}
            </div>

            {contactLinks && (
              <div className="lf-detail-contact-card__actions">
                <a
                  href={contactLinks.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lf-btn lf-btn--whatsapp"
                >
                  <i className="bx bxl-whatsapp" aria-hidden="true" />
                  <span>Contact on WhatsApp</span>
                </a>
                <a
                  href={contactLinks.telHref}
                  className="lf-btn lf-btn--call"
                >
                  <i className="bx bx-phone-call" aria-hidden="true" />
                  <span>Call</span>
                </a>
              </div>
            )}
          </div>

          {/* Ownership Verification Challenge Preview */}
          <div className="lf-question-box">
            <span className="lf-question-label">Ownership Verification Question</span>
            <p className="lf-question-text">{item.verificationQuestion}</p>
          </div>
        </div>

        <div className="lf-modal-footer lf-detail-footer">
          <div className="lf-detail-footer__left">
            {item.mapNodeId && (
              <button
                type="button"
                className="lf-btn lf-btn--ghost"
                onClick={() => {
                  onClose();
                  navigate(`/campus-map?node=${item.mapNodeId}`);
                }}
              >
                <i className="bx bx-map-pin" aria-hidden="true" />
                <span>Locate on Map</span>
              </button>
            )}
          </div>

          <div className="lf-detail-footer__right">
            <button type="button" className="lf-btn lf-btn--ghost" onClick={onClose}>
              Close
            </button>
            {item.canReview ? (
              <button
                type="button"
                className="lf-btn lf-btn--primary"
                onClick={() => {
                  onClose();
                  onOpenReview?.(item.id);
                }}
              >
                <i className={`bx ${item.status === "approved" ? "bx-key" : "bx-shield-quarter"}`} aria-hidden="true" />
                <span>
                  {item.status === "approved"
                    ? "Confirm Handover"
                    : `Review Claims (${item.totalClaimsCount})`}
                </span>
              </button>
            ) : canClaim ? (
              <button
                type="button"
                className="lf-btn lf-btn--primary"
                onClick={() => {
                  onClose();
                  onOpenClaim?.(item.id);
                }}
              >
                <i className="bx bx-shield-alt-2" aria-hidden="true" />
                <span>Verify &amp; Claim</span>
              </button>
            ) : item.myApprovedClaim && item.status === "approved" ? (
              <button
                type="button"
                className="lf-btn lf-btn--primary"
                onClick={() => {
                  onClose();
                  onOpenReview?.(item.id);
                }}
              >
                <i className="bx bx-key" aria-hidden="true" />
                <span>View Pickup Code</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
