const {
  getCampusNavigationBundle,
  getAcademicStructure,
  getInstitutionBranding,
  updateInstitutionBranding,
  createCampusBuilding,
  deleteCampusBuilding,
  createCampusFloor,
  updateCampusFloor,
  deleteCampusFloor,
  createCampusNode,
  updateCampusNode,
  deleteCampusNode,
  createCampusEdge,
  updateCampusEdge,
  deleteCampusEdge,
  createAcademicDepartment,
  deleteAcademicDepartment,
  createAcademicCourse,
  deleteAcademicCourse,
} = require("../../src/db/campus.ts");
const {
  validateBlueprintBuffer,
  validateBlueprintUrl,
} = require("../../src/lib/blueprint-media.ts");
const { uploadBufferToCloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

function parseOptionalBoolean(val) {
  if (typeof val === "boolean") return val;
  if (val === "true") return true;
  if (val === "false") return false;
  return undefined;
}

async function resolveUploadedMapImage(file, fallbackUrl = "") {
  if (!file || !file.buffer) {
    const checked = validateBlueprintUrl(fallbackUrl);
    if (!checked.valid) {
      const err = new Error(checked.error || "Invalid blueprint URL.");
      err.statusCode = 400;
      throw err;
    }
    return checked.url;
  }

  const check = validateBlueprintBuffer(file.buffer, file.mimetype);
  if (!check.valid || !check.mime) {
    const err = new Error(
      check.error || "Blueprint must be a valid PNG, JPG, or WebP image (max 5 MB)."
    );
    err.statusCode = 400;
    throw err;
  }

  // Prefer Cloudinary for raster blueprints if configured; otherwise store verified raster data URI
  if (isCloudinaryConfigured) {
    try {
      const uploaded = await uploadBufferToCloudinary(
        file.buffer,
        "complaint-sync/campus-maps"
      );
      if (uploaded?.url) return uploaded.url;
    } catch (err) {
      console.error("[campus] Cloudinary floor-plan fallback:", err.message);
    }
  }

  return `data:${check.mime};base64,${file.buffer.toString("base64")}`;
}

// ── Public / Optional-Auth Endpoints ──────────────────────

const getPublicCampusNavigation = async (req, res) => {
  try {
    const data = await getCampusNavigationBundle({
      viewerUser: req.user || null,
      includeUnredacted: false,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getAdminCampusStudioBundle = async (req, res) => {
  try {
    const data = await getCampusNavigationBundle({
      viewerUser: req.user,
      includeUnredacted: true,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPublicAcademicStructure = async (req, res) => {
  try {
    const data = await getAcademicStructure();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getPublicBranding = async (req, res) => {
  try {
    const data = await getInstitutionBranding();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin Branding & Avishkar Blind-Evaluation Mode ───────

const patchInstitutionBranding = async (req, res) => {
  try {
    const { blindEvaluationMode, siteName, siteTagline, institutionCode, allowedDomain } =
      req.body || {};
    const data = await updateInstitutionBranding({
      blindEvaluationMode,
      siteName,
      siteTagline,
      institutionCode,
      allowedDomain,
    });
    res.json({
      success: true,
      message: data.blindEvaluationMode
        ? "Avishkar Blind-Evaluation Mode enabled — college identifiers are masked."
        : `Institution branding active for ${data.institutionName}.`,
      data,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Admin Campus Buildings ────────────────────────────────

const postCampusBuilding = async (req, res) => {
  try {
    const created = await createCampusBuilding(req.body || {});
    res.status(201).json({
      success: true,
      message: `Building "${created.name}" added to campus map.`,
      data: created,
    });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return res.status(409).json({
        success: false,
        message: "A campus building with that code already exists.",
      });
    }
    res.status(400).json({ success: false, message: msg });
  }
};

const removeCampusBuilding = async (req, res) => {
  try {
    const deleted = await deleteCampusBuilding(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Building not found." });
    }
    res.json({ success: true, message: `Deleted building ${deleted.name}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin Campus Floors, Blueprints & Floor Policies ──────

const postCampusFloor = async (req, res) => {
  try {
    const mapImageUrl = await resolveUploadedMapImage(req.file, req.body?.mapImageUrl);
    const created = await createCampusFloor({
      buildingId: req.body?.buildingId || null,
      floorNumber: req.body?.floorNumber !== undefined ? Number(req.body.floorNumber) : 0,
      floorLabel: req.body?.floorLabel,
      mapImageUrl,
      widthMeters: req.body?.widthMeters ? Number(req.body.widthMeters) : 60,
      heightMeters: req.body?.heightMeters ? Number(req.body.heightMeters) : 42,
      isOutdoor: req.body?.isOutdoor === true || req.body?.isOutdoor === "true",
      accessLevel: req.body?.accessLevel,
      isSensitive: parseOptionalBoolean(req.body?.isSensitive),
      restrictedNotice: req.body?.restrictedNotice,
    });
    res.status(201).json({
      success: true,
      message: `Blueprint "${created.floorLabel}" uploaded and ready for mapping.`,
      data: created,
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

const patchCampusFloor = async (req, res) => {
  try {
    const resetBlueprint =
      req.body?.resetBlueprint === true || req.body?.resetBlueprint === "true";

    let mapImageUrl;
    if (req.file) {
      mapImageUrl = await resolveUploadedMapImage(req.file);
    } else if (!resetBlueprint && req.body?.mapImageUrl !== undefined) {
      mapImageUrl = await resolveUploadedMapImage(null, req.body.mapImageUrl);
    }

    const updated = await updateCampusFloor(req.params.id, {
      floorLabel: req.body?.floorLabel,
      mapImageUrl,
      clearMapImage: resetBlueprint,
      widthMeters:
        req.body?.widthMeters !== undefined && req.body?.widthMeters !== ""
          ? Number(req.body.widthMeters)
          : undefined,
      heightMeters:
        req.body?.heightMeters !== undefined && req.body?.heightMeters !== ""
          ? Number(req.body.heightMeters)
          : undefined,
      accessLevel: req.body?.accessLevel,
      isSensitive: parseOptionalBoolean(req.body?.isSensitive),
      restrictedNotice: req.body?.restrictedNotice,
    });
    if (!updated) {
      return res.status(404).json({ success: false, message: "Floor plan not found." });
    }
    res.json({
      success: true,
      message: resetBlueprint
        ? `Blueprint reset to default coordinate grid for "${updated.floorLabel}".`
        : req.file
          ? `Blueprint replaced for "${updated.floorLabel}".`
          : `Floor settings and security policy updated for "${updated.floorLabel}".`,
      data: updated,
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

const removeCampusFloor = async (req, res) => {
  try {
    const deleted = await deleteCampusFloor(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Floor plan not found." });
    }
    res.json({ success: true, message: `Deleted floor plan "${deleted.floorLabel}".` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin Map Nodes & Walkable Edges (with Access Policies) ─

const postCampusNode = async (req, res) => {
  try {
    const created = await createCampusNode(req.body || {});
    res.status(201).json({
      success: true,
      message: `Pinned "${created.label}" on floor blueprint.`,
      data: created,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const patchCampusNode = async (req, res) => {
  try {
    const updated = await updateCampusNode(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ success: false, message: "Map node not found." });
    }
    res.json({
      success: true,
      message: `Updated access policy & details for "${updated.label}".`,
      data: updated,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const removeCampusNode = async (req, res) => {
  try {
    const deleted = await deleteCampusNode(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Map node not found." });
    }
    res.json({ success: true, message: `Removed node "${deleted.label}".` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const postCampusEdge = async (req, res) => {
  try {
    const created = await createCampusEdge(req.body || {});
    res.status(201).json({
      success: true,
      message: `Connected walkway (${created.distanceMeters}m, ${created.edgeType}).`,
      data: created,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const patchCampusEdge = async (req, res) => {
  try {
    const updated = await updateCampusEdge(req.params.id, req.body || {});
    if (!updated) {
      return res.status(404).json({ success: false, message: "Walkway connection not found." });
    }
    res.json({
      success: true,
      message: "Walkway access policy updated.",
      data: updated,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const removeCampusEdge = async (req, res) => {
  try {
    const deleted = await deleteCampusEdge(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Walkway connection not found." });
    }
    res.json({ success: true, message: "Walkway connection removed." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin Academic Departments & Courses ──────────────────

const postAcademicDepartment = async (req, res) => {
  try {
    const created = await createAcademicDepartment(req.body || {});
    res.status(201).json({
      success: true,
      message: `Department "${created.name}" created.`,
      data: created,
    });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return res.status(409).json({
        success: false,
        message: "A department with that code already exists.",
      });
    }
    res.status(400).json({ success: false, message: msg });
  }
};

const removeAcademicDepartment = async (req, res) => {
  try {
    const deleted = await deleteAcademicDepartment(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Department not found." });
    }
    res.json({ success: true, message: `Deleted department ${deleted.name}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const postAcademicCourse = async (req, res) => {
  try {
    const created = await createAcademicCourse(req.body || {});
    res.status(201).json({
      success: true,
      message: `Course "${created.name}" added.`,
      data: created,
    });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return res.status(409).json({
        success: false,
        message: "A course with that code already exists.",
      });
    }
    res.status(400).json({ success: false, message: msg });
  }
};

const removeAcademicCourse = async (req, res) => {
  try {
    const deleted = await deleteAcademicCourse(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }
    res.json({ success: true, message: `Deleted course ${deleted.name}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPublicCampusNavigation,
  getAdminCampusStudioBundle,
  getPublicAcademicStructure,
  getPublicBranding,
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
};
