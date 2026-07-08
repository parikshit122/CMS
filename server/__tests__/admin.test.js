require("dotenv").config({ path: ".env.test" });
const request = require("supertest");
const app     = require("../app");
const { connect, clearDatabase, closeDatabase } = require("./helpers/testDb");
const {
  createTestUser,
  createTestAdmin,
  createTestStaff,
  getAuthHeader,
} = require("./helpers/authHelper");

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("GET /api/admin/users/students", () => {
  it("should return all students for admin", async () => {
    const admin = await createTestAdmin();
    await createTestUser();
    await createTestUser();

    const res = await request(app)
      .get("/api/admin/users/students")
      .set(getAuthHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("should reject non-admin access", async () => {
    const student = await createTestUser();

    const res = await request(app)
      .get("/api/admin/users/students")
      .set(getAuthHeader(student));

    expect(res.status).toBe(403);
  });

  it("should reject staff access", async () => {
    const staff = await createTestStaff();

    const res = await request(app)
      .get("/api/admin/users/students")
      .set(getAuthHeader(staff));

    expect(res.status).toBe(403);
  });

  it("should reject unauthenticated access", async () => {
    const res = await request(app)
      .get("/api/admin/users/students");

    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/users/staff", () => {
  it("should return all staff for admin", async () => {
    const admin = await createTestAdmin();
    await createTestStaff();
    await createTestStaff();

    const res = await request(app)
      .get("/api/admin/users/staff")
      .set(getAuthHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

describe("POST /api/admin/users/staff", () => {
  it("should create staff account", async () => {
    const admin = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/users/staff")
      .set(getAuthHeader(admin))
      .send({
        name:         "New Staff Member",
        email:        `newstaff_${Date.now()}@gmail.com`,
        phone:        "8765432109",
        category:     "it",
        passwordMode: "manual",
        password:     "StaffPass123!",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("New Staff Member");
  });

  it("should reject missing required fields", async () => {
    const admin = await createTestAdmin();

    const res = await request(app)
      .post("/api/admin/users/staff")
      .set(getAuthHeader(admin))
      .send({ name: "Incomplete Staff" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject duplicate email", async () => {
    const admin = await createTestAdmin();
    const email = `dup_${Date.now()}@gmail.com`;

    await request(app)
      .post("/api/admin/users/staff")
      .set(getAuthHeader(admin))
      .send({
        name: "Staff One", email, phone: "7654321098",
        category: "it", passwordMode: "manual", password: "Pass123!",
      });

    const res = await request(app)
      .post("/api/admin/users/staff")
      .set(getAuthHeader(admin))
      .send({
        name: "Staff Two", email, phone: "6543210987",
        category: "it", passwordMode: "manual", password: "Pass123!",
      });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/admin/users/students/:id/suspend", () => {
  it("should suspend a student", async () => {
    const admin   = await createTestAdmin();
    const student = await createTestUser();

    const res = await request(app)
      .patch(`/api/admin/users/students/${student._id}/suspend`)
      .set(getAuthHeader(admin))
      .send({
        days:   7,
        reason: "Violated community guidelines multiple times",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.suspendedUntil).toBeDefined();
  });

  it("should reject reason shorter than 10 characters", async () => {
    const admin   = await createTestAdmin();
    const student = await createTestUser();

    const res = await request(app)
      .patch(`/api/admin/users/students/${student._id}/suspend`)
      .set(getAuthHeader(admin))
      .send({ days: 7, reason: "Bad" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should reject days less than 1", async () => {
    const admin   = await createTestAdmin();
    const student = await createTestUser();

    const res = await request(app)
      .patch(`/api/admin/users/students/${student._id}/suspend`)
      .set(getAuthHeader(admin))
      .send({ days: 0, reason: "Valid reason here ok" });

    expect(res.status).toBe(400);
  });

  it("should return 404 for non-existent student", async () => {
    const admin  = await createTestAdmin();
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .patch(`/api/admin/users/students/${fakeId}/suspend`)
      .set(getAuthHeader(admin))
      .send({ days: 7, reason: "Valid reason here ok" });

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/users/students/:id/reactivate", () => {
  it("should reactivate a suspended student", async () => {
    const admin   = await createTestAdmin();
    const student = await createTestUser({
      suspendedUntil:   new Date(Date.now() + 86400000),
      suspensionReason: "Test suspension reason",
    });

    const res = await request(app)
      .patch(`/api/admin/users/students/${student._id}/reactivate`)
      .set(getAuthHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("DELETE /api/admin/users/students/:id", () => {
  it("should delete a student", async () => {
    const admin   = await createTestAdmin();
    const student = await createTestUser();

    const res = await request(app)
      .delete(`/api/admin/users/students/${student._id}`)
      .set(getAuthHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should return 404 for non-existent student", async () => {
    const admin  = await createTestAdmin();
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .delete(`/api/admin/users/students/${fakeId}`)
      .set(getAuthHeader(admin));

    expect(res.status).toBe(404);
  });

  it("should reject non-admin deleting student", async () => {
    const student1 = await createTestUser();
    const student2 = await createTestUser();

    const res = await request(app)
      .delete(`/api/admin/users/students/${student2._id}`)
      .set(getAuthHeader(student1));

    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/users/staff/:id", () => {
  it("should delete a staff member", async () => {
    const admin = await createTestAdmin();
    const staff = await createTestStaff();

    const res = await request(app)
      .delete(`/api/admin/users/staff/${staff._id}`)
      .set(getAuthHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});