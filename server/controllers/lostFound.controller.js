const {
  createLostFoundItem,
  listLostFoundItems,
  getLostFoundItemById,
  createLostFoundClaim,
  getClaimsForItem,
  reviewLostFoundClaim,
  completeLostFoundHandover,
  archiveLostFoundItem,
  getLostFoundSummary,
} = require("../../src/db/lostFound.ts");
const {
  LOST_FOUND_CATEGORIES,
  CUSTODY_TYPES,
  MIN_IDENTIFYING_DETAILS_LENGTH,
  normalizeAnswerText,
  normalizeContactPhone,
} = require("../../src/db/lostFoundRules.ts");
const { uploadToCloudinary } = require("../services/cloudinary.service");
const {
  notifyCampusFoundItemPosted,
  notifyLostFoundClaimSubmitted,
  notifyLostFoundClaimDecision,
  notifyLostFoundHandoverCompleted,
} = require("../services/notification.service");

const getViewer = (req) => ({
  id: Number(req.user.id || req.user._id),
  role: String(req.user.role || "user").toLowerCase(),
});

const tryUploadImage = async (file, folder) => {
  if (!file || !file.buffer) return { url: "", publicId: "" };
  const hasCloudinary =
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET;

  if (hasCloudinary) {
    try {
      const uploaded = await uploadToCloudinary(file.buffer, {
        folder,
        public_id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      });
      return {
        url: uploaded.secure_url || uploaded.url || "",
        publicId: uploaded.public_id || "",
      };
    } catch (err) {
      console.error("[lostFound] Cloudinary upload fallback:", err.message);
    }
  }

  // Safe inline base64 fallback for small preview images when Cloudinary isn't configured
  if (file.size <= 1.5 * 1024 * 1024) {
    const mime = file.mimetype || "image/jpeg";
    return {
      url: `data:${mime};base64,${file.buffer.toString("base64")}`,
      publicId: "",
    };
  }

  return { url: "", publicId: "" };
};

// ── GET /api/lost-found ───────────────────────────────────
const listItems = async (req, res, next) => {
  try {
    const viewer = getViewer(req);
    const { status = "all", category = "all", search = "", scope = "all" } = req.query;

    const [items, summary] = await Promise.all([
      listLostFoundItems({
        viewer,
        status: String(status),
        category: String(category),
        search: String(search),
        scope: String(scope),
      }),
      getLostFoundSummary(viewer),
    ]);

    res.json({
      success: true,
      items,
      summary,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/lost-found/:id ───────────────────────────────
const getItem = async (req, res, next) => {
  try {
    const viewer = getViewer(req);
    const found = await getLostFoundItemById(req.params.id, viewer);
    if (!found) {
      return res.status(404).json({
        success: false,
        message: "Found item not found.",
      });
    }
    res.json({
      success: true,
      item: found.serialized,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/lost-found ──────────────────────────────────
const createItem = async (req, res, next) => {
  try {
    const viewer = getViewer(req);
    const {
      title = "",
      description = "",
      category = "other",
      foundLocation = "",
      foundAt,
      custodyType = "finder",
      custodyLocation = "",
      contactPhone = "",
      blurImagePublicly = true,
      verificationQuestion = "",
      verificationAnswerSecret = "",
      privateNotes = "",
      mapNodeId = null,
    } = req.body;

    const cleanTitle = String(title).trim();
    const cleanDesc = String(description).trim();
    const cleanLoc = String(foundLocation).trim();
    const cleanQ = String(verificationQuestion).trim();
    const cleanA = String(verificationAnswerSecret).trim();
    const cleanCat = String(category).toLowerCase().trim();
    const cleanCustody = String(custodyType).toLowerCase().trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 120) {
      return res.status(400).json({
        success: false,
        message: "Item title must be between 3 and 120 characters.",
      });
    }
    if (cleanDesc.length < 10 || cleanDesc.length > 1200) {
      return res.status(400).json({
        success: false,
        message: "Public description must be between 10 and 1200 characters.",
      });
    }
    if (!LOST_FOUND_CATEGORIES.includes(cleanCat)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item category selected.",
      });
    }
    if (cleanLoc.length < 2 || cleanLoc.length > 160) {
      return res.status(400).json({
        success: false,
        message: "Please provide the campus location where the item was found.",
      });
    }
    if (!CUSTODY_TYPES.includes(cleanCustody)) {
      return res.status(400).json({
        success: false,
        message: "Invalid custody option selected.",
      });
    }
    if (cleanQ.length < 8 || cleanQ.length > 220) {
      return res.status(400).json({
        success: false,
        message:
          "Hidden ownership question must be at least 8 characters so claimants can be verified.",
      });
    }
    if (cleanA.length < 2 || cleanA.length > 160) {
      return res.status(400).json({
        success: false,
        message: "Expected secret answer is required (2–160 characters).",
      });
    }

    // Security guardrail: prevent finder from accidentally leaking the secret answer in the public title/description
    const normSecret = normalizeAnswerText(cleanA);
    const normPublic = normalizeAnswerText(`${cleanTitle} ${cleanDesc}`);
    if (normSecret.length >= 4 && normPublic.includes(normSecret)) {
      return res.status(400).json({
        success: false,
        message:
          "Security warning: Your secret answer appears inside the public title or description. Remove it from public text so impostors cannot copy it.",
      });
    }

    let parsedFoundAt = new Date();
    if (foundAt) {
      const candidate = new Date(foundAt);
      if (!Number.isNaN(candidate.getTime())) {
        parsedFoundAt = candidate;
      }
    }

    const parsedContactPhone = normalizeContactPhone(contactPhone);
    if (!parsedContactPhone.valid) {
      return res.status(400).json({
        success: false,
        message: parsedContactPhone.reason || "Invalid contact phone number.",
      });
    }

    const uploaded = await tryUploadImage(req.file, "complaint-sync/lost-found");
    const shouldBlur =
      blurImagePublicly === false || blurImagePublicly === "false" ? false : true;

    const item = await createLostFoundItem({
      title: cleanTitle,
      description: cleanDesc,
      category: cleanCat,
      foundLocation: cleanLoc,
      foundAt: parsedFoundAt,
      custodyType: cleanCustody,
      custodyLocation: String(custodyLocation || "").trim().slice(0, 180),
      contactPhone: parsedContactPhone.normalized,
      imageUrl: uploaded.url,
      imagePublicId: uploaded.publicId,
      blurImagePublicly: shouldBlur,
      verificationQuestion: cleanQ,
      verificationAnswerSecret: cleanA,
      privateNotes: String(privateNotes || "").trim().slice(0, 800),
      mapNodeId: mapNodeId || null,
      finderId: viewer.id,
    });

    // Notify everyone across the college (non-blocking)
    const notifiedCount = await notifyCampusFoundItemPosted(
      item,
      req.user,
      req.app
    ).catch((err) => {
      console.error("[lostFound] Campus broadcast failed:", err.message);
      return 0;
    });

    res.status(201).json({
      success: true,
      message: `Found item posted (${item.itemCode}) and campus notified!`,
      item,
      notifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/lost-found/:id/claims ───────────────────────
const submitClaim = async (req, res, next) => {
  try {
    const viewer = getViewer(req);
    const {
      verificationAnswer = "",
      identifyingDetails = "",
      lostLocation = "",
      claimantPhone = "",
      honestyPledgeAccepted,
    } = req.body;

    const pledgeAccepted =
      honestyPledgeAccepted === true || honestyPledgeAccepted === "true";

    if (!pledgeAccepted) {
      return res.status(400).json({
        success: false,
        message:
          "You must accept the Campus Honesty Pledge confirming this item genuinely belongs to you.",
      });
    }

    const cleanAnswer = String(verificationAnswer).trim();
    const cleanDetails = String(identifyingDetails).trim();

    if (cleanAnswer.length < 2 || cleanAnswer.length > 260) {
      return res.status(400).json({
        success: false,
        message: "Please answer the finder's hidden ownership verification question.",
      });
    }

    if (cleanDetails.length < MIN_IDENTIFYING_DETAILS_LENGTH || cleanDetails.length > 1500) {
      return res.status(400).json({
        success: false,
        message: `Please provide at least ${MIN_IDENTIFYING_DETAILS_LENGTH} characters of unique proof (scratches, serial number, contents, or exact details).`,
      });
    }

    const parsedClaimantPhone = normalizeContactPhone(claimantPhone);
    if (!parsedClaimantPhone.valid) {
      return res.status(400).json({
        success: false,
        message: parsedClaimantPhone.reason || "Invalid phone/WhatsApp number.",
      });
    }

    const uploadedProof = await tryUploadImage(
      req.file,
      "complaint-sync/lost-found-proofs"
    );

    const result = await createLostFoundClaim({
      itemId: req.params.id,
      claimantId: viewer.id,
      verificationAnswer: cleanAnswer,
      identifyingDetails: cleanDetails,
      lostLocation: String(lostLocation || "").trim().slice(0, 160),
      claimantPhone: parsedClaimantPhone.normalized,
      proofImageUrl: uploadedProof.url,
      proofImagePublicId: uploadedProof.publicId,
      honestyPledgeAccepted: true,
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        code: result.error.code,
        message: result.error.message,
      });
    }

    await notifyLostFoundClaimSubmitted(result.item, req.user, req.app).catch((err) =>
      console.error("[lostFound] Claim notification failed:", err.message)
    );

    res.status(201).json({
      success: true,
      message:
        "Ownership appeal submitted securely for review. You will be notified once verified.",
      claim: result.claim,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/lost-found/:id/claims ────────────────────────
const getItemClaims = async (req, res, next) => {
  try {
    const viewer = getViewer(req);
    const data = await getClaimsForItem(req.params.id, viewer);
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Found item not found.",
      });
    }
    res.json({
      success: true,
      ...data,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/lost-found/claims/:claimId/review ──────────
const reviewClaim = async (req, res, next) => {
  try {
    const viewer = getViewer(req);
    const { decision, reviewNote = "" } = req.body;

    if (!["approve", "reject", "flag_fraud"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be 'approve', 'reject', or 'flag_fraud'.",
      });
    }

    const cleanNote = String(reviewNote || "").trim();
    if ((decision === "reject" || decision === "flag_fraud") && cleanNote.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide a clear reason (at least 6 characters) when rejecting or flagging a claim.",
      });
    }

    const result = await reviewLostFoundClaim({
      claimId: req.params.claimId,
      reviewer: viewer,
      decision,
      reviewNote: cleanNote,
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    await notifyLostFoundClaimDecision({
      decision: result.decision,
      item: result.item,
      claim: result.claim,
      reviewer: req.user,
      handoverCode: result.handoverCode,
      claimantFraudStrikes: result.claimantFraudStrikes || 0,
      reviewNote: cleanNote,
      app: req.app,
    }).catch((err) =>
      console.error("[lostFound] Review decision notification failed:", err.message)
    );

    const successMsg =
      decision === "approve"
        ? "Claim approved! A secure 6-character Handover Pickup Code was issued to the verified owner."
        : decision === "flag_fraud"
          ? "Claim flagged as fraudulent. A strike was recorded and Campus Admins have been alerted."
          : "Claim rejected and claimant has been notified.";

    res.json({
      success: true,
      message: successMsg,
      decision,
      claimantFraudStrikes: result.claimantFraudStrikes || 0,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/lost-found/:id/handover ─────────────────────
const confirmHandover = async (req, res, next) => {
  try {
    const viewer = getViewer(req);
    const { handoverCode = "" } = req.body;

    if (!String(handoverCode).trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter the 6-character Handover Pickup Code shown by the owner.",
      });
    }

    const result = await completeLostFoundHandover({
      itemId: req.params.id,
      verifier: viewer,
      handoverCode: String(handoverCode).trim(),
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    await notifyLostFoundHandoverCompleted(
      result.item,
      result.approvedClaim,
      req.user,
      req.app
    ).catch((err) =>
      console.error("[lostFound] Handover notification failed:", err.message)
    );

    res.json({
      success: true,
      message: "Pickup code verified! Item has been marked as returned.",
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/lost-found/:id ────────────────────────────
const removeItem = async (req, res, next) => {
  try {
    const viewer = getViewer(req);
    const result = await archiveLostFoundItem(req.params.id, viewer);
    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }
    res.json({
      success: true,
      message: "Lost & Found listing archived.",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listItems,
  getItem,
  createItem,
  submitClaim,
  getItemClaims,
  reviewClaim,
  confirmHandover,
  removeItem,
};
