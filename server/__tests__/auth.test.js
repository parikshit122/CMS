require("dotenv").config({ path: ".env.test" });
const request = require("supertest");
const app     = require("../app");
const { connect, clearDatabase, closeDatabase } = require("./helpers/testDb");
const {
  createTestUser,
  getAuthHeader,
  TEST_PASSWORD,
} = require("./helpers/authHelper");
const User = require("../models/User");

beforeAll(async () => { await connect(); });
afterEach(async () => { await clearDatabase(); });
afterAll(async () => { await closeDatabase(); });

describe("POST /api/auth/register", () => {
  const validPayload = {
    name:     "John Test",
    email:    "johntest@gmail.com",
    phone:    "9876543210",
    password: "TestPass123!",
  };

  it("should register a new user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.requiresVerification).toBe(true);
    expect(res.body.email).toBe("johntest@gmail.com");
  });

  it("should reject duplicate email", async () => {
    await request(app).post("/api/auth/register").send(validPayload);
    const res = await request(app).post("/api/auth/register").send(validPayload);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject invalid phone", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, phone: "123" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should always create user as role=user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, email: "hacker@gmail.com" });
    expect(res.status).toBe(201);
    const user = await User.findOne({ email: "hacker@gmail.com" });
    expect(user.role).toBe("user");
  });

  it("should reject missing name", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validPayload, name: "" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("POST /api/auth/login", () => {
  it("should login with correct credentials", async () => {
    const user = await createTestUser();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(user.email);
  });

  it("should reject wrong password", async () => {
    const user = await createTestUser();

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: "WrongPassword999!" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should reject non-existent user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@gmail.com", password: TEST_PASSWORD });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should reject unverified email", async () => {
    const user = await createTestUser({ isEmailVerified: false });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.requiresVerification).toBe(true);
  });

  it("should reject suspended user", async () => {
    const suspendedUntil = new Date(Date.now() + 86400000);
    const user = await createTestUser({ suspendedUntil });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(res.status).toBe(403);
    expect(res.body.suspendedUntil).toBeDefined();
  });

  it("should reject missing email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: TEST_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject missing password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@gmail.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /api/auth/me", () => {
  it("should return current user data", async () => {
    const user = await createTestUser();

    const res = await request(app)
      .get("/api/auth/me")
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(user.email);
  });

  it("should reject unauthenticated request", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("should reject invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalidtoken");

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("should logout successfully", async () => {
    const user = await createTestUser();

    const res = await request(app)
      .post("/api/auth/logout")
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});