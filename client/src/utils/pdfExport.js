import jsPDF from "jspdf";
import logoSrc from "../assets/images/logo1.png";

const INSTITUTION =
  "Jayawanti Babu Foundation's Metropolitan Institute of Technology & Management (MITM)";
const PRIMARY = "#6366f1";
const LIGHT_BG = "#f5f3ff";
const BORDER = "#e0e7ff";
const TEXT_DARK = "#1a1f36";
const TEXT_MUTED = "#6b7280";
const PAGE_W = 210;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;

const getLogoBase64 = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
  });

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

const setColor = (doc, hex, type = "text") => {
  const [r, g, b] = hexToRgb(hex);
  if (type === "fill") doc.setFillColor(r, g, b);
  else doc.setTextColor(r, g, b);
};

const drawHeader = async (doc, logoBase64) => {
  const [pr, pg, pb] = hexToRgb(PRIMARY);

  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, PAGE_W, 38, "F");

  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", MARGIN, 6, 24, 24);
  }

  const textX = logoBase64 ? MARGIN + 28 : MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("MITM — Complaint Management System", textX, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(220, 220, 255);
  doc.text(INSTITUTION, textX, 23, { maxWidth: CONTENT_W - 30 });

  doc.setFontSize(7);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    textX,
    30,
  );

  return 38;
};

const drawFooter = (doc, pageNum, totalPages) => {
  const y = 292;
  const [pr, pg, pb] = hexToRgb(PRIMARY);

  doc.setFillColor(pr, pg, pb);
  doc.rect(0, y - 2, PAGE_W, 10, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("MITM Complaint Management System — Confidential", MARGIN, y + 4);
  doc.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, y + 4, {
    align: "right",
  });
};

const statusColor = (status) => {
  const map = {
    pending: "#f59e0b",
    "in-progress": "#3b82f6",
    resolved: "#10b981",
    rejected: "#ef4444",
  };
  return map[status] || "#6b7280";
};

const priorityColor = (priority) => {
  const map = {
    urgent: "#ef4444",
    high: "#f97316",
    medium: "#f59e0b",
    low: "#22c55e",
  };
  return map[priority] || "#6b7280";
};

const drawSectionTitle = (doc, title, y) => {
  const [pr, pg, pb] = hexToRgb(LIGHT_BG);
  doc.setFillColor(pr, pg, pb);
  doc.roundedRect(MARGIN, y, CONTENT_W, 8, 2, 2, "F");

  const [br, bg, bb] = hexToRgb(PRIMARY);
  doc.setFillColor(br, bg, bb);
  doc.rect(MARGIN, y, 3, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, PRIMARY);
  doc.text(title.toUpperCase(), MARGIN + 6, y + 5.5);

  return y + 12;
};

const drawField = (doc, label, value, x, y, w) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setColor(doc, TEXT_MUTED);
  doc.text(label, x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, TEXT_DARK);

  const lines = doc.splitTextToSize(String(value || "—"), w);
  doc.text(lines, x, y + 4.5);

  return y + 4.5 + lines.length * 4;
};

const drawStatusBadge = (doc, status, x, y) => {
  const safeStatus = status || "pending";
  const color = statusColor(safeStatus);
  const label =
    safeStatus === "in-progress"
      ? "In Progress"
      : safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);

  const [r, g, b] = hexToRgb(color);
  doc.setFillColor(r, g, b, 0.15);
  doc.setDrawColor(r, g, b);
  doc.roundedRect(x, y - 4, 28, 6, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text(label, x + 14, y, { align: "center" });
};

const drawPriorityBadge = (doc, priority, x, y) => {
  const safe = priority || "low";
  const color = priorityColor(safe);
  const label = safe.charAt(0).toUpperCase() + safe.slice(1);

  const [r, g, b] = hexToRgb(color);
  doc.setFillColor(r, g, b, 0.12);
  doc.setDrawColor(r, g, b);
  doc.roundedRect(x, y - 4, 22, 6, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(r, g, b);
  doc.text(label, x + 11, y, { align: "center" });
};

const renderComplaintLetter = async (doc, complaint, logoBase64) => {
  let y = await drawHeader(doc, logoBase64);
  y += 10;

  const [pr, pg, pb] = hexToRgb(PRIMARY);
  doc.setFillColor(pr, pg, pb);
  doc.rect(MARGIN, y, CONTENT_W, 0.4, "F");
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setColor(doc, TEXT_DARK);
  doc.text("COMPLAINT REPORT", PAGE_W / 2, y, { align: "center" });
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, TEXT_MUTED);
  doc.text(
    `Reference: ${complaint.complaintId || complaint._id}`,
    PAGE_W / 2,
    y,
    { align: "center" },
  );
  y += 10;

  doc.setFillColor(pr, pg, pb);
  doc.rect(MARGIN, y, CONTENT_W, 0.4, "F");
  y += 10;

  y = drawSectionTitle(doc, "Complaint Information", y);

  const col1X = MARGIN + 4;
  const col2X = PAGE_W / 2 + 4;
  const colW = CONTENT_W / 2 - 8;

  let leftY = y;
  let rightY = y;

  leftY =
    drawField(
      doc,
      "COMPLAINT ID",
      complaint.complaintId || complaint._id,
      col1X,
      leftY,
      colW,
    ) + 4;
  rightY = drawField(doc, "STATUS", "", col2X, rightY, colW);
  drawStatusBadge(doc, complaint.status, col2X, rightY - 1);
  rightY += 8;

  leftY =
    drawField(doc, "CATEGORY", complaint.category, col1X, leftY, colW) + 4;
  rightY = drawField(doc, "PRIORITY", "", col2X, rightY, colW);
  drawPriorityBadge(doc, complaint.priority, col2X, rightY - 1);
  rightY += 8;

  leftY =
    drawField(
      doc,
      "LOCATION",
      complaint.location || "Not specified",
      col1X,
      leftY,
      colW,
    ) + 4;

  rightY =
    drawField(
      doc,
      "DATE SUBMITTED",
      complaint.createdAt
        ? new Date(complaint.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })
        : "—",
      col2X,
      rightY,
      colW,
    ) + 4;

  if (complaint.updatedAt && complaint.status === "resolved") {
    rightY =
      drawField(
        doc,
        "DATE RESOLVED",
        new Date(complaint.updatedAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        col2X,
        rightY,
        colW,
      ) + 4;
  }

  y = Math.max(leftY, rightY) + 4;

  y = drawSectionTitle(doc, "Complaint Title & Description", y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, TEXT_DARK);
  const titleLines = doc.splitTextToSize(
    complaint.title || "Untitled",
    CONTENT_W - 8,
  );
  doc.text(titleLines, MARGIN + 4, y);
  y += titleLines.length * 5 + 4;

  const [bgr, bgg, bgb] = hexToRgb("#f9fafb");
  doc.setFillColor(bgr, bgg, bgb);
  doc.setDrawColor(...hexToRgb(BORDER));
  const descLines = doc.splitTextToSize(
    complaint.description || "No description provided.",
    CONTENT_W - 14,
  );
  const descBoxH = descLines.length * 4.5 + 10;
  doc.roundedRect(MARGIN, y, CONTENT_W, descBoxH, 3, 3, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setColor(doc, TEXT_DARK);
  doc.text(descLines, MARGIN + 6, y + 7);
  y += descBoxH + 8;

  y = drawSectionTitle(doc, "People Involved", y);

  leftY = y;
  rightY = y;

  leftY =
    drawField(
      doc,
      "STUDENT NAME",
      complaint.student?.name || "—",
      col1X,
      leftY,
      colW,
    ) + 4;
  leftY =
    drawField(
      doc,
      "STUDENT EMAIL",
      complaint.student?.email || "—",
      col1X,
      leftY,
      colW,
    ) + 4;
  leftY =
    drawField(
      doc,
      "STUDENT PHONE",
      complaint.student?.phone || "—",
      col1X,
      leftY,
      colW,
    ) + 4;
  leftY =
    drawField(
      doc,
      "COURSE & YEAR",
      complaint.student?.course
        ? `${complaint.student.course}${complaint.student.year ? ` — Year ${complaint.student.year}` : ""}`
        : "—",
      col1X,
      leftY,
      colW,
    ) + 4;

  rightY =
    drawField(
      doc,
      "ASSIGNED STAFF",
      complaint.assignedTo?.name || "Not yet assigned",
      col2X,
      rightY,
      colW,
    ) + 4;
  rightY =
    drawField(
      doc,
      "STAFF EMAIL",
      complaint.assignedTo?.email || "—",
      col2X,
      rightY,
      colW,
    ) + 4;
  rightY =
    drawField(
      doc,
      "STAFF PHONE",
      complaint.assignedTo?.phone || "—",
      col2X,
      rightY,
      colW,
    ) + 4;
  rightY =
    drawField(
      doc,
      "STAFF SPECIALIZATION",
      complaint.assignedTo?.category
        ? complaint.assignedTo.category.charAt(0).toUpperCase() +
            complaint.assignedTo.category.slice(1)
        : "—",
      col2X,
      rightY,
      colW,
    ) + 4;

  y = Math.max(leftY, rightY) + 4;

  if (complaint.status === "rejected" && complaint.rejectionReason) {
    y = drawSectionTitle(doc, "Rejection Details", y);

    const [rr, rg, rb] = hexToRgb("#fef2f2");
    doc.setFillColor(rr, rg, rb);
    doc.setDrawColor(...hexToRgb("#fecaca"));
    const rejLines = doc.splitTextToSize(
      complaint.rejectionReason,
      CONTENT_W - 14,
    );
    const rejBoxH = rejLines.length * 4.5 + 10;
    doc.roundedRect(MARGIN, y, CONTENT_W, rejBoxH, 3, 3, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text(rejLines, MARGIN + 6, y + 7);
    y += rejBoxH + 8;
  }

  y = drawSectionTitle(doc, "Official Declaration", y);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  setColor(doc, TEXT_MUTED);
  const declaration =
    "This document is an official record generated by the MITM Complaint Management System. " +
    "The information contained herein is confidential and intended solely for authorized personnel of " +
    "Jayawanti Babu Foundation's Metropolitan Institute of Technology & Management (MITM).";
  const declLines = doc.splitTextToSize(declaration, CONTENT_W - 8);
  doc.text(declLines, MARGIN + 4, y);
  y += declLines.length * 4 + 14;

  const sigY = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, TEXT_DARK);

  doc.setDrawColor(...hexToRgb(BORDER));
  doc.line(MARGIN + 4, sigY, MARGIN + 54, sigY);
  doc.line(PAGE_W / 2 + 4, sigY, PAGE_W / 2 + 54, sigY);
  doc.line(PAGE_W - MARGIN - 54, sigY, PAGE_W - MARGIN - 4, sigY);

  doc.setFontSize(7);
  setColor(doc, TEXT_MUTED);
  doc.text("Student Signature", MARGIN + 4, sigY + 4);
  doc.text("Staff Signature", PAGE_W / 2 + 4, sigY + 4);
  doc.text("Administrator", PAGE_W - MARGIN - 54, sigY + 4);
};

export const exportSinglePDF = async (complaint) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoBase64 = await getLogoBase64();

  await renderComplaintLetter(doc, complaint, logoBase64);
  drawFooter(doc, 1, 1);

  doc.save(`complaint_${complaint.complaintId || complaint._id}_MITM.pdf`);
};

export const exportBulkPDF = async (complaints) => {
  if (!complaints.length) return;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoBase64 = await getLogoBase64();
  const total = complaints.length;

  for (let i = 0; i < complaints.length; i++) {
    if (i > 0) doc.addPage();

    await renderComplaintLetter(doc, complaints[i], logoBase64);
    drawFooter(doc, i + 1, total);
  }

  doc.save(
    `MITM_complaints_report_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
};
