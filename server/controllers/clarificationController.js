
const mongoose = require("mongoose");

const Project = require("../models/Project");
const DrawingRevision = require("../models/DrawingRevision");
const Clarification = require("../models/Clarification");

const canAccessProject = (project, userId) => {
  return (
    String(project.supervisor) === String(userId) ||
    project.members.some(
      (member) => String(member.user) === String(userId)
    )
  );
};

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

    if (!project || !canAccessProject(project, req.user._id)) {
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

    if (typeof question !== "string" ||
        question.trim().length < 5 ||
        question.trim().length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Question must contain between 5 and 5000 characters.",
      });
    }

    const revision = await DrawingRevision.findById(revisionId);

    if (!revision || revision.status !== "published") {
      return res.status(404).json({
        success: false,
        message: "Published revision not found.",
      });
    }

    const project = await Project.findById(revision.project);

    if (!project || !canAccessProject(project, req.user._id)) {
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

    if (typeof response !== "string" ||
        response.trim().length < 1 ||
        response.trim().length > 5000) {
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

    return res.status(200).json({
      success: true,
      message: "Clarification response saved.",
      clarification,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listClarifications,
  createClarification,
  respondToClarification,
};
