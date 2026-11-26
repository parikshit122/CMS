import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateSlaEscalation,
  rankCandidateDuplicates,
  computeDepartmentLeaderboard,
  computeNaacAuditMetrics,
  maskComplaintForPublic,
  normalizeSpotCode,
} from "./avishkar-logic";

test("evaluateSlaEscalation keeps fresh tickets at Level 0", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  const createdAt = new Date("2026-11-25T11:00:00Z"); // 1h into 4h urgent window (25%)
  const res = evaluateSlaEscalation(
    { status: "pending", priority: "urgent", createdAt, currentEscalationLevel: 0 },
    now
  );
  assert.equal(res.targetLevel, 0);
  assert.equal(res.shouldEscalate, false);
});

test("evaluateSlaEscalation triggers Level 1 warning at >= 75% SLA elapsed", () => {
  const now = new Date("2026-11-25T15:15:00Z");
  const createdAt = new Date("2026-11-25T12:00:00Z"); // 3.25h into 4h urgent window (81%)
  const res = evaluateSlaEscalation(
    { status: "in-progress", priority: "urgent", createdAt, currentEscalationLevel: 0 },
    now
  );
  assert.equal(res.targetLevel, 1);
  assert.equal(res.shouldEscalate, true);
  assert.match(res.reason, /Level 1/);
});

test("evaluateSlaEscalation triggers Level 2 breach when past slaDueAt", () => {
  const now = new Date("2026-11-26T14:00:00Z");
  const createdAt = new Date("2026-11-25T10:00:00Z");
  const slaDueAt = new Date("2026-11-26T10:00:00Z"); // 4h overdue
  const res = evaluateSlaEscalation(
    { status: "pending", priority: "high", createdAt, slaDueAt, currentEscalationLevel: 1 },
    now
  );
  assert.equal(res.targetLevel, 2);
  assert.equal(res.shouldEscalate, true);
  assert.match(res.reason, /Level 2/);
});

test("evaluateSlaEscalation never escalates resolved or rejected tickets", () => {
  const now = new Date("2026-11-30T12:00:00Z");
  const createdAt = new Date("2026-11-20T12:00:00Z");
  const resolved = evaluateSlaEscalation(
    { status: "resolved", priority: "urgent", createdAt, currentEscalationLevel: 0 },
    now
  );
  assert.equal(resolved.targetLevel, 0);
  assert.equal(resolved.shouldEscalate, false);
});

test("rankCandidateDuplicates surfaces matching open tickets and ignores resolved ones", () => {
  const candidates = [
    {
      id: 101,
      complaintId: "CMP-2026-0010",
      title: "Projector HDMI cable broken in Computer Lab 2",
      description: "The overhead projector does not detect laptop signal in Computer Lab 2.",
      category: "it",
      location: "lab-cs",
      status: "pending",
      endorsementCount: 4,
    },
    {
      id: 102,
      complaintId: "CMP-2026-0009",
      title: "Projector HDMI cable broken in Computer Lab 2",
      description: "Old resolved issue",
      category: "it",
      location: "lab-cs",
      status: "resolved",
      endorsementCount: 2,
    },
    {
      id: 103,
      complaintId: "CMP-2026-0011",
      title: "Water leakage in Hostel Block A bathroom",
      description: "Tap pipe leaking continuously on 2nd floor",
      category: "plumbing",
      location: "hostel-a",
      status: "in-progress",
      endorsementCount: 1,
    },
  ];

  const matches = rankCandidateDuplicates(
    {
      title: "Computer Lab 2 projector HDMI not working",
      description: "Projector screen stays blank when connecting laptop HDMI cable",
      category: "it",
      location: "lab-cs",
    },
    candidates
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].complaintId, "CMP-2026-0010");
  assert.ok(matches[0].similarityScore >= 50);
  assert.equal(matches[0].endorsementCount, 4);
});

test("computeDepartmentLeaderboard ranks higher SLA compliance & resolution departments first", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  const records = [
    {
      category: "it",
      status: "resolved",
      priority: "high",
      createdAt: "2026-11-24T10:00:00Z",
      resolvedAt: "2026-11-24T16:00:00Z", // 6h (within 24h)
      rating: 5,
    },
    {
      category: "plumbing",
      status: "pending",
      priority: "urgent",
      createdAt: "2026-11-23T10:00:00Z", // way overdue
      escalationLevel: 2,
    },
  ];

  const board = computeDepartmentLeaderboard(records, now);
  assert.equal(board.length, 2);
  assert.equal(board[0].category, "it");
  assert.equal(board[0].slaCompliancePct, 100);
  assert.equal(board[0].avgResolutionHours, 6);
  assert.equal(board[1].category, "plumbing");
  assert.equal(board[1].slaCompliancePct, 0);
  assert.equal(board[1].escalatedCount, 1);
});

test("computeNaacAuditMetrics calculates endorsements saved, escalations, and channels accurately", () => {
  const now = new Date("2026-11-25T12:00:00Z");
  const summary = computeNaacAuditMetrics(
    [
      {
        category: "electrical",
        status: "resolved",
        priority: "medium",
        createdAt: "2026-11-24T00:00:00Z",
        resolvedAt: "2026-11-24T12:00:00Z",
        rating: 4,
        endorsementCount: 5, // 4 duplicates prevented
        sourceChannel: "qr",
        escalationLevel: 0,
      },
      {
        category: "it",
        status: "in-progress",
        priority: "urgent",
        createdAt: "2026-11-24T00:00:00Z",
        endorsementCount: 3, // 2 duplicates prevented
        sourceChannel: "voice",
        escalationLevel: 2,
      },
    ],
    now
  );

  assert.equal(summary.totalComplaints, 2);
  assert.equal(summary.resolvedCount, 1);
  assert.equal(summary.resolutionRatePct, 50);
  assert.equal(summary.duplicateEndorsementsSaved, 6);
  assert.equal(summary.escalatedL2Count, 1);
  assert.deepEqual(summary.channels, { web: 0, qr: 1, voice: 1 });
});

test("maskComplaintForPublic strictly strips student PII and comments", () => {
  const masked = maskComplaintForPublic(
    {
      complaintId: "CMP-2026-0042",
      title: "Wi-Fi router offline in Library",
      category: "it",
      priority: "high",
      location: "library",
      status: "in-progress",
      student: { name: "Aarav Patil", email: "aarav@campus.edu", phone: "9876543210" },
      attachments: [{ url: "https://private.example/photo.jpg" }],
      endorsementCount: 3,
      escalationLevel: 1,
      assignedToId: 7,
      createdAt: "2026-11-25T08:00:00Z",
      updatedAt: "2026-11-25T10:00:00Z",
    },
    [
      { kind: "submitted", body: "Complaint submitted", authorRole: "user", createdAt: "2026-11-25T08:00:00Z" },
      { kind: "comment", body: "My room phone is 9999999999", authorRole: "user", createdAt: "2026-11-25T09:00:00Z" },
      { kind: "status_change", body: "Moved to In Progress", authorRole: "staff", createdAt: "2026-11-25T10:00:00Z" },
    ]
  );

  assert.equal("student" in masked, false);
  assert.equal("attachments" in masked, false);
  assert.equal(masked.complaintId, "CMP-2026-0042");
  assert.equal(masked.timeline.length, 2);
  assert.equal(masked.timeline.some((t) => t.kind === "comment"), false);
});

test("normalizeSpotCode creates clean uppercase slugs", () => {
  assert.equal(normalizeSpotCode(" campus cs lab 02!! "), "CAMPUS-CS-LAB-02");
  assert.equal(normalizeSpotCode("hostel__a--cooler"), "HOSTEL-A-COOLER");
});
