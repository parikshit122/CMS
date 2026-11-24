import { describe, it, expect } from "vitest";
import {
  computeSlaDueAt,
  evaluateSlaStatus,
  formatSlaDuration,
} from "../../utils/sla";

describe("client SLA utility", () => {
  it("formats minutes, hours, and days cleanly", () => {
    expect(formatSlaDuration(30 * 60 * 1000)).toBe("30m");
    expect(formatSlaDuration(3 * 60 * 60 * 1000)).toBe("3h");
    expect(formatSlaDuration((3 * 60 + 20) * 60 * 1000)).toBe("3h 20m");
    expect(formatSlaDuration(50 * 60 * 60 * 1000)).toBe("2d 2h");
  });

  it("evaluates active SLA states accurately", () => {
    const created = new Date("2026-02-01T00:00:00.000Z");
    const ticket = {
      priority: "high", // 24h window
      status: "pending",
      createdAt: created,
      slaDueAt: computeSlaDueAt("high", created),
    };

    const onTrack = evaluateSlaStatus(ticket, new Date("2026-02-01T06:00:00.000Z"));
    expect(onTrack.state).toBe("on-track");
    expect(onTrack.label).toBe("18h left");

    const atRisk = evaluateSlaStatus(ticket, new Date("2026-02-01T21:00:00.000Z"));
    expect(atRisk.state).toBe("at-risk");
    expect(atRisk.label).toBe("3h left");

    const overdue = evaluateSlaStatus(ticket, new Date("2026-02-02T02:00:00.000Z"));
    expect(overdue.state).toBe("overdue");
    expect(overdue.isOverdue).toBe(true);
    expect(overdue.label).toBe("Overdue 2h");
  });

  it("evaluates resolved SLA met vs breached", () => {
    const created = new Date("2026-02-01T00:00:00.000Z");
    const due = computeSlaDueAt("urgent", created);

    expect(
      evaluateSlaStatus({
        priority: "urgent",
        status: "resolved",
        createdAt: created,
        slaDueAt: due,
        resolvedAt: new Date("2026-02-01T03:00:00.000Z"),
      }).label
    ).toBe("SLA Met");

    expect(
      evaluateSlaStatus({
        priority: "urgent",
        status: "resolved",
        createdAt: created,
        slaDueAt: due,
        resolvedAt: new Date("2026-02-01T06:00:00.000Z"),
      }).label
    ).toBe("Late 2h");
  });
});
