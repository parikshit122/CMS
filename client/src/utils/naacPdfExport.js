import { jsPDF } from "jspdf";

const formatDateShort = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Generates a formal NAAC Criterion V & VII Institutional Grievance Audit PDF
 * directly from live Cloud SQL aggregates returned by /api/avishkar/naac-report.
 */
export function downloadNaacAuditPdf(report) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 16;

  const ensureSpace = (needed = 16) => {
    if (y + needed > pageHeight - 18) {
      doc.addPage();
      y = 18;
    }
  };

  // ── Institutional Header Band ────────────────────────────
  doc.setFillColor(11, 15, 23);
  doc.rect(0, 0, pageWidth, 34, "F");

  doc.setTextColor(248, 250, 252);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("INSTITUTIONAL GRIEVANCE REDRESSAL AUDIT REPORT", margin, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `${report.institution || "Smart Campus Institution"}  |  NAAC Criterion V & VII Compliance Dossier`,
    margin,
    21
  );
  doc.text(
    `Audit Window: ${formatDateShort(report.periodStart)} to ${formatDateShort(report.periodEnd)}   •   Generated: ${formatDateShort(report.generatedAt)}`,
    margin,
    27.5
  );

  y = 43;
  const s = report.summary || {};

  // ── Section 1: Executive Governance KPIs ────────────────
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Executive Grievance & SLA Summary", margin, y);
  y += 6;

  const kpis = [
    ["Total Grievances", String(s.totalComplaints ?? 0)],
    ["Resolved Tickets", `${s.resolvedCount ?? 0} (${s.resolutionRatePct ?? 0}%)`],
    ["SLA Compliance Rate", `${s.slaCompliancePct ?? 0}%`],
    ["Avg Resolution Time", `${s.avgResolutionHours ?? 0} hrs`],
    [
      "Student Satisfaction",
      s.totalRated ? `${s.avgSatisfactionRating} / 5 (${s.totalRated} rated)` : "Pending ratings",
    ],
    ["Duplicates Prevented", `${s.duplicateEndorsementsSaved ?? 0} merged (+1)`],
    ["Escalated (L1 / L2)", `L1: ${s.escalatedL1Count ?? 0}  |  L2: ${s.escalatedL2Count ?? 0}`],
    [
      "Intake Channels",
      `Web ${s.channels?.web ?? 0} · QR ${s.channels?.qr ?? 0} · Voice ${s.channels?.voice ?? 0}`,
    ],
  ];

  const colW = (pageWidth - margin * 2 - 6) / 2;
  doc.setFontSize(9.5);
  for (let i = 0; i < kpis.length; i += 2) {
    ensureSpace(14);
    for (let j = 0; j < 2 && i + j < kpis.length; j++) {
      const x = margin + j * (colW + 6);
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, y, colW, 12, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(kpis[i + j][0], x + 3.5, y + 4.8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(kpis[i + j][1], x + 3.5, y + 9.8);
    }
    y += 14.5;
  }

  y += 4;

  // ── Section 2: Department & Category SLA Leaderboard ────
  ensureSpace(24);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Department & Category SLA Performance Breakdown", margin, y);
  y += 6;

  const headers = ["Department", "Total", "Resolved", "SLA Met %", "Avg Hrs", "Rating", "Score"];
  const colWidths = [44, 18, 22, 24, 22, 24, 26];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7.5, "F");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  let cx = margin + 2;
  headers.forEach((h, idx) => {
    doc.text(h, cx, y + 5);
    cx += colWidths[idx];
  });
  y += 9;

  doc.setFont("helvetica", "normal");
  const board = s.leaderboard || [];
  if (board.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text("No complaint records available for the selected audit period.", margin + 2, y + 4);
    y += 10;
  } else {
    for (const row of board) {
      ensureSpace(8);
      doc.setTextColor(15, 23, 42);
      const vals = [
        String(row.category || "other").toUpperCase(),
        String(row.total),
        String(row.resolved),
        `${row.slaCompliancePct}%`,
        `${row.avgResolutionHours}h`,
        row.ratedCount ? `${row.avgRating}/5` : "—",
        `${row.compositeScore}/100`,
      ];
      cx = margin + 2;
      vals.forEach((val, idx) => {
        doc.text(val, cx, y + 4.5);
        cx += colWidths[idx];
      });
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);
      y += 7.5;
    }
  }

  y += 6;

  // ── Section 3: Campus QR Spot Deployment Telemetry ──────
  ensureSpace(24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("3. Physical Campus QR Spot Reporting Impact", margin, y);
  y += 6;

  const qr = report.qrSummary || {};
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Active QR Spots: ${qr.totalSpots ?? 0}   •   Total On-Site Scans: ${qr.totalScans ?? 0}   •   Tickets Filed via QR: ${qr.totalFiledViaQr ?? 0}`,
    margin,
    y + 3
  );
  y += 9;

  // ── Section 4: Escalation Accountability Audit Trail ────
  ensureSpace(24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("4. Auto-Escalation Accountability Log (L1 & L2)", margin, y);
  y += 6;

  const escLog = report.escalatedLog || [];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  if (escLog.length === 0) {
    doc.setTextColor(5, 150, 105);
    doc.text("Zero SLA escalations recorded in this audit window — 100% timely compliance.", margin, y + 4);
    y += 10;
  } else {
    for (const item of escLog.slice(0, 10)) {
      ensureSpace(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(
        `[L${item.escalationLevel}] ${item.complaintId} — ${String(item.title || "").slice(0, 62)}`,
        margin,
        y + 4
      );
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(
        `${String(item.category || "").toUpperCase()} · ${String(item.priority || "").toUpperCase()} · Status: ${item.status} · ${String(item.escalationReason || "").slice(0, 88)}`,
        margin,
        y + 8.5
      );
      y += 11.5;
    }
  }

  // ── Verification Footer ──────────────────────────────────
  const footerY = pageHeight - 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Verified system-generated audit report — ComplaintSync Smart Campus Governance (Avishkar Engineering & Technology Edition)",
    margin,
    footerY
  );

  const fileStamp = new Date().toISOString().slice(0, 10);
  doc.save(`ComplaintSync-NAAC-Audit-${report.range || "all"}-${fileStamp}.pdf`);
}
