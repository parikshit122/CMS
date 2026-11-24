const express = require("express");
const router = express.Router();
const { upload } = require("../middlewares/upload.middleware");
const {
  listItems,
  getItem,
  createItem,
  submitClaim,
  getItemClaims,
  reviewClaim,
  confirmHandover,
  removeItem,
} = require("../controllers/lostFound.controller");

// All routes here are already protected by auth + maintenance middlewares in server/routes/index.js
router.get("/", listItems);
router.post("/", upload.single("image"), createItem);
router.get("/:id", getItem);
router.delete("/:id", removeItem);

// Anti-fraud claim appeals & review
router.get("/:id/claims", getItemClaims);
router.post("/:id/claims", upload.single("proofImage"), submitClaim);
router.patch("/claims/:claimId/review", reviewClaim);

// Two-factor physical pickup code confirmation
router.post("/:id/handover", confirmHandover);

module.exports = router;
