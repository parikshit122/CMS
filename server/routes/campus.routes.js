const express = require("express");
const multer = require("multer");
const router = express.Router();
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  patchInstitutionBranding,
  postCampusBuilding,
  removeCampusBuilding,
  postCampusFloor,
  patchCampusFloor,
  removeCampusFloor,
  postCampusNode,
  removeCampusNode,
  postCampusEdge,
  removeCampusEdge,
  postAcademicDepartment,
  removeAcademicDepartment,
  postAcademicCourse,
  removeAcademicCourse,
} = require("../controllers/campus.controller");

const mapUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB floor-plan image limit
});

// Admin-only Multi-Campus Map Studio, Academic Structure & Blind-Evaluation Mode
router.patch("/branding", authorizeRoles("admin"), patchInstitutionBranding);

router.post("/buildings", authorizeRoles("admin"), postCampusBuilding);
router.delete("/buildings/:id", authorizeRoles("admin"), removeCampusBuilding);

router.post("/floors", authorizeRoles("admin"), mapUpload.single("mapImage"), postCampusFloor);
router.patch("/floors/:id", authorizeRoles("admin"), mapUpload.single("mapImage"), patchCampusFloor);
router.delete("/floors/:id", authorizeRoles("admin"), removeCampusFloor);

router.post("/nodes", authorizeRoles("admin"), postCampusNode);
router.delete("/nodes/:id", authorizeRoles("admin"), removeCampusNode);

router.post("/edges", authorizeRoles("admin"), postCampusEdge);
router.delete("/edges/:id", authorizeRoles("admin"), removeCampusEdge);

router.post("/departments", authorizeRoles("admin"), postAcademicDepartment);
router.delete("/departments/:id", authorizeRoles("admin"), removeAcademicDepartment);

router.post("/courses", authorizeRoles("admin"), postAcademicCourse);
router.delete("/courses/:id", authorizeRoles("admin"), removeAcademicCourse);

module.exports = router;
