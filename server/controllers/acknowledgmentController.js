const mongoose = require("mongoose");

const Acknowledgment = require("../models/Acknowledgment");
const DrawingRevision = require("../models/DrawingRevision");
const Project = require("../models/Project");
const User = require("../models/User");
const { logActivity } = require("../utils/activity");
const { getProjectAccess, findAccessibleProjectIds } = require("../utils/projectAccess");
const notifications = require("../services/notifications");

// A supervisor may nudge the same person about the same revision once per hour.
const REMINDER_COOLDOWN_MS = 60 * 60 * 1000;

const listMyAcknowledgments = async (req, res, next) => {
  try {
    // Someone removed from a project no longer sees its tasks. Their old
    // records stay in the database as history.
    const projectIds = await findAccessibleProjectIds(req.user._id);

    const acknowledgments = await Acknowledgment.find({
      recipient: req.user._id,
      project: { $in: projectIds },
    })
      .populate({
        path: "revision",
        select: "revisionNumber issueDate changeSummary status publishedAt ackDueAt drawing project",
        populate: {
          path: "drawing",
          select: "drawingNumber title",
        },
      })
      .populate("project", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: acknowledgments.length,
      acknowledgments,
    });
  } catch (error) {
    return next(error);
  }
};

const acknowledgeRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;

    if (!mongoose.isValidObjectId(revisionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid revision ID.",
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

    const acknowledgmentProject = await Project.findById(revision.project);

    if (
      !acknowledgmentProject ||
      !getProjectAccess(acknowledgmentProject, req.user._id).isMember
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
    }

    const acknowledgment = await Acknowledgment.findOne({
      revision: revision._id,
      recipient: req.user._id,
    });

    if (!acknowledgment) {
      return res.status(403).json({
        success: false,
        message: "You are not a recipient of this revision.",
      });
    }

    if (acknowledgment.status === "acknowledged") {
      return res.status(200).json({
        success: true,
        message: "This revision has already been acknowledged.",
        acknowledgment,
      });
    }

    // Acknowledging an out-of-date drawing would create a false sense of
    // safety, so it is refused and the user is pointed at the newer one.
    if (revision.status === "superseded") {
      return res.status(409).json({
        success: false,
        message:
          "This revision has been superseded. Open the latest revision of the drawing and acknowledge that instead.",
      });
    }

    // Acknowledgment must follow opening the file; otherwise "acknowledged"
    // would only mean "clicked a button", not "had access to the drawing".
    if (!acknowledgment.viewedAt) {
      return res.status(409).json({
        success: false,
        message: "Open the drawing before acknowledging it.",
      });
    }

    acknowledgment.status = "acknowledged";
    acknowledgment.acknowledgedAt = new Date();
    await acknowledgment.save();

    await logActivity({
      project: revision.project,
      revision: revision._id,
      actor: req.user._id,
      action: "revision_acknowledged",
      message: `${req.user.name} acknowledged ${revision.drawing?.drawingNumber} Rev ${revision.revisionNumber}.`,
    });

    return res.status(200).json({
      success: true,
      message: "Revision acknowledged successfully.",
      acknowledgment,
    });
  } catch (error) {
    return next(error);
  }
};

const sendReminder = async (req, res, next) => {
  try {
    const { revisionId, userId } = req.params;

    if (!mongoose.isValidObjectId(revisionId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid ID." });
    }

    const revision = await DrawingRevision.findById(revisionId).populate(
      "drawing",
      "drawingNumber"
    );
    const project = revision ? await Project.findById(revision.project) : null;

    if (!revision || !project) {
      return res.status(404).json({ success: false, message: "Revision not found." });
    }

    if (!getProjectAccess(project, req.user._id).isSupervisor) {
      return res.status(403).json({
        success: false,
        message: "Only the project supervisor can send reminders.",
      });
    }

    if (revision.status !== "published") {
      return res.status(409).json({
        success: false,
        message: "Reminders can only be sent for the current published revision.",
      });
    }

    const acknowledgment = await Acknowledgment.findOne({
      revision: revision._id,
      recipient: userId,
    });

    if (!acknowledgment) {
      return res.status(404).json({
        success: false,
        message: "That person is not a recipient of this revision.",
      });
    }

    if (!getProjectAccess(project, userId).isMember) {
      return res.status(409).json({
        success: false,
        message: "That person is no longer on the project team.",
      });
    }

    if (acknowledgment.status === "acknowledged") {
      return res.status(409).json({
        success: false,
        message: "This recipient has already acknowledged the revision.",
      });
    }

    if (
      acknowledgment.lastRemindedAt &&
      Date.now() - acknowledgment.lastRemindedAt.getTime() < REMINDER_COOLDOWN_MS
    ) {
      return res.status(429).json({
        success: false,
        message: "A reminder was already sent within the last hour.",
      });
    }

    acknowledgment.lastRemindedAt = new Date();
    acknowledgment.reminderCount += 1;
    await acknowledgment.save();

    const recipient = await User.findById(userId).select("name email");

    await logActivity({
      project: revision.project,
      revision: revision._id,
      actor: req.user._id,
      action: "reminder_sent",
      message: `${req.user.name} sent a reminder to ${recipient?.name} for ${revision.drawing?.drawingNumber} Rev ${revision.revisionNumber}.`,
    });

    // Awaited (it has a short timeout) so the supervisor is told the truth:
    // emailed, or only recorded because email is not set up.
    const delivery = recipient
      ? await notifications.notifyReminder({
          project,
          revision,
          drawingNumber: revision.drawing?.drawingNumber,
          user: recipient,
          actor: req.user,
          overdue: Boolean(revision.ackDueAt && revision.ackDueAt < new Date()),
        })
      : { sent: false };

    return res.status(200).json({
      success: true,
      emailed: delivery.sent,
      message: delivery.sent
        ? `Reminder emailed to ${recipient.name}.`
        : `Reminder recorded for ${recipient?.name}. No email was sent${
            delivery.reason === "not_configured" ? " because email is not set up" : ""
          }.`,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listMyAcknowledgments,
  acknowledgeRevision,
  sendReminder,
};
