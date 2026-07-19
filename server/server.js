require("dotenv").config();

const mongoose  = require("mongoose");
const app       = require("./app");
const http      = require("http");
const { Server } = require("socket.io");

const PORT  = process.env.PORT || 5000;
const isDev = process.env.NODE_ENV !== "production";

// ── Create HTTP server from Express app ───────────────────
const httpServer = http.createServer(app);

// ── Attach socket.io ──────────────────────────────────────
const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:3000"
).split(",").map((o) => o.trim());

const DEV_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
];

const io = new Server(httpServer, {
  cors: {
    origin:      isDev
      ? (origin, cb) => {
          if (!origin || allowedOrigins.includes(origin) || DEV_ORIGINS.includes(origin)) {
            return cb(null, true);
          }
          cb(new Error(`CORS blocked: ${origin}`));
        }
      : allowedOrigins,
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select("-password");

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

  if (isDev) {
    // console.log(`🔌 Socket connected: ${user.name} (${user.role}) — ${socket.id}`);
  }

  // ── Join role-based rooms ─────────────────────────────
  socket.join(`user:${user._id}`);   // Personal room
  socket.join(`role:${user.role}`);  // Role room

  // ── Handle disconnect ─────────────────────────────────
  socket.on("disconnect", (reason) => {
    if (isDev) {
      // console.log(`🔌 Socket disconnected: ${user.name} — ${reason}`);
    }
  });

  // ── Ping/pong for connection health ───────────────────
  socket.on("ping", () => socket.emit("pong"));
});

// ── Export io so controllers can emit events ──────────────
app.set("io", io);

// ── Connect DB then start server ──────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    if (isDev) {
      console.log("✅ MongoDB Connected");
      console.log("📦 DB Host:", mongoose.connection.host);
    }

    httpServer.listen(PORT, () => {
      if (isDev) {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔌 Socket.io ready`);
      }
    });

    // ── Graceful shutdown ─────────────────────────────────
    const shutdown = (signal) => {
      if (isDev) console.log(`\n${signal} received. Shutting down...`);
      httpServer.close(() => {
        mongoose.connection.close(false, () => {
          if (isDev) console.log("✅ Server and DB closed cleanly");
          process.exit(0);
        });
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// ── Catch unhandled rejections ────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});