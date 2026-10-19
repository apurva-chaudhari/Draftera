const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const projectRoutes = require("./routes/projectRoutes");
const drawingRoutes = require("./routes/drawingRoutes");
const acknowledgmentRoutes = require("./routes/acknowledgmentRoutes");
const clarificationRoutes = require("./routes/clarificationRoutes");
const { requireAuth } = require("./middleware/authMiddleware");
const { rateLimiter } = require("./middleware/rateLimiter");

const app = express();

// Required when running behind a proxy (Render, Vercel, etc.) so that
// req.ip is the real client address and rate limiting works correctly.
app.set("trust proxy", 1);

// Add security-related HTTP headers.
app.use(helmet());

// Parse JSON request bodies with a size limit.
app.use(express.json({ limit: "1mb" }));

// Allow only the configured frontend origins (comma-separated CLIENT_URL).
// With cookie sessions this check is also the CSRF defence: browsers send an
// Origin header on every cross-site POST/PUT/DELETE, and a request from any
// origin not listed here is refused before it reaches a route. Requests with
// no Origin header (curl, health checks) carry no browser cookie to abuse.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, health checks) are allowed.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin not allowed by CORS."));
    },
    // The session cookie is sent with cross-origin API calls.
    credentials: true,
    // Lets the browser read the file name of CSV downloads.
    exposedHeaders: ["Content-Disposition"],
  })
);

// Basic API health check.
app.get("/api/health", (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: "Draftera API is running.",
    database: databaseConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Brute-force protection on credential endpoints.
const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many attempts. Please wait a few minutes and try again.",
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/drawings", drawingRoutes);
app.use("/api/acknowledgments", acknowledgmentRoutes);
app.use("/api/clarifications", clarificationRoutes);

// Return the current authenticated user's public information.
app.get("/api/auth/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// Handle unknown API routes.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

// Central error handler.
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  // Multer (file upload) and CORS problems are the client's fault.
  if (error.name === "MulterError" || error.message === "Only PDF drawing files are allowed.") {
    return res.status(400).json({
      success: false,
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "The PDF must be 10 MB or smaller."
          : error.message,
    });
  }

  if (error.message === "Origin not allowed by CORS.") {
    return res.status(403).json({ success: false, message: error.message });
  }

  console.error("API request failed:", error.message);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

module.exports = app;
