const mongoose = require("mongoose");

const Project = require("../models/Project");
const DrawingRevision = require("../models/DrawingRevision");
const Clarification = require("../models/Clarification");
const { getProjectAccess } = require("../utils/projectAccess");
const { logActivity } = require("../utils/activity");

const listClarifications = async (req, res, next) => {
  try {
    const { revisionId } = req.params;

    if (!mongoose.isValidObjectId(revisionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid revision ID.",
      });
    }

    const revision = await DrawingRevision.findById(revisionId);

    if (!revision) {
      return res.status(404).json({
        success: false,
        message: "Drawing revision not found.",
      });
    }

    const project = await Project.findById(revision.project);

    if (!project || !getProjectAccess(project, req.user._id).isMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
    }

    const clarifications = await Clarification.find({
      revision: revision._id,
    })
      .populate("requestedBy", "name email")
      .populate("respondedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clarifications.length,
      clarifications,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Clarifications relevant to the caller across all their projects:
 * supervisors see every clarification in projects they run; everyone else
 * sees the ones they raised.
 */
const listMyClarifications = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [{ supervisor: req.user._id }, { "members.user": req.user._id }],
    })
      .select("_id supervisor")
      .lean();

    const supervisedIds = projects
      .filter((p) => String(p.supervisor) === String(req.user._id))
      .map((p) => p._id);

    const clarifications = await Clarification.find({
      $or: [
        { project: { $in: supervisedIds } },
        { requestedBy: req.user._id },
      ],
    })
      .populate("requestedBy", "name")
      .populate("project", "name code")
      .populate({
        path: "revision",
        select: "revisionNumber status drawing",
        populate: { path: "drawing", select: "drawingNumber title" },
      })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({
      success: true,
      count: clarifications.length,
      clarifications,
    });
  } catch (error) {
    return next(error);
  }
};

const createClarification = async (req, res, next) => {
  try {
    const { revisionId } = req.params;
    const { question } = req.body || {};

    if (!mongoose.isValidObjectId(revisionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid revision ID.",
      });
    }

    if (
      typeof question !== "string" ||
      question.trim().length < 5 ||
      question.trim().length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: "Question must contain between 5 and 5000 characters.",
      });
    }

    const revision = await DrawingRevision.findById(revisionId).populate(
      "drawing",
      "drawingNumber"
    );

    if (!revision || !["published", "superseded"].includes(revision.status)) {
      return res.status(404).json({
        success: false,
        message: "Published revision not found.",
      });
    }

    const project = await Project.findById(revision.project);

    if (!project || !getProjectAccess(project, req.user._id).isMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
    }

    const clarification = await Clarification.create({
      project: revision.project,
      revision: revision._id,
      requestedBy: req.user._id,
      question: question.trim(),
    });

    await logActivity({
      project: revision.project,
      revision: revision._id,
      actor: req.user._id,
      action: "clarification_requested",
      message: `${req.user.name} asked a question about ${revision.drawing?.drawingNumber} Rev ${revision.revisionNumber}.`,
    });

    return res.status(201).json({
      success: true,
      message: "Clarification submitted.",
      clarification,
    });
  } catch (error) {
    return next(error);
  }
};

const respondToClarification = async (req, res, next) => {
  try {
    const { clarificationId } = req.params;
    const { response } = req.body || {};

    if (!mongoose.isValidObjectId(clarificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clarification ID.",
      });
    }

    if (
      typeof response !== "string" ||
      response.trim().length < 1 ||
      response.trim().length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message: "Response must contain between 1 and 5000 characters.",
      });
    }

    const clarification = await Clarification.findById(clarificationId);

    if (!clarification) {
      return res.status(404).json({
        success: false,
        message: "Clarification not found.",
      });
    }

    const project = await Project.findById(clarification.project);

    if (!project || String(project.supervisor) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the project supervisor can respond.",
      });
    }

    if (clarification.status === "resolved") {
      return res.status(409).json({
        success: false,
        message: "Resolved clarifications cannot be changed.",
      });
    }

    clarification.response = response.trim();
    clarification.respondedBy = req.user._id;
    clarification.respondedAt = new Date();
    clarification.status = "answered";

    await clarification.save();

    await logActivity({
      project: clarification.project,
      revision: clarification.revision,
      actor: req.user._id,
      action: "clarification_answered",
      message: `${req.user.name} answered a clarification.`,
    });

    return res.status(200).json({
      success: true,
      message: "Clarification response saved.",
      clarification,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Closing a clarification is an explicit act by the person who asked (they
 * know whether the answer actually solved their problem) or the supervisor.
 */
const resolveClarification = async (req, res, next) => {
  try {
    const { clarificationId } = req.params;

    if (!mongoose.isValidObjectId(clarificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clarification ID.",
      });
    }

    const clarification = await Clarification.findById(clarificationId);

    if (!clarification) {
      return res.status(404).json({
        success: false,
        message: "Clarification not found.",
      });
    }

    const project = await Project.findById(clarification.project);
    const isSupervisor =
      project && String(project.supervisor) === String(req.user._id);
    const isRequester =
      String(clarification.requestedBy) === String(req.user._id);

    if (!isSupervisor && !isRequester) {
      return res.status(403).json({
        success: false,
        message: "Only the person who asked or the supervisor can resolve this.",
      });
    }

    if (clarification.status !== "answered") {
      return res.status(409).json({
        success: false,
        message:
          clarification.status === "resolved"
            ? "This clarification is already resolved."
            : "A clarification can be resolved only after it has been answered.",
      });
    }

    clarification.status = "resolved";
    clarification.resolvedBy = req.user._id;
    clarification.resolvedAt = new Date();
    await clarification.save();

    await logActivity({
      project: clarification.project,
      revision: clarification.revision,
      actor: req.user._id,
      action: "clarification_resolved",
      message: `${req.user.name} resolved a clarification.`,
    });

    return res.status(200).json({
      success: true,
      message: "Clarification resolved.",
      clarification,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listClarifications,
  listMyClarifications,
  createClarification,
  respondToClarification,
  resolveClarification,
};
