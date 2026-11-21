require("dotenv").config();

const crypto    = require("crypto");
const mongoose  = require("mongoose");
const app       = require("./app");
const http      = require("http");
const { Server } = require("socket.io");

const PORT  = process.env.PORT || 3000;
const HOST  = "0.0.0.0";
const isDev = process.env.NODE_ENV !== "production";
const fallbackJwtSecret = crypto.randomBytes(32).toString("hex");

// CRITICAL: Fail fast instead of hanging when MongoDB is offline
mongoose.set("bufferCommands", false);

// ── Create HTTP server from Express app ───────────────────
const httpServer = http.createServer(app);

// ── Attach socket.io ──────────────────────────────────────
const configuredOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (protocol === "https:" && hostname.endsWith(".run.app")) return true;
  } catch {
    return false;
  }
  return false;
};

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    methods:     ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// ── Socket authentication middleware ──────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const jwt  = require("jsonwebtoken");
    const User = require("./models/User");

    const decoded = jwt.verify(token, process.env.JWT_SECRET || fallbackJwtSecret);
    if (mongoose.connection.readyState !== 1) {
      return next(new Error("Database offline"));
    }
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return next(new Error("User not found"));
    if (user.isActive === false) return next(new Error("Account deactivated"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// ── Socket connection handler ─────────────────────────────
io.on("connection", (socket) => {
  const user = socket.user;

  // ── Join role-based rooms ─────────────────────────────
  socket.join(`user:${user._id}`);   // Personal room
  socket.join(`role:${user.role}`);  // Role room

  // ── Handle disconnect ─────────────────────────────────
  socket.on("disconnect", () => {});

  // ── Ping/pong for connection health ───────────────────
  socket.on("ping", () => socket.emit("pong"));
});

// ── Export io so controllers can emit events ──────────────
app.set("io", io);

// ── Connect DB (non-blocking) and start server ────────────
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      if (isDev) {
        console.log("✅ MongoDB Connected");
        console.log("📦 DB Host:", mongoose.connection.host);
      }
    })
    .catch((err) => {
      console.warn("⚠️  MongoDB not connected — running with offline fallback:", err.message);
    });
} else {
  console.warn("⚠️  MONGODB_URI not set — running with offline database fallback");
}

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});

// ── Graceful shutdown ─────────────────────────────────────
const shutdown = (signal) => {
  if (isDev) console.log(`\n${signal} received. Shutting down...`);
  httpServer.close(() => {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close(false).finally(() => process.exit(0));
    } else {
      process.exit(0);
    }
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ── Log unhandled rejections without crashing preview ─────
process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled Rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});