import test from "node:test";
import assert from "node:assert/strict";
import {
  SLA_HOURS_BY_PRIORITY,
  getSlaHours,
  computeSlaDueAt,
  evaluateSlaStatus,
} from "./sla.ts";

test("getSlaHours returns expected SLA window per priority with safe fallback", () => {
  assert.equal(getSlaHours("urgent"), 4);
  assert.equal(getSlaHours("high"), 24);
  assert.equal(getSlaHours("medium"), 72);
  assert.equal(getSlaHours("low"), 168);
  assert.equal(getSlaHours("UNKNOWN"), SLA_HOURS_BY_PRIORITY.medium);
  assert.equal(getSlaHours(null), SLA_HOURS_BY_PRIORITY.medium);
});

test("computeSlaDueAt offsets createdAt by priority SLA window", () => {
  const created = new Date("2026-01-10T08:00:00.000Z");
  const urgentDue = computeSlaDueAt("urgent", created);
  assert.equal(urgentDue.toISOString(), "2026-01-10T12:00:00.000Z");

  const highDue = computeSlaDueAt("high", created);
  assert.equal(highDue.toISOString(), "2026-01-11T08:00:00.000Z");
});

test("evaluateSlaStatus classifies on-track, at-risk, and overdue active tickets", () => {
  const created = new Date("2026-01-10T08:00:00.000Z");
  const baseTicket = {
    priority: "urgent", // 4h window => due 12:00Z, at-risk threshold = 1h (11:00Z+)
    status: "in-progress",
    createdAt: created,
    slaDueAt: computeSlaDueAt("urgent", created),
  };

  const onTrack = evaluateSlaStatus(baseTicket, new Date("2026-01-10T09:30:00.000Z"));
  assert.equal(onTrack.state, "on-track");
  assert.equal(onTrack.isOverdue, false);

  const atRisk = evaluateSlaStatus(baseTicket, new Date("2026-01-10T11:30:00.000Z"));
  assert.equal(atRisk.state, "at-risk");
  assert.equal(atRisk.isOverdue, false);

  const overdue = evaluateSlaStatus(baseTicket, new Date("2026-01-10T13:15:00.000Z"));
  assert.equal(overdue.state, "overdue");
  assert.equal(overdue.isOverdue, true);
});

test("evaluateSlaStatus handles resolved (met vs breached) and rejected (closed)", () => {
  const created = new Date("2026-01-10T08:00:00.000Z");
  const due = computeSlaDueAt("urgent", created); // 12:00Z

  const met = evaluateSlaStatus({
    priority: "urgent",
    status: "resolved",
    createdAt: created,
    slaDueAt: due,
    resolvedAt: new Date("2026-01-10T11:45:00.000Z"),
  });
  assert.equal(met.state, "met");
  assert.equal(met.isOverdue, false);

  const breached = evaluateSlaStatus({
    priority: "urgent",
    status: "resolved",
    createdAt: created,
    slaDueAt: due,
    resolvedAt: new Date("2026-01-10T14:00:00.000Z"),
  });
  assert.equal(breached.state, "breached");
  assert.equal(breached.isOverdue, true);

  const rejected = evaluateSlaStatus({
    priority: "urgent",
    status: "rejected",
    createdAt: created,
    slaDueAt: due,
  });
  assert.equal(rejected.state, "closed");
  assert.equal(rejected.isOverdue, false);
});
