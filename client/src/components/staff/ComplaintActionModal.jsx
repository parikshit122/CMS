import React, {
  useState, useEffect, useCallback, useRef,
} from "react";
import StatusBadge from "../complaint/StatusBadge";

/* ============================================================
   COMPLAINT ACTION MODAL
   - Shows complaint detail
   - Status update with confirmation step
   - Rejection reason required if rejected
   - Locked if already resolved/rejected
   ============================================================ */

const STATUS_OPTIONS = [
  {
    key:   "pending",
    label: "Pending",
    icon:  "bx bx-time-five",
    color: "#f59e0b",
    desc:  "Mark as waiting — no action taken yet",
  },
  {
    key:   "in-progress",
    label: "In Progress",
    icon:  "bx bx-loader-alt",
    color: "#3b82f6",
    desc:  "Mark as actively being worked on",
  },
  {
    key:   "resolved",
    label: "Resolved",
    icon:  "bx bx-check-circle",
    color: "#10b981",
    desc:  "Mark as fully resolved and closed",
  },
  {
    key:   "rejected",
    label: "Rejected",
    icon:  "bx bx-x-circle",
    color: "#ef4444",
    desc:  "Reject with a reason (required)",
  },
];

const LOCKED_STATUSES = ["resolved", "rejected"];

const ComplaintActionModal = ({
  complaint,
  onClose,
  onUpdateStatus,
  updateLoading = false,
  updateError   = null,
}) => {
  const [selectedStatus,   setSelectedStatus]   = useState("");
  const [rejectionReason,  setRejectionReason]  = useState("");
  const [confirmStep,      setConfirmStep]       = useState(false);
  const [reasonError,      setReasonError]       = useState("");

  const modalRef       = useRef(null);
  const firstFocusRef  = useRef(null);

  const isLocked = LOCKED_STATUSES.includes(complaint?.status);

  /* ── Focus trap + Escape key ── */
  useEffect(() => {
    firstFocusRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  /* ── Close on backdrop click ── */
  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  /* ── Validate & go to confirm step ── */
  const handleProceed = useCallback(() => {
    if (!selectedStatus) return;

    if (selectedStatus === "rejected") {
      if (!rejectionReason.trim()) {
        setReasonError("Please provide a reason for rejection.");
        return;
      }
      if (rejectionReason.trim().length < 10) {
        setReasonError("Reason must be at least 10 characters.");
        return;
      }
    }
    setReasonError("");
    setConfirmStep(true);
  }, [selectedStatus, rejectionReason]);

  /* ── Final submit ── */
  const handleConfirm = useCallback(() => {
    onUpdateStatus({
      complaintId:     complaint._id,
      status:          selectedStatus,
      rejectionReason: selectedStatus === "rejected" ? rejectionReason : undefined,
    });
  }, [onUpdateStatus, complaint._id, selectedStatus, rejectionReason]);

  if (!complaint) return null;

  return (
    <div
      className="ssd-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="ssd-modal" ref={modalRef}>

        {/* ── Header ── */}
        <div className="ssd-modal__header">
          <div>
            <span className="ssd-modal__eyebrow">
              #{complaint._id?.slice(-6).toUpperCase()}
            </span>
            <h2 className="ssd-modal__title" id="modal-title">
              {complaint.title}
            </h2>
          </div>
          <button
            className="ssd-modal__close"
            onClick={onClose}
            aria-label="Close modal"
            ref={firstFocusRef}
          >
            <i className="bx bx-x" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="ssd-modal__body">

          {/* Complaint Details */}
          <div className="ssd-modal__details">
            <DetailRow label="Category"  value={complaint.category}    />
            <DetailRow label="Priority"  value={complaint.priority}    priority />
            <DetailRow label="Location"  value={complaint.location}    />
            <DetailRow label="Submitted" value={
              complaint.createdAt
                ? new Date(complaint.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short", year: "numeric",
                  })
                : "—"
            } />
            <DetailRow label="Status" value={
              <StatusBadge status={complaint.status} />
            } />
          </div>

          {/* Description */}
          <div className="ssd-modal__desc-block">
            <span className="ssd-modal__desc-label">Description</span>
            <p className="ssd-modal__desc-text">
              {complaint.description || "No description provided."}
            </p>
          </div>

          {/* Rejection reason (if already rejected) */}
          {complaint.status === "rejected" && complaint.rejectionReason && (
            <div className="ssd-modal__rejection-note">
              <i className="bx bx-info-circle" />
              <div>
                <strong>Rejection Reason</strong>
                <p>{complaint.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* ── Locked state ── */}
          {isLocked ? (
            <div className="ssd-modal__locked">
              <i className="bx bx-lock-alt" />
              <p>
                This complaint is <strong>{complaint.status}</strong> and
                cannot be modified further.
              </p>
            </div>
          ) : (
            <>
              {/* ── Status Selection (Step 1) ── */}
              {!confirmStep && (
                <div className="ssd-modal__status-section">
                  <h4 className="ssd-modal__section-title">
                    Update Status
                  </h4>
                  <div className="ssd-status-options">
                    {STATUS_OPTIONS.map((opt) => {
                      /* Don't allow going back to pending if already in-progress */
                      const isDisabled =
                        opt.key === "pending" &&
                        complaint.status === "in-progress";

                      return (
                        <button
                          key={opt.key}
                          className={[
                            "ssd-status-option",
                            selectedStatus === opt.key
                              ? "ssd-status-option--selected"
                              : "",
                            isDisabled
                              ? "ssd-status-option--disabled"
                              : "",
                          ].join(" ")}
                          style={{
                            "--opt-color": opt.color,
                          }}
                          onClick={() => {
                            if (isDisabled) return;
                            setSelectedStatus(opt.key);
                            setReasonError("");
                          }}
                          disabled={isDisabled}
                          title={isDisabled ? "Cannot revert to Pending" : opt.desc}
                        >
                          <i className={opt.icon} style={{ color: opt.color }} />
                          <div className="ssd-status-option__text">
                            <span className="ssd-status-option__label"
                              style={{ color: opt.color }}>
                              {opt.label}
                            </span>
                            <span className="ssd-status-option__desc">
                              {opt.desc}
                            </span>
                          </div>
                          {selectedStatus === opt.key && (
                            <span className="ssd-status-option__check">
                              <i className="bx bx-check" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rejection reason textarea */}
                  {selectedStatus === "rejected" && (
                    <div className="ssd-modal__reason">
                      <label className="ssd-modal__reason-label">
                        Rejection Reason
                        <span className="ssd-modal__reason-required">*</span>
                      </label>
                      <textarea
                        className={[
                          "ssd-modal__reason-input",
                          reasonError ? "ssd-modal__reason-input--error" : "",
                        ].join(" ")}
                        placeholder="Explain why this complaint is being rejected…"
                        value={rejectionReason}
                        onChange={(e) => {
                          setRejectionReason(e.target.value);
                          if (reasonError) setReasonError("");
                        }}
                        maxLength={500}
                        rows={3}
                      />
                      <div className="ssd-modal__reason-footer">
                        {reasonError ? (
                          <span className="ssd-modal__reason-error">
                            <i className="bx bx-error-circle" />
                            {reasonError}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="ssd-modal__reason-count">
                          {rejectionReason.length}/500
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error from Redux */}
                  {updateError && (
                    <div className="ssd-modal__api-error">
                      <i className="bx bx-error" />
                      {updateError}
                    </div>
                  )}
                </div>
              )}

              {/* ── Confirm Step (Step 2) ── */}
              {confirmStep && (
                <div className="ssd-modal__confirm">
                  <div className="ssd-modal__confirm-icon">
                    <i className="bx bx-question-mark" />
                  </div>
                  <h4 className="ssd-modal__confirm-title">
                    Confirm Status Change
                  </h4>
                  <p className="ssd-modal__confirm-text">
                    You are about to mark this complaint as{" "}
                    <strong
                      style={{
                        color: STATUS_OPTIONS.find(
                          (o) => o.key === selectedStatus
                        )?.color,
                      }}
                    >
                      {STATUS_OPTIONS.find(
                        (o) => o.key === selectedStatus
                      )?.label}
                    </strong>
                    .{" "}
                    {LOCKED_STATUSES.includes(selectedStatus)
                      ? "This action cannot be undone."
                      : "You can change this again later."}
                  </p>
                  {selectedStatus === "rejected" && (
                    <div className="ssd-modal__confirm-reason">
                      <strong>Reason:</strong> {rejectionReason}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        {!isLocked && (
          <div className="ssd-modal__footer">
            {confirmStep ? (
              <>
                <button
                  className="ssd-btn ssd-btn--ghost"
                  onClick={() => setConfirmStep(false)}
                  disabled={updateLoading}
                >
                  <i className="bx bx-arrow-back" />
                  Go Back
                </button>
                <button
                  className={[
                    "ssd-btn",
                    selectedStatus === "rejected"
                      ? "ssd-btn--danger"
                      : "ssd-btn--primary",
                  ].join(" ")}
                  onClick={handleConfirm}
                  disabled={updateLoading}
                >
                  {updateLoading ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <i className="bx bx-check" />
                      Yes, Confirm
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  className="ssd-btn ssd-btn--ghost"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="ssd-btn ssd-btn--primary"
                  onClick={handleProceed}
                  disabled={!selectedStatus}
                >
                  Proceed
                  <i className="bx bx-chevron-right" />
                </button>
              </>
            )}
          </div>
        )}

        {isLocked && (
          <div className="ssd-modal__footer ssd-modal__footer--locked">
            <button className="ssd-btn ssd-btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Detail row helper ── */
const DetailRow = ({ label, value, priority }) => {
  const priorityColors = {
    low:    "#10b981",
    medium: "#f59e0b",
    high:   "#ef4444",
  };

  return (
    <div className="ssd-detail-row">
      <span className="ssd-detail-row__label">{label}</span>
      <span
        className="ssd-detail-row__value"
        style={
          priority && typeof value === "string"
            ? { color: priorityColors[value] || "inherit", fontWeight: 600 }
            : {}
        }
      >
        {priority && typeof value === "string"
          ? value.charAt(0).toUpperCase() + value.slice(1)
          : value || "—"}
      </span>
    </div>
  );
};

export default ComplaintActionModal;