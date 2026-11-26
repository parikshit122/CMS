require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const app = require("./app");
const { getJwtSecret } = require("./utils/generateToken");
const adminAuth = require("./config/firebaseadmin");
const { pool } = require("../src/db/index.ts");
const {
  findUserById,
  findUserByUid,
} = require("../src/db/users.ts");
const {
  startSlaEscalationScheduler,
  stopSlaEscalationScheduler,
} = require("./services/escalation.service");

const PORT = process.env.RENDER ? Number(process.env.PORT) || 10000 : 3000;
const HOST = "0.0.0.0";
const isDev = process.env.NODE_ENV !== "production";

// ── Create HTTP server from Express app ───────────────────
const httpServer = http.createServer(app);

// ── Attach socket.io ──────────────────────────────────────
const configuredOrigins = [
  ...(process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:5173").split(","),
  process.env.FRONTEND_URL || "",
  process.env.RENDER_EXTERNAL_URL || "",
]
  .map((o) => o.trim().replace(/\/+$/, ""))
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
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// ── Socket authentication middleware ──────────────────────
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    let user = null;
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      if (decoded?.id) {
        user = await findUserById(decoded.id);
      }
    } catch {
      if (adminAuth) {
        const decodedFirebase = await adminAuth.verifyIdToken(token);
        if (decodedFirebase?.uid) {
          user = await findUserByUid(decodedFirebase.uid);
        }
      }
    }

    if (!user) return next(new Error("User not found"));
    if (user.isActive === false) return next(new Error("Account deactivated"));

    socket.user = user;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

// ── Socket connection handler ─────────────────────────────
io.on("connection", (socket) => {
  const user = socket.user;

  socket.join(`user:${user._id}`);
  socket.join(`role:${user.role}`);

  socket.on("disconnect", () => {});
  socket.on("ping", () => socket.emit("pong"));
});

app.set("io", io);

// ── Start server (pg.Pool connects lazily on demand) ──────
httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  startSlaEscalationScheduler(app);
});

// ── Graceful shutdown ─────────────────────────────────────
const shutdown = (signal) => {
  if (isDev) console.log(`\n${signal} received. Shutting down...`);
  stopSlaEscalationScheduler();
  httpServer.close(() => {
    pool.end().finally(() => process.exit(0));
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("⚠️  Unhandled Rejection:", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
});