
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const { requireAuth } = require("./middleware/authMiddleware");
const app = express();

// Add security-related HTTP headers.
app.use(helmet());

// Parse JSON request bodies with a size limit.
app.use(express.json({ limit: "1mb" }));

// Allow requests from the local React development server.
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Basic API health check.
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Draftera API is running.",
    database: "connected",
    timestamp: new Date().toISOString(),
  });
});

// Authentication endpoints.
app.use("/api/auth", authRoutes);
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

  console.error("API request failed:", error.message);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB before accepting requests.
async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Draftera API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start Draftera API.");
    process.exit(1);
  }
}

startServer();
