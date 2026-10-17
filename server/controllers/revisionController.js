
const mongoose = require("mongoose");

const Project = require("../models/Project");
const DrawingRevision = require("../models/DrawingRevision");
const Acknowledgment = require("../models/Acknowledgment");

const publishRevision = async (req, res, next) => {
  const { revisionId } = req.params;
  const { recipients } = req.body || {};

  if (!mongoose.isValidObjectId(revisionId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid revision ID.",
    });
  }

  if (
    !Array.isArray(recipients) ||
    recipients.length === 0 ||
    recipients.some((id) => typeof id !== "string" || !mongoose.isValidObjectId(id)) ||
    new Set(recipients).size !== recipients.length
  ) {
    return res.status(400).json({
      success: false,
      message: "Select at least one valid, unique recipient.",
    });
  }

  const session = await mongoose.startSession();

  try {
    let publishedRevision;

    await session.withTransaction(async () => {
      const revision = await DrawingRevision.findById(revisionId).session(session);

      if (!revision) {
        const error = new Error("Drawing revision not found.");
        error.statusCode = 404;
        throw error;
      }

      const project = await Project.findById(revision.project).session(session);

      if (!project) {
        const error = new Error("Project not found.");
        error.statusCode = 404;
        throw error;
      }

      if (String(project.supervisor) !== String(req.user._id)) {
        const error = new Error("Only the project supervisor can publish revisions.");
        error.statusCode = 403;
        throw error;
      }

      if (project.status !== "active") {
        const error = new Error("This project is not active.");
        error.statusCode = 400;
        throw error;
      }

      if (revision.status !== "draft") {
        const error = new Error("Only draft revisions can be published.");
        error.statusCode = 409;
        throw error;
      }

      const User = require("../models/User");
      const users = await User.find({
        _id: { $in: recipients },
        isActive: true,
      })
        .select("_id")
        .session(session);

      if (users.length !== recipients.length) {
        const error = new Error("One or more recipients are invalid or inactive.");
        error.statusCode = 400;
        throw error;
      }

      const allowedRecipientIds = new Set([
        String(project.supervisor),
        ...project.members.map((member) => String(member.user)),
      ]);

      if (recipients.some((id) => !allowedRecipientIds.has(id))) {
        const error = new Error("Every recipient must belong to this project.");
        error.statusCode = 400;
        throw error;
      }

      await DrawingRevision.updateMany(
        {
          drawing: revision.drawing,
          status: "published",
        },
        {
          $set: { status: "superseded" },
        },
        { session }
      );

      revision.recipients = recipients;
      revision.status = "published";
      revision.publishedBy = req.user._id;
      revision.publishedAt = new Date();

      await revision.save({ session });

      await Acknowledgment.insertMany(
        recipients.map((recipient) => ({
          project: revision.project,
          revision: revision._id,
          recipient,
          status: "pending",
        })),
        { session }
      );

      publishedRevision = revision.toObject();
    });

    return res.status(200).json({
      success: true,
      message: "Revision published. Acknowledgments are pending.",
      revision: publishedRevision,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  } finally {
    await session.endSession();
  }
};
const listProjectRevisions = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID.",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const userId = String(req.user._id);
    const isMember = project.members.some(
      (member) => String(member.user) === userId
    );

    if (String(project.supervisor) !== userId && !isMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
    }

    const revisions = await DrawingRevision.find({ project: projectId })
      .populate("drawing", "drawingNumber title")
      .sort({ createdAt: -1 })
      .select("-file.storageKey");

    return res.status(200).json({
      success: true,
      count: revisions.length,
      revisions,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { publishRevision, listProjectRevisions };