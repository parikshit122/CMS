import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  LOST_FOUND_CATEGORIES,
  getCategoryMeta,
  getCustodyLabel,
  fetchLostFoundItems,
  archiveLostFoundItem,
} from "../services/lostFoundService";
import { onSocketEvent } from "../services/socketService";
import { useToast } from "../components/common/Alert";
import PostFoundItemModal from "../components/lostfound/PostFoundItemModal";
import ClaimAppealModal from "../components/lostfound/ClaimAppealModal";
import ReviewClaimsModal from "../components/lostfound/ReviewClaimsModal";
import "../styles/LostFound.css";

const ITEM_STATUS_META = {
  open: { label: "Open for Claims", icon: "bx-radio-circle-marked", cls: "lf-status--open" },
  claim_pending: { label: "Under Verification", icon: "bx-time-five", cls: "lf-status--pending" },
  approved: { label: "Owner Verified — Pickup Pending", icon: "bx-key", cls: "lf-status--approved" },
  returned: { label: "Returned & Verified", icon: "bx-check-circle", cls: "lf-status--returned" },
};

const formatRelativeTime = (dateVal) => {
  if (!dateVal) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateVal).getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateVal).toLocaleDateString();
};

export default function LostFound() {
  const { user } = useAuth();
  const toast = useToast();
  const role = String(user?.role || "user").toLowerCase();

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalActive: 0,
    openCount: 0,
    pendingClaimsItems: 0,
    returnedCount: 0,
    pendingClaimsTotal: 0,
    myFraudStrikes: 0,
    flaggedFraudTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [postOpen, setPostOpen] = useState(false);
  const [claimItemId, setClaimItemId] = useState(null);
  const [reviewItemId, setReviewItemId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  const claimItem = items.find((it) => it.id === claimItemId) || null;
  const reviewItem = items.find((it) => it.id === reviewItemId) || null;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchLostFoundItems({
        scope,
        category,
        status,
        search: search.trim(),
      });
      setItems(data.items || []);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Could not load Campus Lost & Found items."
      );
    } finally {
      setLoading(false);
    }
  }, [scope, category, status, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 140);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Refresh automatically when a new Lost & Found notification arrives via socket
  useEffect(() => {
    const off = onSocketEvent("new_notification", (payload) => {
      if (String(payload?.type || "").startsWith("lost_found_")) {
        loadData();
      }
    });
    return () => off();
  }, [loadData]);

  const handleArchive = async (item) => {
    try {
      setArchivingId(item.id);
      await archiveLostFoundItem(item.id);
      toast.info(`${item.itemCode} archived from active listings.`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not archive listing.");
    } finally {
      setArchivingId(null);
    }
  };

  const scopeTabs = [
    { id: "all", label: "All Campus" },
    { id: "my_posts", label: "My Found Posts" },
    { id: "my_claims", label: "My Claims" },
    ...(role === "admin" ? [{ id: "flagged", label: "Fraud Flags" }] : []),
  ];

  const isRestrictedByStrikes = summary.myFraudStrikes >= 2;

  return (
    <section className="lf-page">
      {/* Editorial Header */}
      <header className="lf-header">
        <div className="lf-header__copy">
          <h1>Campus Lost &amp; Found</h1>
          <p>
            Post items found anywhere on campus to notify every student and staff member instantly. Ownership is protected by private verification questions, claim attempt caps, and 6-character physical handover codes.
          </p>
        </div>

        <div className="lf-header__actions">
          <button
            type="button"
            className="lf-btn lf-btn--primary"
            onClick={() => setPostOpen(true)}
          >
            <i className="bx bx-plus-circle" aria-hidden="true" />
            <span>Post Found Item</span>
          </button>
        </div>
      </header>

      {/* Account Fraud Restriction Banner (only shown if user has strikes) */}
      {summary.myFraudStrikes > 0 && (
        <div
          className={`lf-alert ${isRestrictedByStrikes ? "lf-alert--error" : "lf-alert--warn"}`}
          role="status"
        >
          <i className="bx bx-shield-x" aria-hidden="true" />
          <span>
            {isRestrictedByStrikes
              ? `Claim privileges restricted: Your account has ${summary.myFraudStrikes} flagged false appeals. Contact Campus Administration for review.`
              : `Account notice: You have ${summary.myFraudStrikes} of 2 fraud strike(s) recorded. Submitting another false appeal will restrict claim access.`}
          </span>
        </div>
      )}

      {/* 4-Column Summary Strip (Single Elevation, Tabular Figures) */}
      <div className="lf-kpi-strip" role="region" aria-label="Lost and Found summary">
        <div className="lf-kpi">
          <span className="lf-kpi__label">Active Found Items</span>
          <strong className="lf-kpi__value">{summary.totalActive}</strong>
          <span className="lf-kpi__sub">{summary.openCount} open for claims</span>
        </div>
        <div className="lf-kpi">
          <span className="lf-kpi__label">Under Verification</span>
          <strong className="lf-kpi__value">{summary.pendingClaimsTotal}</strong>
          <span className="lf-kpi__sub">Pending ownership appeals</span>
        </div>
        <div className="lf-kpi">
          <span className="lf-kpi__label">Verified Returns</span>
          <strong className="lf-kpi__value">{summary.returnedCount}</strong>
          <span className="lf-kpi__sub">Confirmed via pickup code</span>
        </div>
        <div className="lf-kpi">
          <span className="lf-kpi__label">
            {role === "admin" ? "Flagged False Appeals" : "Anti-Fraud Standing"}
          </span>
          <strong className="lf-kpi__value">
            {role === "admin" ? summary.flaggedFraudTotal : `${summary.myFraudStrikes}/2`}
          </strong>
          <span className="lf-kpi__sub">
            {role === "admin"
              ? "Escalated for admin review"
              : summary.myFraudStrikes === 0
                ? "Good standing · Verified ID"
                : "Fraud strikes on record"}
          </span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="lf-toolbar">
        <div className="lf-tabs" role="tablist" aria-label="Lost and Found views">
          {scopeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={scope === tab.id}
              className={`lf-tab ${scope === tab.id ? "lf-tab--active" : ""}`}
              onClick={() => setScope(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="lf-filters">
          <div className="lf-search">
            <i className="bx bx-search" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search item, location, or LF code..."
              aria-label="Search found items"
            />
          </div>

          <select
            className="lf-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {LOST_FOUND_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            className="lf-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open for Claims</option>
            <option value="claim_pending">Under Verification</option>
            <option value="approved">Pickup Pending</option>
            <option value="returned">Returned</option>
          </select>
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="lf-grid" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="lf-card lf-card--skeleton" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="lf-empty">
          <i className="bx bx-search-alt" aria-hidden="true" />
          <h3>No found items match this view</h3>
          <p>
            {scope === "my_posts"
              ? "Items you find and report on campus will appear here so you can verify claims and confirm handovers."
              : scope === "my_claims"
                ? "When you submit an ownership appeal for a found item, you can track its verification status and pickup code here."
                : "Found a lost ID card, earbuds, notebook, or wallet on campus? Post it to alert everyone immediately."}
          </p>
          <button
            type="button"
            className="lf-btn lf-btn--primary"
            onClick={() => setPostOpen(true)}
          >
            <i className="bx bx-plus-circle" aria-hidden="true" />
            <span>Post Found Item</span>
          </button>
        </div>
      ) : (
        <div className="lf-grid">
          {items.map((item) => {
            const catMeta = getCategoryMeta(item.category);
            const statusMeta = ITEM_STATUS_META[item.status] || ITEM_STATUS_META.open;
            const shouldMaskPhoto =
              Boolean(item.imageUrl) &&
              item.blurImagePublicly &&
              !item.canReview &&
              !item.myApprovedClaim &&
              item.status !== "returned";

            const canClaim =
              !item.isFinder &&
              (item.status === "open" || item.status === "claim_pending") &&
              !item.myPendingClaim &&
              item.myRemainingAttempts > 0 &&
              !isRestrictedByStrikes;

            return (
              <article key={item.id} className="lf-card">
                {/* Media Preview (Optional photo or clean icon surface) */}
                <div className="lf-card__media">
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
                          <span>Protected Preview · Unlocks After Verification</span>
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

                {/* Card Body */}
                <div className="lf-card__body">
                  <div className="lf-card__meta">
                    <span className="lf-mono">{item.itemCode}</span>
                    <span aria-hidden="true">·</span>
                    <span>{catMeta.label}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>

                  <h2 className="lf-card__title">{item.title}</h2>
                  <p className="lf-card__desc">{item.description}</p>

                  <dl className="lf-card__facts">
                    <div>
                      <dt>Found At</dt>
                      <dd>{item.foundLocation}</dd>
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

                  {/* Approved Claimant's Live Handover Pickup Code */}
                  {item.myApprovedClaim && item.handoverCode && item.status === "approved" && (
                    <div className="lf-inline-ticket">
                      <span>Your Pickup Code</span>
                      <code>{item.handoverCode}</code>
                    </div>
                  )}

                  {/* Status + Verification Challenge Hint */}
                  <div className="lf-card__status-row">
                    <span className={`lf-status-text ${statusMeta.cls}`}>
                      <i className={`bx ${statusMeta.icon}`} aria-hidden="true" />
                      <span>{statusMeta.label}</span>
                    </span>
                    {item.pendingClaimsCount > 0 && item.canReview && (
                      <span className="lf-pending-count">
                        {item.pendingClaimsCount} appeal{item.pendingClaimsCount === 1 ? "" : "s"} waiting
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="lf-card__footer">
                  {item.canReview ? (
                    <>
                      <button
                        type="button"
                        className="lf-btn lf-btn--primary lf-btn--sm"
                        onClick={() => setReviewItemId(item.id)}
                      >
                        <i
                          className={`bx ${item.status === "approved" ? "bx-key" : "bx-shield-quarter"}`}
                          aria-hidden="true"
                        />
                        <span>
                          {item.status === "approved"
                            ? "Confirm Handover"
                            : `Review Claims (${item.totalClaimsCount})`}
                        </span>
                      </button>

                      {(item.isFinder || role === "admin") && item.status !== "returned" && (
                        <button
                          type="button"
                          className="lf-btn lf-btn--ghost lf-btn--sm"
                          disabled={archivingId === item.id}
                          onClick={() => handleArchive(item)}
                          aria-label={`Archive ${item.title}`}
                        >
                          <i className="bx bx-archive-in" aria-hidden="true" />
                          <span>Archive</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {canClaim ? (
                        <button
                          type="button"
                          className="lf-btn lf-btn--primary lf-btn--sm"
                          onClick={() => setClaimItemId(item.id)}
                        >
                          <i className="bx bx-shield-alt-2" aria-hidden="true" />
                          <span>Verify &amp; Claim</span>
                        </button>
                      ) : item.myApprovedClaim && item.status === "approved" ? (
                        <button
                          type="button"
                          className="lf-btn lf-btn--primary lf-btn--sm"
                          onClick={() => setReviewItemId(item.id)}
                        >
                          <i className="bx bx-key" aria-hidden="true" />
                          <span>View Pickup Code</span>
                        </button>
                      ) : item.myPendingClaim ? (
                        <span className="lf-muted-note">Appeal under review</span>
                      ) : item.status === "returned" ? (
                        <span className="lf-muted-note">Returned to verified owner</span>
                      ) : item.myRemainingAttempts === 0 ? (
                        <span className="lf-muted-note lf-muted-note--warn">
                          Max attempts used (2/2)
                        </span>
                      ) : isRestrictedByStrikes ? (
                        <span className="lf-muted-note lf-muted-note--warn">
                          Claim access restricted
                        </span>
                      ) : (
                        <span className="lf-muted-note">Handover in progress</span>
                      )}

                      {item.myClaimsCount > 0 && !item.myApprovedClaim && (
                        <button
                          type="button"
                          className="lf-btn lf-btn--ghost lf-btn--sm"
                          onClick={() => setReviewItemId(item.id)}
                        >
                          <span>My Appeals ({item.myClaimsCount})</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <PostFoundItemModal
        open={postOpen}
        onClose={() => setPostOpen(false)}
        onCreated={() => loadData()}
      />

      <ClaimAppealModal
        open={Boolean(claimItem)}
        item={claimItem}
        onClose={() => setClaimItemId(null)}
        onSubmitted={() => loadData()}
      />

      <ReviewClaimsModal
        open={Boolean(reviewItem)}
        item={reviewItem}
        onClose={() => setReviewItemId(null)}
        onUpdated={() => loadData()}
      />
    </section>
  );
}
