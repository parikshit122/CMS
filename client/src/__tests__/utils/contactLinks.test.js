import { describe, it, expect } from "vitest";
import {
  normalizeContactPhone,
  buildContactLinks,
  buildPickupReminderMessage,
  buildOwnerToFinderMessage,
  buildFinderInquiryMessage,
} from "../../utils/contactLinks";

describe("contactLinks — phone sanitization & WhatsApp (wa.me) links", () => {
  it("normalizes 10-digit local and international phone numbers", () => {
    expect(normalizeContactPhone("")).toEqual({ valid: true, normalized: "", digits: "" });
    expect(normalizeContactPhone("98765 43210")).toEqual({
      valid: true,
      normalized: "9876543210",
      digits: "9876543210",
    });
    expect(normalizeContactPhone("+91-98765-43210")).toEqual({
      valid: true,
      normalized: "+919876543210",
      digits: "919876543210",
    });
  });

  it("rejects short, overly long, or non-numeric injection strings", () => {
    expect(normalizeContactPhone("12345").valid).toBe(false);
    expect(normalizeContactPhone("1234567890123456").valid).toBe(false);
    expect(normalizeContactPhone("javascript:alert(1)").valid).toBe(false);
  });

  it("builds valid wa.me and tel: links with URL-encoded messages", () => {
    const links = buildContactLinks("9876543210", "Hello from Lost & Found");
    expect(links).toEqual({
      displayPhone: "+91 98765 43210",
      telHref: "tel:+919876543210",
      whatsappHref: "https://wa.me/919876543210?text=Hello%20from%20Lost%20%26%20Found",
    });

    const intl = buildContactLinks("+1 415 555 0199", "");
    expect(intl).toEqual({
      displayPhone: "+14155550199",
      telHref: "tel:+14155550199",
      whatsappHref: "https://wa.me/14155550199",
    });

    expect(buildContactLinks("", "test")).toBeNull();
    expect(buildContactLinks("invalid", "test")).toBeNull();
  });

  it("builds contextual pickup reminder, approved handover, and inquiry messages", () => {
    const reminder = buildPickupReminderMessage({
      recipientName: "Aarav Kulkarni",
      itemTitle: "Keychain",
      itemCode: "LF-2026-0008",
      pickupPlace: "Main Gate Desk",
      status: "approved",
    });
    expect(reminder).toContain("Hi Aarav");
    expect(reminder).toContain("LF-2026-0008");
    expect(reminder).toContain("Main Gate Desk");

    const ownerMsg = buildOwnerToFinderMessage({
      finderName: "Prof. Rajesh",
      itemTitle: "Keychain",
      itemCode: "LF-2026-0008",
      handoverCode: "LF-7RT4SK",
    });
    expect(ownerMsg).toContain("LF-7RT4SK");

    const openInquiry = buildFinderInquiryMessage({
      finderName: "Meera Joshi",
      itemTitle: "Earbuds Case",
      itemCode: "LF-2026-0006",
      foundLocation: "Seminar Hall",
    });
    expect(openInquiry).toContain("Hi Meera");
    expect(openInquiry).toContain("Seminar Hall");

    const approvedInquiry = buildFinderInquiryMessage({
      finderName: "Meera Joshi",
      itemTitle: "Earbuds Case",
      itemCode: "LF-2026-0006",
      handoverCode: "LF-99ABCD",
    });
    expect(approvedInquiry).toContain("LF-99ABCD");
  });
});
