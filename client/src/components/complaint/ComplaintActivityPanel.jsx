import React, { useEffect, useState, useCallback } from "react";
import complaintService from "../../services/complaintService";
import { useToast } from "../common/Alert";
import "../../styles/ComplaintExtras.css";

const KIND_META = {
  submitted: { icon: "bx-file-blank", label: "Submitted", cls: "cs-act--submitted" },
  assignment: { icon: "bx-user-check", label: "Assignment", cls: "cs-act--assignment" },
  status_change: { icon: "bx-transfer-alt", label: "Status Update", cls: "cs-act--status" },
  rating: { icon: "bxs-star", label: "Student Rating", cls: "cs-act--rating" },
  comment: { icon: "bx-message-dots", label: "Comment", cls: "cs-act--comment" },
};

const ROLE_LABELS = {
  admin: "Admin",
  staff: "Staff",
  user: "Student",
  system: "System",
};

const formatTimestamp = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const ComplaintActivityPanel = ({
  complaintId,
  refreshKey = 0,
  canComment = true,
}) => {
  const toast = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadActivities = useCallback(async () => {
    if (!complaintId) return;
    try {
      setLoading(true);
      setError("");
      const res = await complaintService.getComplaintActivities(complaintId);
      if (res.data?.success) {
        setActivities(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not load activity timeline.");
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities, refreshKey]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = commentBody.trim();
    if (!trimmed) {
      toast.warning("Please enter a comment before posting.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await complaintService.addComplaintComment(complaintId, trimmed);
      if (res.data?.success && res.data.data) {
        setActivities((prev) => [...prev, res.data.data]);
        setCommentBody("");
        toast.success("Comment posted");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="cs-panel" aria-label="Activity timeline and comments">
      <div className="cs-panel__header">
        <h4 className="cs-panel__title">
          <i className="bx bx-history" aria-hidden="true" />
          Activity & Comments
        </h4>
        <span className="cs-panel__count">{activities.length}</span>
      </div>

      {loading ? (
        <div className="cs-panel__state">
          <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
          <span>Loading timeline...</span>
        </div>
      ) : error ? (
        <div className="cs-panel__state cs-panel__state--error">
          <i className="bx bx-error-circle" aria-hidden="true" />
          <span>{error}</span>
          <button
            type="button"
            className="cs-inline-retry"
            onClick={loadActivities}
          >
            Retry
          </button>
        </div>
      ) : activities.length === 0 ? (
        <p className="cs-panel__empty">No activity recorded yet.</p>
      ) : (
        <ol className="cs-timeline">
          {activities.map((item) => {
            const meta = KIND_META[item.kind] || KIND_META.comment;
            const roleLabel = ROLE_LABELS[item.authorRole] || item.authorRole;
            const isComment = item.kind === "comment";

            return (
              <li
                key={item._id || `${item.kind}-${item.createdAt}`}
                className={`cs-timeline__item ${meta.cls} ${isComment ? "cs-timeline__item--comment" : ""}`}
              >
                <div className="cs-timeline__icon" aria-hidden="true">
                  <i className={`bx ${meta.icon}`} />
                </div>
                <div className="cs-timeline__content">
                  <div className="cs-timeline__meta">
                    <strong className="cs-timeline__author">
                      {item.authorName || "System"}
                    </strong>
                    <span className={`cs-role-tag cs-role-tag--${item.authorRole || "system"}`}>
                      {roleLabel}
                    </span>
                    <span className="cs-timeline__kind">{meta.label}</span>
                    <time className="cs-timeline__time">
                      {formatTimestamp(item.createdAt)}
                    </time>
                  </div>
                  <p className="cs-timeline__body">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {canComment && (
        <form className="cs-comment-form" onSubmit={handleSubmit}>
          <label htmlFor={`comment-input-${complaintId}`} className="sr-only">
            Add a comment
          </label>
          <textarea
            id={`comment-input-${complaintId}`}
            className="cs-comment-form__input"
            placeholder="Write an update or follow-up comment..."
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            maxLength={1000}
            rows={2}
            disabled={submitting}
          />
          <div className="cs-comment-form__footer">
            <span className="cs-char-count">{commentBody.length}/1000</span>
            <button
              type="submit"
              className="cs-primary-btn"
              disabled={submitting || !commentBody.trim()}
            >
              {submitting ? (
                <>
                  <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
                  Posting...
                </>
              ) : (
                <>
                  <i className="bx bx-send" aria-hidden="true" />
                  Post Comment
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default ComplaintActivityPanel;
