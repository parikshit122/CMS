// ── Emit to a specific user ───────────────────────────────
const emitToUser = (app, userId, event, data) => {
  try {
    const io = app.get("io");
    if (!io) return;
    io.to(`user:${userId.toString()}`).emit(event, data);
  } catch (err) {
    console.error("Socket emit error:", err.message);
  }
};

// ── Emit to all users with a specific role ────────────────
const emitToRole = (app, role, event, data) => {
  try {
    const io = app.get("io");
    if (!io) return;
    io.to(`role:${role}`).emit(event, data);
  } catch (err) {
    console.error("Socket emit error:", err.message);
  }
};

// ── Emit to multiple users ────────────────────────────────
const emitToUsers = (app, userIds, event, data) => {
  userIds.forEach((id) => emitToUser(app, id, event, data));
};

module.exports = { emitToUser, emitToRole, emitToUsers };