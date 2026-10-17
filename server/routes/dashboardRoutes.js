
const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  getDashboardSummary,
} = require("../controllers/dashboardController");

const router = express.Router();

router.get("/summary", requireAuth, getDashboardSummary);

module.exports = router;
