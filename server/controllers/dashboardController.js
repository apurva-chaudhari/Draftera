const mongoose = require("mongoose");

const Project = require("../models/Project");
const DrawingRevision = require("../models/DrawingRevision");
const Acknowledgment = require("../models/Acknowledgment");
const Clarification = require("../models/Clarification");
const ActivityLog = require("../models/ActivityLog");
const { loadProjectCurrency } = require("../services/currencyService");

/**
 * Everything on the overview page comes from persisted records.
 * Nothing here is hard-coded sample data.
 */
async function getDashboardSummary(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const projects = await Project.find({
      $or: [{ supervisor: userId }, { "members.user": userId }],
    })
      .select("_id status supervisor")
      .lean();

    const projectIds = projects.map((project) => project._id);
    const supervisedIds = projects
      .filter((p) => String(p.supervisor) === String(userId))
      .map((p) => p._id);

    if (projectIds.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          activeProjects: 0,
          currentDrawings: 0,
          pendingAcknowledgments: 0,
          openClarifications: 0,
          atRiskRecipients: 0,
          overdueAcknowledgments: 0,
          overduePeople: 0,
        },
        pendingItems: [],
        atRisk: [],
        recentActivity: [],
      });
    }

    // Only acknowledgments on the CURRENT published revision need action;
    // pending records on superseded revisions are moot.
    const publishedRevisionIds = await DrawingRevision.find({
      project: { $in: projectIds },
      status: "published",
    }).distinct("_id");

    // Published revisions whose acknowledgment deadline has passed.
    const overdueRevisionIds = await DrawingRevision.find({
      project: { $in: projectIds },
      status: "published",
      ackDueAt: { $lt: new Date() },
    }).distinct("_id");

    const [
      activeProjects,
      pendingAcknowledgments,
      overdueAcknowledgments,
      openClarifications,
      pendingItems,
      recentActivity,
      currencies,
    ] = await Promise.all([
      Project.countDocuments({ _id: { $in: projectIds }, status: "active" }),

      Acknowledgment.countDocuments({
        revision: { $in: publishedRevisionIds },
        recipient: userId,
        status: "pending",
      }),

      Acknowledgment.countDocuments({
        revision: { $in: overdueRevisionIds },
        recipient: userId,
        status: "pending",
      }),

      // Supervisors see every unanswered question in their projects;
      // others see their own that are still waiting.
      Clarification.countDocuments({
        status: "open",
        $or: [
          { project: { $in: supervisedIds } },
          { requestedBy: userId, project: { $in: projectIds } },
        ],
      }),

      Acknowledgment.find({
        revision: { $in: publishedRevisionIds },
        recipient: userId,
        status: "pending",
      })
        .populate({
          path: "revision",
          select: "revisionNumber publishedAt drawing",
          populate: { path: "drawing", select: "drawingNumber title" },
        })
        .populate("project", "name code")
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),

      ActivityLog.find({ project: { $in: projectIds } })
        .populate("actor", "name")
        .populate("project", "code")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),

      Promise.all(supervisedIds.map((id) => loadProjectCurrency(id))),
    ]);

    // People who acknowledged an older revision but not the current one.
    const atRisk = [];
    currencies.forEach((currency, index) => {
      if (!currency) return;
      for (const drawing of currency.drawings) {
        for (const person of drawing.people) {
          if (person.atRisk) {
            atRisk.push({
              projectId: supervisedIds[index],
              drawingNumber: drawing.drawing.drawingNumber,
              currentRevision: drawing.currentRevision,
              person: { _id: person.user?._id, name: person.user?.name },
              state: person.state,
              lastAckedRevision: person.lastAckedRevision,
            });
          }
        }
      }
    });

    const currentDrawings = publishedRevisionIds.length;
    const overduePeople = currencies.reduce(
      (sum, currency) => sum + (currency ? currency.totals.overdue : 0),
      0
    );

    return res.status(200).json({
      success: true,
      summary: {
        activeProjects,
        currentDrawings,
        pendingAcknowledgments,
        openClarifications,
        atRiskRecipients: atRisk.length,
        overdueAcknowledgments,
        overduePeople,
      },
      pendingItems,
      atRisk: atRisk.slice(0, 6),
      recentActivity,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboardSummary };
