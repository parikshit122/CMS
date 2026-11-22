"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const mongoSanitize = require("../middlewares/sanitize");
const {
  generateAccessToken,
  generateRefreshToken,
  getJwtSecret,
  getJwtRefreshSecret,
} = require("../utils/generateToken");
const { escapeHtml } = require("../services/email.service");
const { validateEmail } = require("../utils/emailValidator");
const { generateOTP, canResendOTP } = require("../utils/otpGenerator");

describe("mongoSanitize middleware (Express 5 compatibility + password preservation)", () => {
  it("sanitizes getter-only req.query in-place without throwing", () => {
    const queryStore = {
      status: " pending ",
      "$where": "1==1",
      "user.role": "<script>admin</script>",
    };
    const req = {
      body: {
        name: " <b>Alice</b> ",
        password: "My<Pass>123!",
        newPassword: "New<Pass>456!",
        "$gt": 0,
      },
      params: { id: " 123 " },
    };
    Object.defineProperty(req, "query", {
      get() {
        return queryStore;
      },
      enumerable: true,
      configurable: true,
    });

    let nextCalled = false;
    mongoSanitize(req, {}, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(req.query.status, "pending");
    assert.equal("$where" in req.query, false);
    assert.equal(req.query._where, "1==1");
    assert.equal("user.role" in req.query, false);
    assert.equal(req.query.user_role, "scriptadmin/script");

    // Normal fields stripped/trimmed, password fields preserved verbatim
    assert.equal(req.body.name, "bAlice/b");
    assert.equal(req.body.password, "My<Pass>123!");
    assert.equal(req.body.newPassword, "New<Pass>456!");
    assert.equal("$gt" in req.body, false);
    assert.equal(req.body._gt, 0);
    assert.equal(req.params.id, "123");
  });
});

describe("generateToken secret consistency", () => {
  it("signs and verifies access and refresh tokens even without env vars", () => {
    const prevSecret = process.env.JWT_SECRET;
    const prevRefresh = process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    try {
      const accessToken = generateAccessToken("user-123");
      const refreshToken = generateRefreshToken("user-123");

      const decodedAccess = jwt.verify(accessToken, getJwtSecret());
      const decodedRefresh = jwt.verify(refreshToken, getJwtRefreshSecret());

      assert.equal(decodedAccess.id, "user-123");
      assert.equal(decodedRefresh.id, "user-123");
      assert.notEqual(getJwtSecret(), getJwtRefreshSecret());
    } finally {
      if (prevSecret !== undefined) process.env.JWT_SECRET = prevSecret;
      if (prevRefresh !== undefined) process.env.JWT_REFRESH_SECRET = prevRefresh;
    }
  });
});

describe("email.service escapeHtml", () => {
  it("escapes HTML special characters safely", () => {
    assert.equal(
      escapeHtml(`<img src="x" onerror='alert(1)'> & "O'Brien"`),
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt; &amp; &quot;O&#39;Brien&quot;"
    );
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
  });
});

describe("emailValidator & otpGenerator helpers", () => {
  it("rejects disposable domains and accepts standard emails", () => {
    assert.equal(validateEmail("student.real@gmail.com").valid, true);
    assert.equal(validateEmail("someone@mailinator.com").valid, false);
    assert.equal(validateEmail(null).valid, false);
  });

  it("generates 6-digit numeric OTPs and enforces resend cooldown", () => {
    const otp = generateOTP();
    assert.match(otp, /^\d{6}$/);
    assert.equal(canResendOTP(null).canResend, true);
    assert.equal(canResendOTP(new Date(), 60).canResend, false);
  });
});
