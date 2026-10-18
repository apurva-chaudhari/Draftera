const Project = require("../models/Project");
const Drawing = require("../models/Drawing");
const DrawingRevision = require("../models/DrawingRevision");
const Acknowledgment = require("../models/Acknowledgment");
const { buildCurrencyMatrix } = require("../utils/currency");

/** Load a project's data and compute its revision-currency matrix. */
async function loadProjectCurrency(projectId) {
  const project = await Project.findById(projectId)
    .populate("members.user", "name email")
    .lean();

  if (!project) return null;

  const [drawings, revisions, acknowledgments] = await Promise.all([
    Drawing.find({ project: projectId }).sort({ drawingNumber: 1 }).lean(),
    DrawingRevision.find({ project: projectId })
      .select("drawing revisionNumber status publishedAt ackDueAt recipients")
      .lean(),
    Acknowledgment.find({ project: projectId }).lean(),
  ]);

  const members = project.members.map((m) => ({ user: m.user, role: m.role }));

  return buildCurrencyMatrix({ members, drawings, revisions, acknowledgments });
}

module.exports = { loadProjectCurrency };
