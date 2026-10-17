
const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  createProject,
  getProjects,
} = require("../controllers/projectController");

const router = express.Router();

// All project routes require an authenticated user.
router.use(requireAuth);

router.post("/", createProject);
router.get("/", getProjects);

module.exports = router;
