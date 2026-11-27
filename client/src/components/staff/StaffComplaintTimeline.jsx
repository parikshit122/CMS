import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import complaintService from "../../services/complaintService";
import StatusBadge from "../complaint/StatusBadge";
import SlaBadge from "../complaint/SlaBadge";
import { useToast } from "../common/Alert";
import {
  normalizeTimelineEvents,
  filterTimelineEvents,
  formatTimelineTimestamp,
  formatRelativeTime,
  formatStatusLabel,
} from "../../utils/complaintTimeline";

const QUEUE_FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
];

const EVENT_FILTERS = [
  { key: "all", label: "All Events" },
  { key: "status", label: "Status Changes" },
  { key: "notes", label: "Staff Notes" },
];

const ROLE_LABELS = {
  admin: "Admin",
  staff: "Staff",
  user: "Student",
  system: "System",
};

const StaffComplaintTimeline = ({
  complaints = [],
  loading = false,
  refreshKey = 0,
  onOpenActionModal,
}) => {
  const toast = useToast();

  const [queueFilter, setQueueFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [eventFilter, setEventFilter] = useState("all");

  const [activities, setActivities] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");

  const [noteInput, setNoteInput] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const filteredComplaints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return complaints.filter((item) => {
      const isClosed = item.status === "resolved" || item.status === "rejected";
      if (queueFilter === "active" && isClosed) return false;
      if (queueFilter === "closed" && !isClosed) return false;
      if (!q) return true;
      return (
        item.title?.toLowerCase().includes(q) ||
        item.complaintId?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.studentName?.toLowerCase().includes(q)
      );
    });
  }, [complaints, queueFilter, searchQuery]);

  useEffect(() => {
    if (filteredComplaints.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillVisible = filteredComplaints.some((c) => c._id === selectedId);
    if (!stillVisible) {
      setSelectedId(filteredComplaints[0]._id);
    }
  }, [filteredComplaints, selectedId]);

  const selectedComplaint = useMemo(
    () =>
      complaints.find((c) => c._id === selectedId) ||
      filteredComplaints[0] ||
      null,
    [complaints, filteredComplaints, selectedId]
  );

  const loadTimeline = useCallback(async (complaintId) => {
    if (!complaintId) {
      setActivities([]);
      return;
    }
    try {
      setTimelineLoading(true);
      setTimelineError("");
      const res = await complaintService.getComplaintActivities(complaintId);
      if (res.data?.success) {
        setActivities(res.data.data || []);
      } else {
        setActivities([]);
      }
    } catch (err) {
      setTimelineError(
        err.response?.data?.message || "Could not load complaint timeline."
      );
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedComplaint?._id) {
      loadTimeline(selectedComplaint._id);
    } else {
      setActivities([]);
    }
  }, [selectedComplaint?._id, refreshKey, loadTimeline]);

  const normalizedEvents = useMemo(
    () => normalizeTimelineEvents(activities, selectedComplaint),
    [activities, selectedComplaint]
  );

  const visibleEvents = useMemo(
    () => filterTimelineEvents(normalizedEvents, eventFilter),
    [normalizedEvents, eventFilter]
  );

  const handleAddNote = async (e) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!selectedComplaint?._id || !trimmed) {
      toast.warning("Enter a staff note before saving.");
      return;
    }
    try {
      setSubmittingNote(true);
      const res = await complaintService.addComplaintComment(
        selectedComplaint._id,
        trimmed
      );
      if (res.data?.success && res.data.data) {
        setActivities((prev) => [...prev, res.data.data]);
        setNoteInput("");
        toast.success("Staff note added to complaint timeline.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save staff note.");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="ssd-timeline-shell" aria-busy="true">
        <div className="ssd-timeline-rail">
          <div className="ssd-skeleton ssd-skeleton--chart" />
        </div>
        <div className="ssd-timeline-detail">
          <div className="ssd-skeleton ssd-skeleton--chart" />
        </div>
      </div>
    );
  }

  return (
    <div className="ssd-timeline-shell">
      {/* ── Left Rail: Assigned Complaint Selector ── */}
      <aside className="ssd-timeline-rail" aria-label="Assigned complaints list">
        <div className="ssd-timeline-rail__head">
          <div>
            <h3 className="ssd-timeline-rail__title">Assigned Cases</h3>
            <p className="ssd-timeline-rail__sub">
              Select a complaint to inspect its progression
            </p>
          </div>
          <span className="ssd-timeline-count">{filteredComplaints.length}</span>
        </div>

        <div className="ssd-timeline-rail__controls">
          <div className="ssd-timeline-search">
            <i className="bx bx-search" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, title, category..."
              aria-label="Filter assigned complaints"
            />
            {searchQuery && (
              <button
                type="button"
                className="ssd-table-search__clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <i className="bx bx-x" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="ssd-timeline-tabs" role="tablist" aria-label="Filter by state">
            {QUEUE_FILTERS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={queueFilter === tab.key}
                className={`ssd-timeline-tab ${
                  queueFilter === tab.key ? "is-active" : ""
                }`}
                onClick={() => setQueueFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ssd-timeline-list" role="listbox" aria-label="Complaints">
          {filteredComplaints.length === 0 ? (
            <div className="ssd-timeline-empty-mini">
              <i className="bx bx-folder-open" aria-hidden="true" />
              <p>No matching assigned complaints.</p>
            </div>
          ) : (
            filteredComplaints.map((c) => {
              const isSelected = selectedComplaint?._id === c._id;
              const ticketCode =
                c.complaintId || `#${String(c._id || "").slice(-6).toUpperCase()}`;
              return (
                <button
                  key={c._id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`ssd-timeline-item-btn ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSelectedId(c._id)}
                >
                  <div className="ssd-timeline-item-btn__top">
                    <span className="ssd-complaint-id">{ticketCode}</span>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="ssd-timeline-item-btn__title">{c.title}</div>
                  <div className="ssd-timeline-item-btn__meta">
                    <span>{c.category || "General"}</span>
                    <span aria-hidden="true">·</span>
                    <span>{c.studentName || "Student"}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Right Panel: Chronological Progression & Staff Notes ── */}
      <section
        className="ssd-timeline-detail"
        aria-label="Selected complaint historical progression"
      >
        {!selectedComplaint ? (
          <div className="ssd-timeline-empty">
            <i className="bx bx-history" aria-hidden="true" />
            <h4>Select a complaint to view its timeline</h4>
            <p>
              Status transitions, staff updates, and verified timestamps appear here.
            </p>
          </div>
        ) : (
          <>
            <header className="ssd-timeline-detail__head">
              <div className="ssd-timeline-detail__identity">
                <div className="ssd-timeline-detail__kicker">
                  <span className="ssd-complaint-id">
                    {selectedComplaint.complaintId ||
                      `#${String(selectedComplaint._id || "").slice(-6).toUpperCase()}`}
                  </span>
                  <StatusBadge status={selectedComplaint.status} />
                  <SlaBadge complaint={selectedComplaint} compact />
                </div>
                <h3 className="ssd-timeline-detail__title">
                  {selectedComplaint.title}
                </h3>
                <div className="ssd-timeline-detail__meta">
                  <span>{selectedComplaint.category || "General"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedComplaint.location || "Campus"}</span>
                  <span aria-hidden="true">·</span>
                  <span>Filed by {selectedComplaint.studentName || "Student"}</span>
                </div>
              </div>

              <div className="ssd-timeline-detail__actions">
                {onOpenActionModal && (
                  <button
                    type="button"
                    className="ssd-update-btn"
                    onClick={() => onOpenActionModal(selectedComplaint)}
                  >
                    <i className="bx bx-edit-alt" aria-hidden="true" />
                    <span>
                      {selectedComplaint.status === "resolved" ||
                      selectedComplaint.status === "rejected"
                        ? "View Details"
                        : "Update Status"}
                    </span>
                  </button>
                )}
                <Link to="/staff/complaints" className="ssd-timeline-queue-link">
                  Full Queue
                  <i className="bx bx-right-arrow-alt" aria-hidden="true" />
                </Link>
              </div>
            </header>

            <div className="ssd-timeline-toolbar">
              <div className="ssd-timeline-tabs" role="tablist" aria-label="Filter timeline events">
                {EVENT_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={eventFilter === f.key}
                    className={`ssd-timeline-tab ${
                      eventFilter === f.key ? "is-active" : ""
                    }`}
                    onClick={() => setEventFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="ssd-timeline-toolbar__summary">
                {visibleEvents.length}{" "}
                {visibleEvents.length === 1 ? "event" : "events"}
              </span>
            </div>

            <div className="ssd-timeline-body">
              {timelineLoading ? (
                <div className="ssd-timeline-state">
                  <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
                  <span>Loading progression history...</span>
                </div>
              ) : timelineError ? (
                <div className="ssd-timeline-state ssd-timeline-state--error">
                  <i className="bx bx-error-circle" aria-hidden="true" />
                  <span>{timelineError}</span>
                  <button
                    type="button"
                    className="ssd-timeline-retry"
                    onClick={() => loadTimeline(selectedComplaint._id)}
                  >
                    Retry
                  </button>
                </div>
              ) : visibleEvents.length === 0 ? (
                <div className="ssd-timeline-empty ssd-timeline-empty--compact">
                  <p>No {eventFilter === "notes" ? "staff notes" : "events"} recorded for this filter yet.</p>
                </div>
              ) : (
                <ol className="ssd-history-track">
                  {visibleEvents.map((evt) => {
                    const roleText = ROLE_LABELS[evt.authorRole] || evt.authorRole;
                    return (
                      <li
                        key={evt.id}
                        className={`ssd-history-node ssd-history-node--${evt.tone}`}
                      >
                        <div className="ssd-history-node__marker" aria-hidden="true">
                          <i className={evt.icon} />
                        </div>
                        <div className="ssd-history-node__card">
                          <div className="ssd-history-node__top">
                            <div className="ssd-history-node__who">
                              <strong className="ssd-history-node__author">
                                {evt.authorName}
                              </strong>
                              <span className="ssd-history-node__sep" aria-hidden="true">
                                ·
                              </span>
                              <span className="ssd-history-node__role">{roleText}</span>
                              <span className="ssd-history-node__sep" aria-hidden="true">
                                ·
                              </span>
                              <span className="ssd-history-node__kind">{evt.label}</span>
                            </div>
                            <time
                              className="ssd-history-node__time"
                              dateTime={evt.createdAt || undefined}
                              title={formatTimelineTimestamp(evt.createdAt)}
                            >
                              {formatTimelineTimestamp(evt.createdAt)}
                              {evt.createdAt ? (
                                <span className="ssd-history-node__rel">
                                  {" "}
                                  ({formatRelativeTime(evt.createdAt)})
                                </span>
                              ) : null}
                            </time>
                          </div>

                          {evt.fromStatus && evt.toStatus && (
                            <div className="ssd-history-transition">
                              <span className="ssd-history-transition__from">
                                {formatStatusLabel(evt.fromStatus)}
                              </span>
                              <i className="bx bx-right-arrow-alt" aria-hidden="true" />
                              <span className="ssd-history-transition__to">
                                {formatStatusLabel(evt.toStatus)}
                              </span>
                            </div>
                          )}

                          <p className="ssd-history-node__body">{evt.body}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* ── Inline Staff Note Composer ── */}
            <form className="ssd-note-composer" onSubmit={handleAddNote}>
              <label
                htmlFor="ssd-staff-note-input"
                className="ssd-note-composer__label"
              >
                Add Staff Progression Note
              </label>
              <div className="ssd-note-composer__row">
                <textarea
                  id="ssd-staff-note-input"
                  className="ssd-note-composer__input"
                  rows={2}
                  maxLength={1000}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Log an inspection update, parts order, or resolution note..."
                  disabled={submittingNote}
                />
                <button
                  type="submit"
                  className="ssd-btn ssd-btn--primary ssd-note-composer__submit"
                  disabled={submittingNote || !noteInput.trim()}
                >
                  {submittingNote ? (
                    <>
                      <i className="bx bx-loader-alt bx-spin" aria-hidden="true" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bx bx-send" aria-hidden="true" />
                      Add Note
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
};

export default StaffComplaintTimeline;
