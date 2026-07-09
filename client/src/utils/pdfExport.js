import jsPDF from "jspdf";
import logoSrc from "../assets/images/logo1.png";

// ==================== CONFIG ====================
const INSTITUTION =
  "Jayawanti Babu Foundation's Metropolitan Institute of Technology & Management (MITM)";
const INSTITUTION_SHORT = "MITM";

const COLORS = {
  primary: "#4f46e5",
  primaryDark: "#3730a3",
  primaryLight: "#eef2ff",
  accent: "#8b5cf6",
  textDark: "#0f172a",
  textBody: "#334155",
  textMuted: "#64748b",
  textLight: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  bgSoft: "#f8fafc",
  white: "#ffffff",
};

const PAGE = {
  width: 210,
  height: 297,
  margin: 12,
  headerHeight: 26,
  footerHeight: 10,
};
PAGE.contentW = PAGE.width - PAGE.margin * 2;
PAGE.contentTop = PAGE.headerHeight + 5;
PAGE.contentBottom = PAGE.height - PAGE.footerHeight - 2;

// ==================== UTILITIES ====================
const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const setFill = (doc, hex) => doc.setFillColor(...hexToRgb(hex));
const setDraw = (doc, hex) => doc.setDrawColor(...hexToRgb(hex));
const setText = (doc, hex) => doc.setTextColor(...hexToRgb(hex));

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

const formatDate = (date, withTime = false) => {
  if (!date) return "—";
  const opts = { day: "2-digit", month: "short", year: "numeric" };
  if (withTime) {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
  }
  return new Date(date).toLocaleString("en-IN", opts);
};

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");

const statusMeta = (status) => {
  const map = {
    pending: { color: "#d97706", bg: "#fef3c7", label: "Pending" },
    "in-progress": { color: "#2563eb", bg: "#dbeafe", label: "In Progress" },
    resolved: { color: "#059669", bg: "#d1fae5", label: "Resolved" },
    rejected: { color: "#dc2626", bg: "#fee2e2", label: "Rejected" },
  };
  return map[status] || { color: "#6b7280", bg: "#f3f4f6", label: cap(status) };
};

const priorityMeta = (priority) => {
  const map = {
    urgent: { color: "#dc2626", bg: "#fee2e2", label: "Urgent" },
    high: { color: "#ea580c", bg: "#ffedd5", label: "High" },
    medium: { color: "#d97706", bg: "#fef3c7", label: "Medium" },
    low: { color: "#16a34a", bg: "#dcfce7", label: "Low" },
  };
  return map[priority] || { color: "#6b7280", bg: "#f3f4f6", label: cap(priority) };
};

// ==================== HEADER / FOOTER ====================
const drawHeader = (doc, logoBase64) => {
  setFill(doc, COLORS.primary);
  doc.rect(0, 0, PAGE.width, PAGE.headerHeight, "F");

  setFill(doc, COLORS.accent);
  doc.rect(0, PAGE.headerHeight, PAGE.width, 1, "F");

  if (logoBase64) {
    setFill(doc, COLORS.white);
    doc.circle(PAGE.margin + 7, PAGE.headerHeight / 2, 7.5, "F");
    doc.addImage(logoBase64, "PNG", PAGE.margin + 1, PAGE.headerHeight / 2 - 6, 12, 12);
  }

  const textX = logoBase64 ? PAGE.margin + 18 : PAGE.margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, COLORS.white);
  doc.text("Complaint Management System", textX, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, "#e0e7ff");
  const instLines = doc.splitTextToSize(INSTITUTION, PAGE.contentW - 60);
  doc.text(instLines, textX, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  setText(doc, COLORS.white);
  doc.text("OFFICIAL REPORT", PAGE.width - PAGE.margin, 11, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  setText(doc, "#e0e7ff");
  doc.text(
    `Generated ${formatDate(new Date(), true)}`,
    PAGE.width - PAGE.margin,
    15,
    { align: "right" }
  );
};

const drawFooter = (doc, pageNum, totalPages, complaintRef) => {
  const y = PAGE.height - PAGE.footerHeight;

  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(PAGE.margin, y, PAGE.width - PAGE.margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  setText(doc, COLORS.textMuted);

  doc.text(`${INSTITUTION_SHORT} — Confidential Document`, PAGE.margin, y + 4);

  if (complaintRef) {
    doc.text(`Ref: ${complaintRef}`, PAGE.width / 2, y + 4, { align: "center" });
  }

  doc.text(
    `Page ${pageNum} of ${totalPages}`,
    PAGE.width - PAGE.margin,
    y + 4,
    { align: "right" }
  );

  setFill(doc, COLORS.primary);
  doc.rect(0, PAGE.height - 1.5, PAGE.width, 1.5, "F");
};

// ==================== SECTION COMPONENTS ====================
const drawSectionHeader = (doc, title, y) => {
  setFill(doc, COLORS.primary);
  doc.rect(PAGE.margin, y, 2, 4.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, COLORS.primaryDark);
  doc.text(title.toUpperCase(), PAGE.margin + 4, y + 3.3);

  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(PAGE.margin, y + 5.5, PAGE.width - PAGE.margin, y + 5.5);

  return y + 8.5;
};

const drawField = (doc, label, value, x, y, w) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  setText(doc, COLORS.textMuted);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(doc, COLORS.textDark);

  const safeValue = value === null || value === undefined || value === "" ? "—" : String(value);
  const lines = doc.splitTextToSize(safeValue, w);
  doc.text(lines, x, y + 3.5);
};

const drawBadgeField = (doc, label, meta, x, y) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  setText(doc, COLORS.textMuted);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const textW = doc.getTextWidth(meta.label);
  const badgeW = textW + 6;
  const badgeH = 4.5;
  const badgeY = y + 1;

  setFill(doc, meta.bg);
  setDraw(doc, meta.color);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, badgeY, badgeW, badgeH, 1.2, 1.2, "FD");

  setText(doc, meta.color);
  doc.text(meta.label, x + badgeW / 2, badgeY + 3.1, { align: "center" });
};

const drawInfoCard = (doc, y, rows) => {
  const rowH = 8;
  const cardH = rows.length * rowH + 4;
  const colW = PAGE.contentW / 2;

  setFill(doc, COLORS.bgSoft);
  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(PAGE.margin, y, PAGE.contentW, cardH, 1.5, 1.5, "FD");

  setDraw(doc, COLORS.border);
  doc.line(PAGE.margin + colW, y + 2, PAGE.margin + colW, y + cardH - 2);

  rows.forEach((row, i) => {
    const rowY = y + 4 + i * rowH;

    if (row.left) {
      if (row.left.type === "badge") {
        drawBadgeField(doc, row.left.label, row.left.meta, PAGE.margin + 3, rowY);
      } else {
        drawField(doc, row.left.label, row.left.value, PAGE.margin + 3, rowY, colW - 6);
      }
    }

    if (row.right) {
      if (row.right.type === "badge") {
        drawBadgeField(doc, row.right.label, row.right.meta, PAGE.margin + colW + 3, rowY);
      } else {
        drawField(doc, row.right.label, row.right.value, PAGE.margin + colW + 3, rowY, colW - 6);
      }
    }

    if (i < rows.length - 1) {
      setDraw(doc, COLORS.borderLight);
      doc.setLineWidth(0.1);
      doc.line(PAGE.margin + 2, rowY + rowH - 1.5, PAGE.margin + PAGE.contentW - 2, rowY + rowH - 1.5);
    }
  });

  return y + cardH + 4;
};

// ==================== MAIN RENDER ====================
const renderComplaint = (doc, complaint, logoBase64) => {
  drawHeader(doc, logoBase64);
  let y = PAGE.contentTop;

  // ===== TITLE BLOCK =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  setText(doc, COLORS.textDark);
  doc.text("COMPLAINT REPORT", PAGE.width / 2, y + 2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setText(doc, COLORS.textMuted);
  doc.text(
    `Reference No. ${complaint.complaintId || complaint._id}`,
    PAGE.width / 2,
    y + 7,
    { align: "center" }
  );

  y += 11;

  // Decorative divider
  setDraw(doc, COLORS.primary);
  doc.setLineWidth(0.4);
  const centerX = PAGE.width / 2;
  doc.line(centerX - 20, y, centerX - 2.5, y);
  doc.line(centerX + 2.5, y, centerX + 20, y);
  setFill(doc, COLORS.primary);
  doc.circle(centerX, y, 0.8, "F");

  y += 5;

  // ===== SECTION 1: COMPLAINT INFORMATION =====
  y = drawSectionHeader(doc, "Complaint Information", y);

  const sMeta = statusMeta(complaint.status);
  const pMeta = priorityMeta(complaint.priority);

  const infoRows = [
    {
      left: { label: "Complaint ID", value: complaint.complaintId || complaint._id },
      right: { label: "Status", type: "badge", meta: sMeta },
    },
    {
      left: { label: "Category", value: cap(complaint.category) },
      right: { label: "Priority", type: "badge", meta: pMeta },
    },
    {
      left: { label: "Location", value: complaint.location || "Not specified" },
      right: { label: "Date Submitted", value: formatDate(complaint.createdAt) },
    },
  ];

  y = drawInfoCard(doc, y, infoRows);

  // ===== SECTION 2: TITLE & DESCRIPTION =====
  y = drawSectionHeader(doc, "Complaint Details", y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, COLORS.textDark);
  const titleLines = doc.splitTextToSize(
    complaint.title || "Untitled Complaint",
    PAGE.contentW - 4
  );
  doc.text(titleLines, PAGE.margin, y);
  y += titleLines.length * 4.5 + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  setText(doc, COLORS.textMuted);
  doc.text("DESCRIPTION", PAGE.margin, y);
  y += 2.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const descText = complaint.description || "No description provided.";
  const descLines = doc.splitTextToSize(descText, PAGE.contentW - 8);
  const descBoxH = Math.max(descLines.length * 4 + 6, 14);

  setFill(doc, COLORS.white);
  setDraw(doc, COLORS.border);
  doc.setLineWidth(0.25);
  doc.roundedRect(PAGE.margin, y, PAGE.contentW, descBoxH, 1.5, 1.5, "FD");

  setFill(doc, COLORS.primary);
  doc.rect(PAGE.margin, y, 1.2, descBoxH, "F");

  setText(doc, COLORS.textBody);
  doc.text(descLines, PAGE.margin + 4, y + 5);

  y += descBoxH + 5;

  // ===== SECTION 3: PEOPLE INVOLVED =====
  y = drawSectionHeader(doc, "People Involved", y);

  const student = complaint.student || {};
  const staff = complaint.assignedTo || {};

  const peopleRows = [
    {
      left: { label: "Student Name", value: student.name },
      right: { label: "Assigned Staff", value: staff.name || "Not yet assigned" },
    },
    {
      left: { label: "Student Email", value: student.email },
      right: { label: "Staff Email", value: staff.email },
    },
    {
      left: { label: "Student Phone", value: student.phone },
      right: { label: "Staff Phone", value: staff.phone },
    },
    {
      left: {
        label: "Course & Year",
        value: student.course
          ? `${student.course}${student.year ? ` — Year ${student.year}` : ""}`
          : null,
      },
      right: { label: "Staff Specialization", value: cap(staff.category) },
    },
  ];

  y = drawInfoCard(doc, y, peopleRows);

  // ===== SECTION 4: REJECTION (conditional) =====
  if (complaint.status === "rejected" && complaint.rejectionReason) {
    y = drawSectionHeader(doc, "Rejection Details", y);

    const rejLines = doc.splitTextToSize(complaint.rejectionReason, PAGE.contentW - 8);
    const rejBoxH = rejLines.length * 4 + 6;

    setFill(doc, "#fef2f2");
    setDraw(doc, "#fecaca");
    doc.setLineWidth(0.25);
    doc.roundedRect(PAGE.margin, y, PAGE.contentW, rejBoxH, 1.5, 1.5, "FD");

    setFill(doc, "#dc2626");
    doc.rect(PAGE.margin, y, 1.2, rejBoxH, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, "#991b1b");
    doc.text(rejLines, PAGE.margin + 4, y + 5);

    y += rejBoxH + 5;
  }

  // ===== SECTION 5: DECLARATION =====
  y = drawSectionHeader(doc, "Official Declaration", y);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  setText(doc, COLORS.textMuted);
  const declaration =
    "This document is an officially generated record from the MITM Complaint Management System. " +
    "The information contained herein is confidential and intended solely for authorized personnel of " +
    `${INSTITUTION}. Unauthorized distribution or reproduction is strictly prohibited.`;
  const declLines = doc.splitTextToSize(declaration, PAGE.contentW - 4);
  doc.text(declLines, PAGE.margin, y);
  y += declLines.length * 3 + 6;

  // ===== SECTION 6: SIGNATURES (anchored near bottom) =====
  // Position signatures at fixed distance from footer for consistency
  const sigY = PAGE.contentBottom - 14;

  const sigWidth = 50;
  const sigGap = (PAGE.contentW - sigWidth * 3) / 2;

  const sigPositions = [
    { x: PAGE.margin, label: "Student Signature", sub: "Complainant" },
    { x: PAGE.margin + sigWidth + sigGap, label: "Staff Signature", sub: "Assigned Personnel" },
    { x: PAGE.margin + (sigWidth + sigGap) * 2, label: "Administrator", sub: "MITM Authority" },
  ];

  sigPositions.forEach((sig) => {
    setDraw(doc, COLORS.textLight);
    doc.setLineWidth(0.3);
    doc.line(sig.x, sigY, sig.x + sigWidth, sigY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    setText(doc, COLORS.textDark);
    doc.text(sig.label, sig.x + sigWidth / 2, sigY + 3.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    setText(doc, COLORS.textMuted);
    doc.text(sig.sub, sig.x + sigWidth / 2, sigY + 7, { align: "center" });
  });
};

// ==================== EXPORTS ====================
export const exportSinglePDF = async (complaint) => {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const logoBase64 = await getLogoBase64();

  renderComplaint(doc, complaint, logoBase64);

  const ref = complaint.complaintId || complaint._id;
  drawFooter(doc, 1, 1, ref);

  doc.save(`MITM_Complaint_${ref}.pdf`);
};

export const exportBulkPDF = async (complaints) => {
  if (!complaints.length) return;

  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const logoBase64 = await getLogoBase64();
  const total = complaints.length;

  for (let i = 0; i < complaints.length; i++) {
    if (i > 0) doc.addPage();
    renderComplaint(doc, complaints[i], logoBase64);
    const ref = complaints[i].complaintId || complaints[i]._id;
    drawFooter(doc, i + 1, total, ref);
  }

  doc.save(`MITM_Complaints_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
};