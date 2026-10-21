const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  createProject,
  getProjects,
  getProjectById,
  addProjectMember,
  removeProjectMember,
  updateProject,
  getProjectCurrency,
  getProjectActivity,
  getProjectReport,
} = require("../controllers/projectController");

const router = express.Router();

// All project routes require an authenticated user.
router.use(requireAuth);

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:projectId", getProjectById);
router.patch("/:projectId", updateProject);
router.post("/:projectId/members", addProjectMember);
router.delete("/:projectId/members/:userId", removeProjectMember);
router.get("/:projectId/currency", getProjectCurrency);
router.get("/:projectId/activity", getProjectActivity);
router.get("/:projectId/report.csv", getProjectReport);

module.exports = router;
