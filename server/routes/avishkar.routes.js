const express = require("express");
const multer = require("multer");
const router = express.Router();
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  aiTriageComplaint,
  aiTranscribeVoice,
  getAdminQrSpots,
  createAdminQrSpot,
  updateAdminQrSpot,
  deleteAdminQrSpot,
  triggerSlaEscalation,
  getNaacAuditReport,
  resetDemoDataset,
} = require("../controllers/avishkar.controller");

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("audio/")) {
      return cb(null, true);
    }
    cb(new Error("Only audio recordings are allowed for voice transcription."));
  },
});

// AI Smart Triage & Voice Transcription (Student / Staff / Admin)
router.post("/triage", authorizeRoles("user", "staff", "admin"), aiTriageComplaint);
router.post(
  "/transcribe",
  authorizeRoles("user", "staff", "admin"),
  (req, res, next) => {
    audioUpload.single("audio")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  aiTranscribeVoice
);

// Admin QR Campus Spot Studio
router.get("/qr-spots", authorizeRoles("admin"), getAdminQrSpots);
router.post("/qr-spots", authorizeRoles("admin"), createAdminQrSpot);
router.patch("/qr-spots/:id", authorizeRoles("admin"), updateAdminQrSpot);
router.delete("/qr-spots/:id", authorizeRoles("admin"), deleteAdminQrSpot);

// Admin Auto-Escalation, NAAC Audit & Demo Dataset Reset
router.post("/escalate/run", authorizeRoles("admin"), triggerSlaEscalation);
router.get("/naac-report", authorizeRoles("admin"), getNaacAuditReport);
router.post("/demo/reset", authorizeRoles("admin"), resetDemoDataset);

module.exports = router;
