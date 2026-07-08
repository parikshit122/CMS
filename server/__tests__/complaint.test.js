require("dotenv").config({ path: ".env.test" });
const request   = require("supertest");
const app       = require("../app");
const { connect, clearDatabase, closeDatabase } = require("./helpers/testDb");
const {
  createTestUser,
  createTestAdmin,
  createTestStaff,
  getAuthHeader,
} = require("./helpers/authHelper");
const Complaint = require("../models/Complaint");

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

// Helper to create complaint directly in DB
const makeComplaint = async (overrides = {}) => {
  const counter  = require("../models/Complaint");
  const year     = new Date().getFullYear();
  const seq      = Math.floor(Math.random() * 9000) + 1000;
  const complaintId = `CMP-${year}-${String(seq).padStart(4, "0")}`;

  return Complaint.create({
    title:       "Test complaint",
    description: "This is a test complaint description",
    category:    "it",
    priority:    "medium",
    status:      "pending",
    complaintId,
    ...overrides,
  });
};

describe("POST /api/complaints", () => {
  const validComplaint = {
    title:       "Broken fan in lab",
    description: "The ceiling fan in computer lab is broken",
    category:    "electrical",
    priority:    "medium",
    location:    "lab-cs",
  };

  it("should submit a complaint as student", async () => {
    const student = await createTestUser();

    const res = await request(app)
      .post("/api/complaints")
      .set(getAuthHeader(student))
      .field("title",       validComplaint.title)
      .field("description", validComplaint.description)
      .field("category",    validComplaint.category)
      .field("priority",    validComplaint.priority)
      .field("location",    validComplaint.location);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe(validComplaint.title);
    expect(res.body.data.status).toBe("pending");
  });

  it("should reject complaint from staff", async () => {
    const staff = await createTestStaff();

    const res = await request(app)
      .post("/api/complaints")
      .set(getAuthHeader(staff))
      .field("title",       validComplaint.title)
      .field("description", validComplaint.description)
      .field("category",    validComplaint.category);

    expect(res.status).toBe(403);
  });

  it("should reject unauthenticated request", async () => {
    const res = await request(app)
      .post("/api/complaints")
      .send(validComplaint);

    expect(res.status).toBe(401);
  });
});

describe("GET /api/complaints/my", () => {
  it("should return only current student complaints", async () => {
    const student1 = await createTestUser();
    const student2 = await createTestUser();

    await makeComplaint({ student: student1._id });
    await makeComplaint({ student: student2._id });

    const res = await request(app)
      .get("/api/complaints/my")
      .set(getAuthHeader(student1));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it("should return empty array when no complaints", async () => {
    const student = await createTestUser();

    const res = await request(app)
      .get("/api/complaints/my")
      .set(getAuthHeader(student));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("should reject staff trying to access student route", async () => {
    const staff = await createTestStaff();

    const res = await request(app)
      .get("/api/complaints/my")
      .set(getAuthHeader(staff));

    expect(res.status).toBe(403);
  });
});

describe("GET /api/complaints (admin)", () => {
  it("should return all complaints for admin", async () => {
    const admin   = await createTestAdmin();
    const student = await createTestUser();

    await makeComplaint({ student: student._id });
    await makeComplaint({ student: student._id });

    const res = await request(app)
      .get("/api/complaints")
      .set(getAuthHeader(admin));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it("should reject student trying to get all complaints", async () => {
    const student = await createTestUser();

    const res = await request(app)
      .get("/api/complaints")
      .set(getAuthHeader(student));

    expect(res.status).toBe(403);
  });

  it("should reject staff trying to get all complaints", async () => {
    const staff = await createTestStaff();

    const res = await request(app)
      .get("/api/complaints")
      .set(getAuthHeader(staff));

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/complaints/:id/status", () => {
  it("should allow staff to update complaint status to resolved", async () => {
    const staff   = await createTestStaff();
    const student = await createTestUser();

    const complaint = await makeComplaint({
      student:    student._id,
      assignedTo: staff._id,
      status:     "in-progress",
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint._id}/status`)
      .set(getAuthHeader(staff))
      .send({ status: "resolved" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("resolved");
  });

  it("should require rejection reason when rejecting", async () => {
    const staff   = await createTestStaff();
    const student = await createTestUser();

    const complaint = await makeComplaint({
      student:    student._id,
      assignedTo: staff._id,
      status:     "in-progress",
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint._id}/status`)
      .set(getAuthHeader(staff))
      .send({ status: "rejected" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/rejection reason/i);
  });

  it("should accept rejection with reason", async () => {
    const staff   = await createTestStaff();
    const student = await createTestUser();

    const complaint = await makeComplaint({
      student:    student._id,
      assignedTo: staff._id,
      status:     "in-progress",
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint._id}/status`)
      .set(getAuthHeader(staff))
      .send({
        status:          "rejected",
        rejectionReason: "This complaint is a duplicate of another one",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("rejected");
  });

  it("should not allow updating resolved complaint", async () => {
    const staff   = await createTestStaff();
    const student = await createTestUser();

    const complaint = await makeComplaint({
      student:    student._id,
      assignedTo: staff._id,
      status:     "resolved",
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint._id}/status`)
      .set(getAuthHeader(staff))
      .send({ status: "in-progress" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/locked/i);
  });

  it("should not allow staff to update other staff complaints", async () => {
    const staff1  = await createTestStaff();
    const staff2  = await createTestStaff();
    const student = await createTestUser();

    const complaint = await makeComplaint({
      student:    student._id,
      assignedTo: staff2._id,
      status:     "in-progress",
    });

    const res = await request(app)
      .patch(`/api/complaints/${complaint._id}/status`)
      .set(getAuthHeader(staff1))
      .send({ status: "resolved" });

    expect(res.status).toBe(403);
  });

  it("should return 404 for non-existent complaint", async () => {
    const staff  = await createTestStaff();
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .patch(`/api/complaints/${fakeId}/status`)
      .set(getAuthHeader(staff))
      .send({ status: "resolved" });

    expect(res.status).toBe(404);
  });
});