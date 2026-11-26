/**
 * Pure client-side helpers for Lost & Found phone validation,
 * tel: call links, and pre-filled WhatsApp pickup reminder links.
 */

export function normalizeContactPhone(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return { valid: true, normalized: "", digits: "" };
  }

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

export function buildContactLinks(rawPhone, message = "", defaultCountryCode = "91") {
  const parsed = normalizeContactPhone(rawPhone);
  if (!parsed.valid || !parsed.digits) return null;

  const waDigits =
    parsed.digits.length === 10
      ? `${defaultCountryCode}${parsed.digits}`
      : parsed.digits;

  const displayPhone =
    parsed.digits.length === 10
      ? `+${defaultCountryCode} ${parsed.digits.slice(0, 5)} ${parsed.digits.slice(5)}`
      : `+${waDigits}`;

  const encoded = encodeURIComponent(String(message || "").trim());
  return {
    displayPhone,
    telHref: `tel:+${waDigits}`,
    whatsappHref: encoded
      ? `https://wa.me/${waDigits}?text=${encoded}`
      : `https://wa.me/${waDigits}`,
  };
}

export function buildPickupReminderMessage({
  recipientName,
  itemTitle,
  itemCode,
  pickupPlace,
  status = "approved",
}) {
  const name = recipientName ? recipientName.split(" ")[0] : "there";
  if (status === "approved") {
    const deskNote = pickupPlace ? ` from ${pickupPlace}` : "";
    return `Hi ${name}, reminder from Campus Lost & Found: your claim for "${itemTitle}" (${itemCode}) is verified and ready for pickup${deskNote}. Please bring your 6-character Pickup Code when collecting it.`;
  }
  return `Hi ${name}, reaching out from Campus Lost & Found regarding your ownership claim for "${itemTitle}" (${itemCode}). Please reply here when you are available to verify or coordinate pickup.`;
}

export function buildOwnerToFinderMessage({
  finderName,
  itemTitle,
  itemCode,
  handoverCode,
}) {
  const name = finderName ? finderName.split(" ")[0] : "there";
  const codeText = handoverCode ? ` (Pickup Code: ${handoverCode})` : "";
  return `Hi ${name}, my ownership claim for "${itemTitle}" (${itemCode}) was approved on Campus Lost & Found${codeText}. When and where can I collect it?`;
}

export function buildFinderInquiryMessage({
  finderName,
  itemTitle,
  itemCode,
  foundLocation,
  handoverCode,
}) {
  if (handoverCode) {
    return buildOwnerToFinderMessage({ finderName, itemTitle, itemCode, handoverCode });
  }
  const name = finderName ? finderName.split(" ")[0] : "there";
  const locText = foundLocation ? ` found near ${foundLocation}` : "";
  return `Hi ${name}, I saw "${itemTitle}" (${itemCode})${locText} on Campus Lost & Found. I believe it may be mine — could we coordinate?`;
}

