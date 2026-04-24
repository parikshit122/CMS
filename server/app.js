const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");

const app = express();

// ✅ FIXED: Correct COOP header for Firebase popup
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups"); // ✅ Fixes popup warning
  // ✅ REMOVED: Cross-Origin-Embedder-Policy - causes issues with Firebase
  next();
});

// ✅ CORS - allow your frontend
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite default
      "http://localhost:3000", // CRA default
    ],
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

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