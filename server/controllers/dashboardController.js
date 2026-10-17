
const mongoose = require("mongoose");

const Project = require("../models/Project");
const Drawing = require("../models/Drawing");
const DrawingRevision = require("../models/DrawingRevision");
const Acknowledgment = require("../models/Acknowledgment");
const Clarification = require("../models/Clarification");

async function getDashboardSummary(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Find projects the authenticated user can access.
    const projects = await Project.find({
      $or: [
        { supervisor: userId },
        { "members.user": userId },
      ],
    })
      .select("_id")
      .lean();

    const projectIds = projects.map((project) => project._id);

    if (projectIds.length === 0) {
      return res.status(200).json({
        success: true,
        summary: {
          activeProjects: 0,
          currentDrawings: 0,
          pendingAcknowledgments: 0,
          openClarifications: 0,
        },
      });
    }

    const [
      activeProjects,
      currentDrawings,
      pendingAcknowledgments,
      openClarifications,
    ] = await Promise.all([
      Project.countDocuments({
        _id: { $in: projectIds },
        status: "active",
      }),

      DrawingRevision.countDocuments({
        project: { $in: projectIds },
        status: "published",
      }),

      Acknowledgment.countDocuments({
        project: { $in: projectIds },
        recipient: userId,
        status: "pending",
      }),

      Clarification.countDocuments({
        project: { $in: projectIds },
        status: "open",
      }),
    ]);

    return res.status(200).json({
      success: true,
      summary: {
        activeProjects,
        currentDrawings,
        pendingAcknowledgments,
        openClarifications,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getDashboardSummary };
