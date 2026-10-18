const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  createProject,
  getProjects,
  getProjectById,
  addProjectMember,
  getProjectCurrency,
  getProjectActivity,
} = require("../controllers/projectController");

const router = express.Router();

// All project routes require an authenticated user.
router.use(requireAuth);

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:projectId", getProjectById);
router.post("/:projectId/members", addProjectMember);
router.get("/:projectId/currency", getProjectCurrency);
router.get("/:projectId/activity", getProjectActivity);

module.exports = router;
