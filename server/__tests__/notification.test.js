require("dotenv").config({ path: ".env.test" });
const request      = require("supertest");
const app          = require("../app");
const { connect, clearDatabase, closeDatabase } = require("./helpers/testDb");
const { createTestUser, getAuthHeader }         = require("./helpers/authHelper");
const Notification = require("../models/Notification");

beforeAll(async () => {
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

// Helper
const makeNotification = (userId, overrides = {}) =>
  Notification.create({
    recipient: userId,
    type:      "complaint_submitted",
    title:     "Test Notification",
    message:   "This is a test notification message",
    isRead:    false,
    ...overrides,
  });

describe("GET /api/notifications", () => {
  it("should return user notifications", async () => {
    const user = await createTestUser();
    await makeNotification(user._id);
    await makeNotification(user._id);

    const res = await request(app)
      .get("/api/notifications")
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.unreadCount).toBe(2);
  });

  it("should not return other users notifications", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    await makeNotification(user2._id);

    const res = await request(app)
      .get("/api/notifications")
      .set(getAuthHeader(user1));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.unreadCount).toBe(0);
  });

  it("should reject unauthenticated request", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("should support pagination", async () => {
    const user = await createTestUser();
    await Promise.all(
      Array.from({ length: 5 }, () => makeNotification(user._id))
    );

    const res = await request(app)
      .get("/api/notifications?page=1&limit=3")
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination.total).toBe(5);
  });
});

describe("GET /api/notifications/unread-count", () => {
  it("should return correct unread count", async () => {
    const user = await createTestUser();
    await makeNotification(user._id, { isRead: false });
    await makeNotification(user._id, { isRead: false });
    await makeNotification(user._id, { isRead: true  });

    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.unreadCount).toBe(2);
  });
});

describe("PATCH /api/notifications/:id/read", () => {
  it("should mark notification as read", async () => {
    const user  = await createTestUser();
    const notif = await makeNotification(user._id);

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });

  it("should not allow marking other users notification as read", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const notif = await makeNotification(user2._id);

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set(getAuthHeader(user1));

    expect(res.status).toBe(404);
  });

  it("should return 404 for non-existent notification", async () => {
    const user   = await createTestUser();
    const fakeId = "507f1f77bcf86cd799439011";

    const res = await request(app)
      .patch(`/api/notifications/${fakeId}/read`)
      .set(getAuthHeader(user));

    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/notifications/mark-all-read", () => {
  it("should mark all notifications as read", async () => {
    const user = await createTestUser();
    await makeNotification(user._id);
    await makeNotification(user._id);

    const res = await request(app)
      .patch("/api/notifications/mark-all-read")
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const unread = await Notification.countDocuments({
      recipient: user._id,
      isRead:    false,
    });
    expect(unread).toBe(0);
  });

  it("should only mark current users notifications", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    await makeNotification(user1._id);
    await makeNotification(user2._id);

    await request(app)
      .patch("/api/notifications/mark-all-read")
      .set(getAuthHeader(user1));

    const user2Unread = await Notification.countDocuments({
      recipient: user2._id,
      isRead:    false,
    });
    expect(user2Unread).toBe(1);
  });
});

describe("DELETE /api/notifications/:id", () => {
  it("should delete a notification", async () => {
    const user  = await createTestUser();
    const notif = await makeNotification(user._id);

    const res = await request(app)
      .delete(`/api/notifications/${notif._id}`)
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const found = await Notification.findById(notif._id);
    expect(found).toBeNull();
  });

  it("should not delete other users notification", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    const notif = await makeNotification(user2._id);

    const res = await request(app)
      .delete(`/api/notifications/${notif._id}`)
      .set(getAuthHeader(user1));

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/notifications/clear-all", () => {
  it("should clear all user notifications", async () => {
    const user = await createTestUser();
    await makeNotification(user._id);
    await makeNotification(user._id);

    const res = await request(app)
      .delete("/api/notifications/clear-all")
      .set(getAuthHeader(user));

    expect(res.status).toBe(200);

    const count = await Notification.countDocuments({ recipient: user._id });
    expect(count).toBe(0);
  });

  it("should only clear current users notifications", async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    await makeNotification(user1._id);
    await makeNotification(user2._id);

    await request(app)
      .delete("/api/notifications/clear-all")
      .set(getAuthHeader(user1));

    const user2Count = await Notification.countDocuments({
      recipient: user2._id,
    });
    expect(user2Count).toBe(1);
  });
});