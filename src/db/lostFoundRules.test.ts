import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnswerText,
  scoreVerificationAnswer,
  evaluateClaimEligibility,
  generateHandoverCode,
  hashHandoverCode,
  verifyHandoverCode,
  normalizeContactPhone,
  buildLostFoundContactLinks,
  MAX_CLAIM_ATTEMPTS_PER_ITEM,
  FRAUD_STRIKE_BLOCK_THRESHOLD,
} from "./lostFoundRules.ts";

test("normalizes verification answers consistently", () => {
  assert.equal(normalizeAnswerText("  Blue Pokémon-Sticker!!  "), "blue pokemon sticker");
  assert.equal(normalizeAnswerText("Last 4 digits: 9042"), "last 4 digits 9042");
});

test("scores exact, partial, and mismatched verification answers accurately", () => {
  const exact = scoreVerificationAnswer("Pikachu sticker inside lid", "pikachu sticker inside lid!");
  assert.equal(exact.score, 100);
  assert.equal(exact.level, "high");

  const high = scoreVerificationAnswer("cracked bottom right corner", "It has a cracked bottom right corner");
  assert.equal(high.level, "high");
  assert.ok(high.score >= 75);

  const partial = scoreVerificationAnswer("blue keychain dragon charm", "blue keychain");
  assert.equal(partial.level, "partial");
  assert.ok(partial.score >= 40 && partial.score < 75);

  const mismatch = scoreVerificationAnswer("silver engraved initials RK", "black leather wallet with cash");
  assert.equal(mismatch.level, "low");
  assert.ok(mismatch.score < 40);
});

test("blocks self-claims, closed items, attempt exhaustion, and repeat fraud offenders", () => {
  const selfRes = evaluateClaimEligibility({
    userId: 10,
    finderId: 10,
    itemStatus: "open",
    priorAttempts: 0,
    hasPendingClaim: false,
    userFraudStrikes: 0,
  });
  assert.equal(selfRes.allowed, false);
  assert.equal(selfRes.code, "SELF_CLAIM");

  const closedRes = evaluateClaimEligibility({
    userId: 12,
    finderId: 10,
    itemStatus: "approved",
    priorAttempts: 0,
    hasPendingClaim: false,
    userFraudStrikes: 0,
  });
  assert.equal(closedRes.allowed, false);
  assert.equal(closedRes.code, "ITEM_CLOSED");

  const fraudBlocked = evaluateClaimEligibility({
    userId: 12,
    finderId: 10,
    itemStatus: "open",
    priorAttempts: 0,
    hasPendingClaim: false,
    userFraudStrikes: FRAUD_STRIKE_BLOCK_THRESHOLD,
  });
  assert.equal(fraudBlocked.allowed, false);
  assert.equal(fraudBlocked.code, "FRAUD_BLOCKED");

  const pendingRes = evaluateClaimEligibility({
    userId: 12,
    finderId: 10,
    itemStatus: "claim_pending",
    priorAttempts: 1,
    hasPendingClaim: true,
    userFraudStrikes: 0,
  });
  assert.equal(pendingRes.allowed, false);
  assert.equal(pendingRes.code, "PENDING_CLAIM_EXISTS");

  const exhaustedRes = evaluateClaimEligibility({
    userId: 12,
    finderId: 10,
    itemStatus: "open",
    priorAttempts: MAX_CLAIM_ATTEMPTS_PER_ITEM,
    hasPendingClaim: false,
    userFraudStrikes: 1,
  });
  assert.equal(exhaustedRes.allowed, false);
  assert.equal(exhaustedRes.code, "ATTEMPT_LIMIT_REACHED");
  assert.equal(exhaustedRes.remainingAttempts, 0);

  const okRes = evaluateClaimEligibility({
    userId: 12,
    finderId: 10,
    itemStatus: "open",
    priorAttempts: 1,
    hasPendingClaim: false,
    userFraudStrikes: 1,
  });
  assert.equal(okRes.allowed, true);
  assert.equal(okRes.remainingAttempts, 1);
});

test("generates and verifies cryptographic handover pickup codes", () => {
  const code = generateHandoverCode();
  assert.match(code, /^LF-[2-9A-HJ-KM-NP-Z]{6}$/);

  const hashed = hashHandoverCode(code);
  assert.equal(verifyHandoverCode(code, hashed), true);
  assert.equal(verifyHandoverCode(code.toLowerCase().replace("-", ""), hashed), true);
  assert.equal(verifyHandoverCode("LF-WRONG1", hashed), false);
  assert.equal(verifyHandoverCode("", hashed), false);
});

test("normalizes optional contact phone numbers and rejects invalid/unsafe values", () => {
  assert.deepEqual(normalizeContactPhone(""), { valid: true, normalized: "", digits: "" });
  assert.deepEqual(normalizeContactPhone("98765 43210"), {
    valid: true,
    normalized: "9876543210",
    digits: "9876543210",
  });
  assert.deepEqual(normalizeContactPhone("+91-98765-43210"), {
    valid: true,
    normalized: "+919876543210",
    digits: "919876543210",
  });
  assert.equal(normalizeContactPhone("12345").valid, false);
  assert.equal(normalizeContactPhone("javascript:alert(1)").valid, false);
});

test("builds safe tel: and WhatsApp reminder links for local and international numbers", () => {
  const localLinks = buildLostFoundContactLinks(
    "9876543210",
    "Hi Aarav, please collect your Calculator (LF-2026-0001)."
  );
  assert.ok(localLinks);
  assert.equal(localLinks.displayPhone, "+91 98765 43210");
  assert.equal(localLinks.telHref, "tel:+919876543210");
  assert.equal(
    localLinks.whatsappHref,
    "https://wa.me/919876543210?text=Hi%20Aarav%2C%20please%20collect%20your%20Calculator%20(LF-2026-0001)."
  );

  const intlLinks = buildLostFoundContactLinks("+1 415 555 0199", "Pickup ready");
  assert.ok(intlLinks);
  assert.equal(intlLinks.telHref, "tel:+14155550199");
  assert.equal(intlLinks.whatsappHref, "https://wa.me/14155550199?text=Pickup%20ready");

  assert.equal(buildLostFoundContactLinks("", "Reminder"), null);
  assert.equal(buildLostFoundContactLinks("invalid-phone", "Reminder"), null);
});

