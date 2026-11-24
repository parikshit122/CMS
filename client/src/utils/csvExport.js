import { evaluateSlaStatus } from "./sla";

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Escapes a single CSV cell per RFC 4180 and neutralizes spreadsheet
 * formula injection (=, +, -, @, tab, CR leading characters).
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  let str = String(value);
  if (FORMULA_PREFIX_RE.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = [
  "Complaint ID",
  "Title",
  "Category",
  "Priority",
  "Status",
  "SLA Status",
  "SLA Deadline",
  "Student Name",
  "Student Email",
  "Assigned Staff",
  "Location",
  "Rating (1-5)",
  "Rating Feedback",
  "Submitted At",
  "Resolved At",
];

/**
 * Converts an array of complaint objects into a UTF-8 CSV string.
 */
export function buildComplaintsCsv(complaints = [], now = new Date()) {
  const rows = [CSV_HEADERS.map(escapeCsvCell).join(",")];

  for (const c of complaints) {
    const sla = evaluateSlaStatus(c, now);
    const values = [
      c.complaintId || c._id || "",
      c.title || "",
      c.category || "",
      c.priority || "",
      c.status || "",
      sla.label,
      sla.dueAt ? sla.dueAt.toISOString() : "",
      c.student?.name || c.studentName || "",
      c.student?.email || c.studentEmail || "",
      c.assignedTo?.name || "Unassigned",
      c.location || "",
      c.rating ? `${c.rating}/5` : "",
      c.ratingFeedback || "",
      c.createdAt ? new Date(c.createdAt).toISOString() : "",
      c.resolvedAt ? new Date(c.resolvedAt).toISOString() : "",
    ];
    rows.push(values.map(escapeCsvCell).join(","));
  }

  return rows.join("\r\n");
}

/**
 * Triggers a browser CSV file download with UTF-8 BOM for Excel compatibility.
 */
export function exportComplaintsCSV(complaints = [], filenamePrefix = "complaints-report") {
  const csvBody = buildComplaintsCsv(complaints);
  const blob = new Blob(["\uFEFF" + csvBody], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filenamePrefix}-${dateStamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
