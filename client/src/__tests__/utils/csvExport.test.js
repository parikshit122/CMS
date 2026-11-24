import { describe, it, expect } from "vitest";
import { escapeCsvCell, buildComplaintsCsv } from "../../utils/csvExport";

describe("CSV export utility", () => {
  it("escapes commas, quotes, and newlines per RFC 4180", () => {
    expect(escapeCsvCell("Simple")).toBe("Simple");
    expect(escapeCsvCell('Room 101, "Main" Block')).toBe('"Room 101, ""Main"" Block"');
    expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    expect(escapeCsvCell(null)).toBe("");
  });

  it("neutralizes spreadsheet formula injection prefixes", () => {
    expect(escapeCsvCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(escapeCsvCell("+SUM(A1:A5)")).toBe("'+SUM(A1:A5)");
    expect(escapeCsvCell("-2+3")).toBe("'-2+3");
    expect(escapeCsvCell("@HYPERLINK(\"http://evil.test\")")).toBe(
      "\"'@HYPERLINK(\"\"http://evil.test\"\")\""
    );
  });

  it("serializes complaints including SLA and rating columns", () => {
    const now = new Date("2026-03-01T12:00:00.000Z");
    const csv = buildComplaintsCsv(
      [
        {
          complaintId: "CMP-2026-0001",
          title: "Broken Fan, Lab 2",
          category: "electrical",
          priority: "urgent",
          status: "resolved",
          slaDueAt: "2026-03-01T10:00:00.000Z",
          resolvedAt: "2026-03-01T09:00:00.000Z",
          createdAt: "2026-03-01T06:00:00.000Z",
          student: { name: "Asha", email: "asha@college.edu" },
          assignedTo: { name: "Ravi" },
          location: "Block B",
          rating: 5,
          ratingFeedback: "Fast fix!",
        },
      ],
      now
    );

    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Complaint ID,Title,Category,Priority,Status,SLA Status");
    expect(lines[1]).toContain('CMP-2026-0001,"Broken Fan, Lab 2",electrical,urgent,resolved,SLA Met');
    expect(lines[1]).toContain("5/5,Fast fix!");
  });
});
