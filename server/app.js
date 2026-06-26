const express = require("express");
const cors = require("cors");

const app = express();

// ✅ Allow popup-based auth (Google login fix)
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

// ✅ FIXED CORS (works for local + production)
app.use(
  cors({
    origin: true,          // allow all origins safely
    credentials: true,
  })
);

app.use(express.json());

// ✅ Routes
app.use("/api", require("./routes"));

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;