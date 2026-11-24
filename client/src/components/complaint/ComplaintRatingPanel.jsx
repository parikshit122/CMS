import React, { useState, useEffect } from "react";
import complaintService from "../../services/complaintService";
import { useToast } from "../common/Alert";
import "../../styles/ComplaintExtras.css";

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const ComplaintRatingPanel = ({
  complaint,
  readOnly = false,
  onRated,
}) => {
  const toast = useToast();
  const [selectedRating, setSelectedRating] = useState(complaint?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState(complaint?.ratingFeedback || "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedRating(complaint?.rating || 0);
    setFeedback(complaint?.ratingFeedback || "");
    setHoverRating(0);
  }, [complaint?._id, complaint?.rating, complaint?.ratingFeedback]);

  if (!complaint) return null;

  const hasRating = Number(complaint.rating) >= 1 && Number(complaint.rating) <= 5;

  // Read-only mode (Admin/Staff) — only show if complaint has a rating
  if (readOnly) {
    if (!hasRating) return null;
    return (
      <section className="cs-panel cs-rating-panel" aria-label="Student satisfaction rating">
        <div className="cs-panel__header">
          <h4 className="cs-panel__title">
            <i className="bx bxs-star" aria-hidden="true" />
            Student Satisfaction
          </h4>
          <span className="cs-rating-score">
            {complaint.rating}/5 • {RATING_LABELS[complaint.rating] || ""}
          </span>
        </div>

        <div className="cs-stars-row" aria-label={`Rated ${complaint.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <i
              key={star}
              className={`bx ${star <= complaint.rating ? "bxs-star cs-star--filled" : "bx-star cs-star--empty"}`}
              aria-hidden="true"
            />
          ))}
          {complaint.ratedAt && (
            <span className="cs-rating-date">
              Rated {new Date(complaint.ratedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {complaint.ratingFeedback && (
          <blockquote className="cs-rating-quote">
            “{complaint.ratingFeedback}”
          </blockquote>
        )}
      </section>
    );
  }

  // Student interactive mode — only available for resolved complaints
  if (complaint.status !== "resolved") return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedRating < 1 || selectedRating > 5) {
      toast.warning("Please select a star rating from 1 to 5.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await complaintService.rateComplaint(complaint._id, {
        rating: selectedRating,
        feedback: feedback.trim(),
      });
      if (res.data?.success) {
        toast.success("Thank you for rating the resolution!");
        if (onRated) onRated(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit rating.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasRating) {
    return (
      <section className="cs-panel cs-rating-panel" aria-label="Your submitted rating">
        <div className="cs-panel__header">
          <h4 className="cs-panel__title">
            <i className="bx bxs-star" aria-hidden="true" />
            Your Satisfaction Rating
          </h4>
          <span className="cs-rating-score">
            {complaint.rating}/5 • {RATING_LABELS[complaint.rating] || ""}
          </span>
        </div>

        <div className="cs-stars-row" aria-label={`Rated ${complaint.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <i
              key={star}
              className={`bx ${star <= complaint.rating ? "bxs-star cs-star--filled" : "bx-star cs-star--empty"}`}
              aria-hidden="true"
            />
          ))}
          {complaint.ratedAt && (
            <span className="cs-rating-date">
              Submitted {new Date(complaint.ratedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>

        {complaint.ratingFeedback && (
          <blockquote className="cs-rating-quote">
            “{complaint.ratingFeedback}”
          </blockquote>
        )}
      </section>
    );
  }

  const activeStar = hoverRating || selectedRating;

  return (
    <section className="cs-panel cs-rating-panel" aria-label="Rate this resolution">
      <div className="cs-panel__header">
        <h4 className="cs-panel__title">
          <i className="bx bx-star" aria-hidden="true" />
          Rate This Resolution
        </h4>
        {activeStar > 0 && (
          <span className="cs-rating-score">
            {activeStar}/5 • {RATING_LABELS[activeStar]}
          </span>
        )}
      </div>

      <p className="cs-rating-hint">
        How satisfied are you with how this complaint was resolved?
      </p>

      <form className="cs-rating-form" onSubmit={handleSubmit}>
        <div
          className="cs-stars-picker"
          role="radiogroup"
          aria-label="Satisfaction rating"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= activeStar;
            return (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={selectedRating === star}
                aria-label={`Rate ${star} out of 5 stars — ${RATING_LABELS[star]}`}
                className={`cs-star-btn ${filled ? "cs-star-btn--active" : ""}`}
                onMouseEnter={() => setHoverRating(star)}
                onFocus={() => setHoverRating(star)}
                onBlur={() => setHoverRating(0)}
                onClick={() => setSelectedRating(star)}
                disabled={submitting}
              >
                <i className={`bx ${filled ? "bxs-star" : "bx-star"}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <label htmlFor={`rating-feedback-${complaint._id}`} className="sr-only">
          Optional feedback
        </label>
        <textarea
          id={`rating-feedback-${complaint._id}`}
          className="cs-comment-form__input"
          placeholder="Optional feedback on the resolution experience..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={500}
          rows={2}
          disabled={submitting}
        />

        <div className="cs-comment-form__footer">
          <span className="cs-char-count">{feedback.length}/500</span>
          <button
            type="submit"
            className="cs-primary-btn"
            disabled={submitting || selectedRating < 1}
          >
            {submitting ? (
              <>
                <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
                Submitting...
              </>
            ) : (
              <>
                <i className="bx bx-check" aria-hidden="true" />
                Submit Rating
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ComplaintRatingPanel;
