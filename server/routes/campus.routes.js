const express = require("express");
const multer = require("multer");
const router = express.Router();
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  getAdminCampusStudioBundle,
  patchInstitutionBranding,
  postCampusBuilding,
  removeCampusBuilding,
  postCampusFloor,
  patchCampusFloor,
  removeCampusFloor,
  postCampusNode,
  patchCampusNode,
  removeCampusNode,
  postCampusEdge,
  patchCampusEdge,
  removeCampusEdge,
  postAcademicDepartment,
  removeAcademicDepartment,
  postAcademicCourse,
  removeAcademicCourse,
} = require("../controllers/campus.controller");

const mapUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB raster blueprint limit
});

// Admin-only Multi-Campus Blueprint Studio, Security Policies, Academic Structure & Blind-Evaluation Mode
router.get("/studio-bundle", authorizeRoles("admin"), getAdminCampusStudioBundle);
router.patch("/branding", authorizeRoles("admin"), patchInstitutionBranding);

router.post("/buildings", authorizeRoles("admin"), postCampusBuilding);
router.delete("/buildings/:id", authorizeRoles("admin"), removeCampusBuilding);

router.post("/floors", authorizeRoles("admin"), mapUpload.single("mapImage"), postCampusFloor);
router.patch("/floors/:id", authorizeRoles("admin"), mapUpload.single("mapImage"), patchCampusFloor);
router.delete("/floors/:id", authorizeRoles("admin"), removeCampusFloor);

router.post("/nodes", authorizeRoles("admin"), postCampusNode);
router.patch("/nodes/:id", authorizeRoles("admin"), patchCampusNode);
router.delete("/nodes/:id", authorizeRoles("admin"), removeCampusNode);

router.post("/edges", authorizeRoles("admin"), postCampusEdge);
router.patch("/edges/:id", authorizeRoles("admin"), patchCampusEdge);
router.delete("/edges/:id", authorizeRoles("admin"), removeCampusEdge);

router.post("/departments", authorizeRoles("admin"), postAcademicDepartment);
router.delete("/departments/:id", authorizeRoles("admin"), removeAcademicDepartment);

router.post("/courses", authorizeRoles("admin"), postAcademicCourse);
router.delete("/courses/:id", authorizeRoles("admin"), removeAcademicCourse);

module.exports = router;
