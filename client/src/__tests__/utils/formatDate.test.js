import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  formatDate,
  formatDateTime,
  timeAgo,
  daysUntil,
  isPast,
} from "../../utils/formatDate";

describe("formatDate", () => {
  it("returns — for null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formats a valid date", () => {
    const result = formatDate("2024-01-15");
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => { vi.useRealTimers(); });

  it("returns Just now for recent time", () => {
    const recent = new Date("2024-06-15T11:59:50Z");
    expect(timeAgo(recent)).toBe("Just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date("2024-06-15T11:55:00Z");
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date("2024-06-15T10:00:00Z");
    expect(timeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date("2024-06-12T12:00:00Z");
    expect(timeAgo(threeDaysAgo)).toBe("3d ago");
  });

  it("returns — for null", () => {
    expect(timeAgo(null)).toBe("—");
  });
});

describe("daysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T00:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("returns 0 for past date", () => {
    expect(daysUntil("2024-06-10")).toBe(0);
  });

  it("returns correct days for future date", () => {
    expect(daysUntil("2024-06-20")).toBe(5);
  });
});

describe("isPast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T00:00:00Z"));
  });
  afterEach(() => { vi.useRealTimers(); });

  it("returns true for past date", () => {
    expect(isPast("2024-06-10")).toBe(true);
  });

  it("returns false for future date", () => {
    expect(isPast("2024-06-20")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isPast(null)).toBe(false);
  });
});