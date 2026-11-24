import { describe, it, expect } from "vitest";
import {
  validateLoginInput,
  validateRegisterInput,
  getSocialAuthErrorMessage,
  getRoleRedirect,
} from "../../utils/authValidation";

describe("authValidation — manual login & registration", () => {
  it("trims and normalizes login email before validation", () => {
    const res = validateLoginInput({
      email: "  Student@College.EDU  ",
      password: "MyPassword1!",
    });
    expect(res.valid).toBe(true);
    expect(res.sanitized.email).toBe("student@college.edu");
  });

  it("rejects invalid login email or empty password", () => {
    expect(validateLoginInput({ email: "bad-email", password: "abc" }).valid).toBe(false);
    expect(validateLoginInput({ email: "a@b.com", password: "" }).valid).toBe(false);
  });

  it("sanitizes registration fields before length checks so angle brackets cannot bypass min length", () => {
    const badName = validateRegisterInput({
      name: "a<>b",
      email: "valid@gmail.com",
      phone: "9876543210",
      password: "Password@1",
    });
    expect(badName.valid).toBe(false);
    expect(badName.error).toMatch(/at least 3/i);

    const good = validateRegisterInput({
      name: "  Aarav Sharma  ",
      email: "  Aarav.Sharma@gmail.com ",
      phone: " 9876543210 ",
      password: "Password@1",
    });
    expect(good.valid).toBe(true);
    expect(good.sanitized).toEqual({
      name: "Aarav Sharma",
      email: "aarav.sharma@gmail.com",
      phone: "9876543210",
      password: "Password@1",
    });
  });

  it("enforces strong password rules on registration", () => {
    const missingSpecial = validateRegisterInput({
      name: "Priya Verma",
      email: "priya@gmail.com",
      phone: "9876543210",
      password: "Password123",
    });
    expect(missingSpecial.valid).toBe(false);
    expect(missingSpecial.error).toMatch(/special character/i);
  });
});

describe("authValidation — social auth error messages & role redirects", () => {
  it("silently ignores popup close/cancel errors", () => {
    expect(getSocialAuthErrorMessage({ code: "auth/popup-closed-by-user" }, "google")).toBeNull();
    expect(getSocialAuthErrorMessage({ code: "auth/cancelled-popup-request" }, "github")).toBeNull();
  });

  it("returns actionable messages for common Firebase provider errors", () => {
    expect(getSocialAuthErrorMessage({ code: "auth/operation-not-allowed" }, "github")).toMatch(
      /GitHub sign-in is not enabled/i
    );
    expect(
      getSocialAuthErrorMessage({ code: "auth/account-exists-with-different-credential" }, "google")
    ).toMatch(/different sign-in provider/i);
    expect(getSocialAuthErrorMessage({ code: "auth/unauthorized-domain" }, "google")).toMatch(
      /not authorized/i
    );
    expect(getSocialAuthErrorMessage({ code: "auth/popup-blocked" }, "google")).toMatch(
      /Popup blocked/i
    );
  });

  it("maps roles to expected dashboard routes", () => {
    expect(getRoleRedirect("admin")).toBe("/admin");
    expect(getRoleRedirect("staff")).toBe("/staff");
    expect(getRoleRedirect("user")).toBe("/dashboard");
  });
});
