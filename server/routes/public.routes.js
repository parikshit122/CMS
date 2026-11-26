const express = require("express");
const router = express.Router();
const {
  getPublicTransparency,
  trackPublicComplaint,
  resolvePublicQrSpot,
  judgeDemoLogin,
} = require("../controllers/avishkar.controller");
const {
  getPublicCampusNavigation,
  getPublicAcademicStructure,
  getPublicBranding,
} = require("../controllers/campus.controller");

// Open institutional transparency, campus navigation, academic structure, QR resolver & Judge Demo
router.get("/transparency", getPublicTransparency);
router.get("/track/:complaintId", trackPublicComplaint);
router.get("/qr-spots/:spotCode", resolvePublicQrSpot);
router.get("/campus-navigation", getPublicCampusNavigation);
router.get("/academic-structure", getPublicAcademicStructure);
router.get("/branding", getPublicBranding);
router.post("/demo-login", judgeDemoLogin);

module.exports = router;

