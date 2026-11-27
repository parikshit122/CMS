import { describe, it, expect } from "vitest";
import {
  normalizeTimelineEvents,
  filterTimelineEvents,
  formatRelativeTime,
  formatStatusLabel,
} from "../../utils/complaintTimeline";

describe("complaintTimeline utilities", () => {
  it("sorts timeline events chronologically and distinguishes staff notes from status changes", () => {
    const raw = [
      {
        _id: "3",
        kind: "comment",
        authorName: "Priya Deshmukh",
        authorRole: "staff",
        body: "Ordered replacement compressor relay from electrical store.",
        createdAt: "2026-11-26T10:30:00.000Z",
      },
      {
        _id: "1",
        kind: "submitted",
        authorName: "Aarav Kulkarni",
        authorRole: "user",
        body: "Complaint submitted under electrical (high priority).",
        createdAt: "2026-11-25T08:00:00.000Z",
      },
      {
        _id: "2",
        kind: "status_change",
        authorName: "Priya Deshmukh",
        authorRole: "staff",
        body: "Status changed from pending to in-progress",
        meta: { from: "pending", to: "in-progress" },
        createdAt: "2026-11-25T12:15:00.000Z",
      },
    ];

    const normalized = normalizeTimelineEvents(raw);
    expect(normalized.map((e) => e.id)).toEqual(["1", "2", "3"]);
    expect(normalized[1].label).toBe("Status Change");
    expect(normalized[1].fromStatus).toBe("pending");
    expect(normalized[1].toStatus).toBe("in-progress");
    expect(normalized[2].label).toBe("Staff Note");
    expect(normalized[2].category).toBe("notes");
  });

  it("filters events by status changes vs notes", () => {
    const events = normalizeTimelineEvents([
      { _id: "1", kind: "submitted", body: "Filed", createdAt: "2026-11-25T08:00:00Z" },
      { _id: "2", kind: "status_change", body: "In progress", meta: { from: "pending", to: "in-progress" }, createdAt: "2026-11-25T09:00:00Z" },
      { _id: "3", kind: "comment", authorRole: "staff", body: "Inspected on site", createdAt: "2026-11-25T10:00:00Z" },
    ]);

    expect(filterTimelineEvents(events, "all")).toHaveLength(3);
    expect(filterTimelineEvents(events, "status").map((e) => e.id)).toEqual(["1", "2"]);
    expect(filterTimelineEvents(events, "notes").map((e) => e.id)).toEqual(["3"]);
  });

  it("synthesizes initial submission milestone when activities array is empty", () => {
    const events = normalizeTimelineEvents([], {
      _id: "c-42",
      studentName: "Aarav",
      category: "plumbing",
      priority: "urgent",
      createdAt: "2026-11-24T07:00:00Z",
    });
    expect(events).toHaveLength(1);
    expect(events[0].kind).toBe("submitted");
    expect(events[0].authorName).toBe("Aarav");
  });

  it("formats relative durations and status labels cleanly", () => {
    const now = new Date("2026-11-26T12:00:00Z").getTime();
    expect(formatRelativeTime("2026-11-26T11:59:45Z", now)).toBe("Just now");
    expect(formatRelativeTime("2026-11-26T11:30:00Z", now)).toBe("30m ago");
    expect(formatRelativeTime("2026-11-26T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeTime("2026-11-24T12:00:00Z", now)).toBe("2d ago");
    expect(formatStatusLabel("in-progress")).toBe("In Progress");
  });

  it("classifies automated system updates separately from student notes", () => {
    const events = normalizeTimelineEvents([
      {
        _id: "sys-1",
        kind: "comment",
        authorName: "SLA Escalation Engine",
        authorRole: "system",
        body: "Auto-escalated due to 24h SLA breach.",
        createdAt: "2026-11-26T10:00:00Z",
      },
    ]);
    expect(events[0].label).toBe("System Update");
    expect(events[0].tone).toBe("system");
    expect(events[0].category).toBe("status");
  });
});
