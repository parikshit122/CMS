const {
  listQrSpots,
  findQrSpotByCode,
  createQrSpot,
  updateQrSpotById,
  deleteQrSpotById,
  getRecentOpenComplaintsForMatching,
  endorseExistingComplaint,
  getPublicTransparencyStats,
  trackComplaintPublicly,
  getNaacAuditReportData,
  seedOrResetDemoCampusData,
} = require("../../src/db/avishkar.ts");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { triageComplaintWithAI, transcribeVoiceAudio } = require("../services/ai.service");
const { runSlaEscalationSweep } = require("../services/escalation.service");
const { isValidId } = require("../../src/db/users.ts");
const { getInstitutionBranding } = require("../../src/db/campus.ts");
const { maskInstitutionText } = require("../../src/lib/campus-navigation.ts");

// ── Public Transparency & SLA Leaderboard ─────────────────

const getPublicTransparency = async (req, res) => {
  try {
    const data = await getPublicTransparencyStats();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const trackPublicComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const cleaned = String(complaintId || "").trim();
    if (!cleaned || cleaned.length < 4) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid complaint reference ID (e.g. CMP-2026-0001).",
      });
    }
    const masked = await trackComplaintPublicly(cleaned);
    if (!masked) {
      return res.status(404).json({
        success: false,
        message: `No complaint found matching reference ID "${cleaned.toUpperCase()}".`,
      });
    }
    res.json({ success: true, data: masked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resolvePublicQrSpot = async (req, res) => {
  try {
    const { spotCode } = req.params;
    const trackScan = req.query.track !== "false";
    const spot = await findQrSpotByCode(spotCode, trackScan);
    if (!spot) {
      return res.status(404).json({
        success: false,
        message: "Campus QR spot not found or currently inactive.",
      });
    }
    res.json({ success: true, data: spot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── One-Click Avishkar Judge Demo Session ─────────────────

const judgeDemoLogin = async (req, res) => {
  try {
    const roleKey = String(req.body?.role || "student").toLowerCase().trim();
    if (!["student", "staff", "admin"].includes(roleKey)) {
      return res.status(400).json({
        success: false,
        message: "Demo role must be one of: student, staff, or admin.",
      });
    }

    const { demoUsers } = await seedOrResetDemoCampusData(false);
    const targetUser = demoUsers[roleKey];
    if (!targetUser) {
      return res.status(500).json({
        success: false,
        message: "Failed to initialize demo role account.",
      });
    }

    const accessToken = generateAccessToken(targetUser.id);
    const refreshToken = generateRefreshToken(targetUser.id);
    const branding = await getInstitutionBranding();
    const blind = branding.blindEvaluationMode;

    res.json({
      success: true,
      message: `Switched to Judge Demo (${roleKey.toUpperCase()}) mode.`,
      accessToken,
      refreshToken,
      user: {
        _id: String(targetUser.id),
        id: targetUser.id,
        name: blind ? branding.demoLabels[roleKey] : targetUser.name,
        email: blind ? maskInstitutionText(targetUser.email, true) : targetUser.email,
        role: targetUser.role,
        avatar: targetUser.avatar || "",
        bio: targetUser.bio || "",
        course: targetUser.course || "",
        year: targetUser.year || "",
        category: targetUser.category || null,
        provider: targetUser.provider,
        isEmailVerified: true,
        isDemo: true,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Server-Side Gemini AI Smart Triage & Voice Transcription ─

const aiTriageComplaint = async (req, res) => {
  try {
    const { title, description, location, language } = req.body || {};
    const openComplaints = await getRecentOpenComplaintsForMatching(30);

    const analysis = await triageComplaintWithAI({
      title,
      description,
      location,
      language: ["en", "mr", "hi"].includes(language) ? language : "en",
      openComplaints,
    });

    res.json({ success: true, data: analysis });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      message: err.message || "AI triage analysis failed.",
    });
  }
};

const aiTranscribeVoice = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Audio file is required for transcription.",
      });
    }
    const language = ["en", "mr", "hi"].includes(req.body?.language)
      ? req.body.language
      : "en";

    const result = await transcribeVoiceAudio({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype || "audio/webm",
      language,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      message: err.message || "Voice transcription failed.",
    });
  }
};

// ── Duplicate Endorsement ("I Have This Issue Too +1") ────

const endorseComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid complaint ID." });
    }

    const result = await endorseExistingComplaint(id, req.user.id, req.user.name);
    if (!result.found) {
      return res.status(404).json({ success: false, message: "Complaint not found." });
    }
    if (result.closed) {
      return res.status(400).json({
        success: false,
        message: "This complaint is already closed and cannot be endorsed.",
      });
    }

    const io = req.app.get("io");
    if (io && !result.alreadyEndorsed) {
      io.to("role:admin").emit("complaint:endorsed", {
        complaintId: result.complaint.complaintId,
        endorsementCount: result.complaint.endorsementCount,
      });
    }

    res.json({
      success: true,
      alreadyEndorsed: Boolean(result.alreadyEndorsed),
      message: result.alreadyEndorsed
        ? `You are already linked to ${result.complaint.complaintId} (${result.complaint.endorsementCount} students affected).`
        : `Endorsed ${result.complaint.complaintId} — duplicate avoided! (${result.complaint.endorsementCount} students affected)`,
      data: {
        id: result.complaint.id,
        complaintId: result.complaint.complaintId,
        endorsementCount: result.complaint.endorsementCount,
        priority: result.complaint.priority,
        status: result.complaint.status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin QR Campus Spot Studio ───────────────────────────

const getAdminQrSpots = async (req, res) => {
  try {
    const spots = await listQrSpots();
    res.json({ success: true, data: spots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createAdminQrSpot = async (req, res) => {
  try {
    const { spotCode, label, building, floor, locationId, defaultCategory } = req.body || {};
    if (!spotCode || !label || !building || !locationId) {
      return res.status(400).json({
        success: false,
        message: "Spot code, label, building, and campus location are required.",
      });
    }
    const created = await createQrSpot({
      spotCode,
      label,
      building,
      floor,
      locationId,
      defaultCategory,
      createdById: req.user.id,
    });
    res.status(201).json({
      success: true,
      message: `Campus QR spot ${created.spotCode} created.`,
      data: created,
    });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return res.status(409).json({
        success: false,
        message: "A QR spot with that code already exists.",
      });
    }
    res.status(400).json({ success: false, message: msg || "Failed to create QR spot." });
  }
};

const updateAdminQrSpot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid QR spot ID." });
    }
    const { label, building, floor, locationId, defaultCategory, isActive } = req.body || {};
    const updates = {};
    if (typeof label === "string" && label.trim()) updates.label = label.trim();
    if (typeof building === "string" && building.trim()) updates.building = building.trim();
    if (typeof floor === "string" && floor.trim()) updates.floor = floor.trim();
    if (typeof locationId === "string" && locationId.trim()) updates.locationId = locationId.trim();
    if (typeof defaultCategory === "string" && defaultCategory.trim()) {
      updates.defaultCategory = defaultCategory.toLowerCase().trim();
    }
    if (typeof isActive === "boolean") updates.isActive = isActive;

    const updated = await updateQrSpotById(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: "QR spot not found." });
    }
    res.json({ success: true, message: "QR spot updated.", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteAdminQrSpot = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, message: "Invalid QR spot ID." });
    }
    const deleted = await deleteQrSpotById(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "QR spot not found." });
    }
    res.json({ success: true, message: `QR spot ${deleted.spotCode} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin Auto-Escalation Trigger, NAAC Audit & Demo Reset ─

const triggerSlaEscalation = async (req, res) => {
  try {
    const result = await runSlaEscalationSweep(req.app);
    res.json({
      success: true,
      message:
        result.escalatedCount > 0
          ? `Escalated ${result.escalatedCount} overdue/at-risk complaint(s) across ${result.scannedCount} active tickets.`
          : `Checked ${result.scannedCount} active complaints — all escalations are up to date.`,
      data: {
        scannedCount: result.scannedCount,
        escalatedCount: result.escalatedCount,
        escalated: result.escalated.map((e) => ({
          complaintId: e.complaint.complaintId,
          title: e.complaint.title,
          previousLevel: e.previousLevel,
          newLevel: e.newLevel,
          reason: e.reason,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getNaacAuditReport = async (req, res) => {
  try {
    const rawRange = String(req.query.range || "all").toLowerCase();
    const range = ["30d", "semester", "all"].includes(rawRange) ? rawRange : "all";
    const data = await getNaacAuditReportData(range);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const resetDemoDataset = async (req, res) => {
  try {
    const result = await seedOrResetDemoCampusData(true);
    res.json({
      success: true,
      message: `Loaded ${result.count} campus sample complaints, ${result.qrSpotCount} QR spots, floor maps, courses & Lost & Found items.`,
      data: {
        complaintsSeeded: result.count,
        qrSpotsSeeded: result.qrSpotCount,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPublicTransparency,
  trackPublicComplaint,
  resolvePublicQrSpot,
  judgeDemoLogin,
  aiTriageComplaint,
  aiTranscribeVoice,
  endorseComplaint,
  getAdminQrSpots,
  createAdminQrSpot,
  updateAdminQrSpot,
  deleteAdminQrSpot,
  triggerSlaEscalation,
  getNaacAuditReport,
  resetDemoDataset,
};
