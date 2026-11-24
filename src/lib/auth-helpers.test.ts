import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSocialProvider,
  sanitizeAvatarUrl,
  canLinkSocialAccount,
  validatePasswordAgainstPolicy,
  isEmailServiceReady,
} from "./auth-helpers.ts";
import emailValidator from "../../server/utils/emailValidator.js";

const { validateEmail } = emailValidator;

describe("auth-helpers — social provider & avatar sanitization", () => {
  it("normalizes known Firebase sign_in_provider values and ignores untrusted inputs", () => {
    assert.equal(normalizeSocialProvider("google.com"), "google");
    assert.equal(normalizeSocialProvider("github.com"), "github");
    assert.equal(normalizeSocialProvider("twitter.com"), "twitter");
    assert.equal(normalizeSocialProvider("facebook.com"), "facebook");
    assert.equal(normalizeSocialProvider("custom-spoofed"), "social");
    assert.equal(normalizeSocialProvider(undefined), "social");
  });

  it("allows only valid https avatar URLs and strips unsafe schemes", () => {
    assert.equal(
      sanitizeAvatarUrl("https://lh3.googleusercontent.com/a/photo.jpg"),
      "https://lh3.googleusercontent.com/a/photo.jpg"
    );
    assert.equal(sanitizeAvatarUrl("javascript:alert(1)"), "");
    assert.equal(sanitizeAvatarUrl("http://insecure.example/a.png"), "");
    assert.equal(sanitizeAvatarUrl("data:image/svg+xml,<svg/>"), "");
    assert.equal(sanitizeAvatarUrl("not-a-url"), "");
  });
});

describe("auth-helpers — safe social account linking guard", () => {
  it("allows returning social user with matching Firebase UID", () => {
    const res = canLinkSocialAccount({
      existingUid: "uid-123",
      incomingUid: "uid-123",
      emailVerified: false,
    });
    assert.equal(res.allowed, true);
  });

  it("blocks linking unverified social email onto existing local account", () => {
    const res = canLinkSocialAccount({
      existingUid: null,
      incomingUid: "uid-new",
      emailVerified: false,
    });
    assert.equal(res.allowed, false);
    assert.match(res.reason || "", /not verified/i);
  });

  it("allows linking verified social email onto existing local account", () => {
    const res = canLinkSocialAccount({
      existingUid: null,
      incomingUid: "uid-new",
      emailVerified: true,
    });
    assert.equal(res.allowed, true);
  });
});

describe("auth-helpers — dynamic password policy & email service readiness", () => {
  it("enforces default strong password rules and respects custom admin policy", () => {
    assert.equal(validatePasswordAgainstPolicy("weak").valid, false);
    assert.equal(validatePasswordAgainstPolicy("NoSpecial1").valid, false);
    assert.equal(validatePasswordAgainstPolicy("Strong@123").valid, true);

    assert.equal(
      validatePasswordAgainstPolicy("Short@1", { passwordMinLength: 10 }).valid,
      false
    );
    assert.equal(
      validatePasswordAgainstPolicy("Relaxed123", {
        passwordRequireSpecial: false,
      }).valid,
      true
    );
  });

  it("requires emailEnabled AND Brevo credentials for email readiness", () => {
    assert.equal(
      isEmailServiceReady({ emailEnabled: true }, { BREVO_API_KEY: "k", EMAIL_FROM: "a@b.com" }),
      true
    );
    assert.equal(
      isEmailServiceReady({ emailEnabled: true }, { BREVO_API_KEY: "", EMAIL_FROM: "a@b.com" }),
      false
    );
    assert.equal(
      isEmailServiceReady({ emailEnabled: false }, { BREVO_API_KEY: "k", EMAIL_FROM: "a@b.com" }),
      false
    );
  });
});

describe("emailValidator — realistic vs disposable/throwaway emails", () => {
  it("accepts legitimate emails including words starting with test/demo", () => {
    assert.equal(validateEmail("tesla.student@gmail.com").valid, true);
    assert.equal(validateEmail("demographics@college.edu").valid, true);
    assert.equal(validateEmail("  parikshitwadkar96@gmail.com  ").valid, true);
  });

  it("rejects disposable domains and throwaway usernames", () => {
    assert.equal(validateEmail("student@tempmail.com").valid, false);
    assert.equal(validateEmail("test@gmail.com").valid, false);
    assert.equal(validateEmail("test123@gmail.com").valid, false);
    assert.equal(validateEmail("demo_user@gmail.com").valid, false);
    assert.equal(validateEmail("123456@gmail.com").valid, false);
  });
});
