import crypto from "crypto";

export const LOST_FOUND_CATEGORIES = [
  "electronics",
  "id_card",
  "wallet_keys",
  "books_notes",
  "accessories",
  "clothing",
  "other",
] as const;

export const CUSTODY_TYPES = ["finder", "security_desk", "admin_office"] as const;

export const MAX_CLAIM_ATTEMPTS_PER_ITEM = 2;
export const FRAUD_STRIKE_BLOCK_THRESHOLD = 2;
export const MIN_IDENTIFYING_DETAILS_LENGTH = 20;

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "it",
  "of",
  "in",
  "on",
  "at",
  "to",
  "for",
  "with",
  "and",
  "or",
  "my",
  "has",
  "have",
  "there",
  "inside",
  "color",
  "colour",
]);

/**
 * Normalizes human-written answers so minor casing/punctuation differences
 * don't falsely penalize legitimate owners while preserving distinctive tokens.
 */
export function normalizeAnswerText(raw: unknown): string {
  return String(raw ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeaningfulTokens(normalized: string): string[] {
  if (!normalized) return [];
  const all = normalized.split(" ").filter(Boolean);
  const filtered = all.filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return filtered.length > 0 ? filtered : all;
}

/**
 * Computes a server-only similarity signal between the finder's hidden answer
 * and a claimant's submitted answer. Never leaks the secret to the claimant.
 */
export function scoreVerificationAnswer(
  expectedSecret: string,
  submittedAnswer: string
): { score: number; level: "high" | "partial" | "low" } {
  const expectedNorm = normalizeAnswerText(expectedSecret);
  const submittedNorm = normalizeAnswerText(submittedAnswer);

  if (!expectedNorm || !submittedNorm) {
    return { score: 0, level: "low" };
  }

  if (expectedNorm === submittedNorm) {
    return { score: 100, level: "high" };
  }

  if (expectedNorm.length >= 4 && submittedNorm.includes(expectedNorm)) {
    const ratio = expectedNorm.length / submittedNorm.length;
    const score = Math.round(80 + ratio * 15);
    return { score: Math.min(95, score), level: "high" };
  }

  const expectedTokens = Array.from(new Set(extractMeaningfulTokens(expectedNorm)));
  const submittedTokens = new Set(extractMeaningfulTokens(submittedNorm));

  if (expectedTokens.length === 0 || submittedTokens.size === 0) {
    return { score: 0, level: "low" };
  }

  let matched = 0;
  for (const token of expectedTokens) {
    if (submittedTokens.has(token)) {
      matched += 1;
    } else if (token.length >= 4) {
      for (const candidate of submittedTokens) {
        if (
          candidate.length >= 4 &&
          (candidate.startsWith(token) || token.startsWith(candidate))
        ) {
          matched += 0.75;
          break;
        }
      }
    }
  }

  const recall = matched / expectedTokens.length;
  const precision = matched / submittedTokens.size;
  const score = Math.round((recall * 0.75 + precision * 0.25) * 100);

  if (score >= 75) return { score: Math.min(100, score), level: "high" };
  if (score >= 40) return { score, level: "partial" };
  return { score, level: "low" };
}

export interface ClaimEligibilityInput {
  userId: number;
  finderId: number;
  itemStatus: string;
  priorAttempts: number;
  hasPendingClaim: boolean;
  userFraudStrikes: number;
}

export interface ClaimEligibilityResult {
  allowed: boolean;
  code?:
    | "SELF_CLAIM"
    | "ITEM_CLOSED"
    | "FRAUD_BLOCKED"
    | "PENDING_CLAIM_EXISTS"
    | "ATTEMPT_LIMIT_REACHED";
  reason?: string;
  remainingAttempts: number;
}

/**
 * Pure anti-fraud policy gate evaluated before accepting any ownership appeal.
 */
export function evaluateClaimEligibility(
  input: ClaimEligibilityInput
): ClaimEligibilityResult {
  const remainingAttempts = Math.max(
    0,
    MAX_CLAIM_ATTEMPTS_PER_ITEM - Math.max(0, input.priorAttempts)
  );

  if (input.userId === input.finderId) {
    return {
      allowed: false,
      code: "SELF_CLAIM",
      reason: "You cannot file an ownership claim on an item you posted as found.",
      remainingAttempts: 0,
    };
  }

  if (input.itemStatus !== "open" && input.itemStatus !== "claim_pending") {
    return {
      allowed: false,
      code: "ITEM_CLOSED",
      reason:
        input.itemStatus === "approved"
          ? "An ownership claim has already been approved and is awaiting handover."
          : "This item is no longer open for new claims.",
      remainingAttempts,
    };
  }

  if (input.userFraudStrikes >= FRAUD_STRIKE_BLOCK_THRESHOLD) {
    return {
      allowed: false,
      code: "FRAUD_BLOCKED",
      reason:
        "Your account is temporarily restricted from submitting Lost & Found claims due to multiple flagged false appeals. Please contact Campus Administration.",
      remainingAttempts: 0,
    };
  }

  if (input.hasPendingClaim) {
    return {
      allowed: false,
      code: "PENDING_CLAIM_EXISTS",
      reason: "You already have a claim under review for this item.",
      remainingAttempts,
    };
  }

  if (input.priorAttempts >= MAX_CLAIM_ATTEMPTS_PER_ITEM) {
    return {
      allowed: false,
      code: "ATTEMPT_LIMIT_REACHED",
      reason: `You have reached the maximum of ${MAX_CLAIM_ATTEMPTS_PER_ITEM} verification attempts for this item. Contact Campus Security with physical proof if you believe this is an error.`,
      remainingAttempts: 0,
    };
  }

  return {
    allowed: true,
    remainingAttempts,
  };
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Generates an unambiguous 6-character physical handover pickup code (e.g. LF-7K9P2M).
 */
export function generateHandoverCode(): string {
  const bytes = crypto.randomBytes(6);
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `LF-${suffix}`;
}

export function normalizeHandoverCode(code: unknown): string {
  return String(code ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function hashHandoverCode(code: string): string {
  const normalized = normalizeHandoverCode(code);
  return crypto.createHash("sha256").update(`complaintsync-lf:${normalized}`).digest("hex");
}

export function verifyHandoverCode(
  submittedCode: string,
  storedHash: string | null | undefined
): boolean {
  if (!storedHash || !submittedCode) return false;
  const candidate = hashHandoverCode(submittedCode);
  const bufA = Buffer.from(candidate, "hex");
  const bufB = Buffer.from(storedHash, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Sanitizes an optional phone/WhatsApp number for Lost & Found pickup coordination.
 * Accepts 10-digit local numbers (e.g., 9876543210) or international numbers with country code
 * (e.g., +91 98765 43210). Returns normalized digits (with optional leading '+') or "" if empty.
 */
export function normalizeContactPhone(raw: unknown): {
  valid: boolean;
  normalized: string;
  digits: string;
  reason?: string;
} {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return { valid: true, normalized: "", digits: "" };
  }

  // Reject any unexpected letters or protocol payloads
  if (/[a-zA-Z]/.test(trimmed)) {
    return {
      valid: false,
      normalized: "",
      digits: "",
      reason: "Phone number must contain only digits (and optional + country code).",
    };
  }

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 15) {
    return {
      valid: false,
      normalized: "",
      digits: "",
      reason: "Enter a valid 10-digit mobile number (or 11–15 digits with country code).",
    };
  }

  return {
    valid: true,
    normalized: hasPlus ? `+${digits}` : digits,
    digits,
  };
}

/**
 * Builds safe tel: and WhatsApp (wa.me) links for pickup coordination and reminders.
 * Defaults 10-digit local numbers to country code 91 while preserving explicit country codes.
 */
export function buildLostFoundContactLinks(
  rawPhone: unknown,
  message: string,
  defaultCountryCode = "91"
): {
  displayPhone: string;
  telHref: string;
  whatsappHref: string;
} | null {
  const parsed = normalizeContactPhone(rawPhone);
  if (!parsed.valid || !parsed.digits) return null;

  const waDigits =
    parsed.digits.length === 10 ? `${defaultCountryCode}${parsed.digits}` : parsed.digits;
  const telHref = `tel:+${waDigits}`;
  const encodedMsg = encodeURIComponent(String(message || "").trim());
  const whatsappHref = encodedMsg
    ? `https://wa.me/${waDigits}?text=${encodedMsg}`
    : `https://wa.me/${waDigits}`;

  const displayPhone =
    parsed.digits.length === 10
      ? `+${defaultCountryCode} ${parsed.digits.slice(0, 5)} ${parsed.digits.slice(5)}`
      : `+${waDigits}`;

  return {
    displayPhone,
    telHref,
    whatsappHref,
  };
}

