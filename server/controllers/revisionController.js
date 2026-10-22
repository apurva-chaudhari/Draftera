const mongoose = require("mongoose");

const Project = require("../models/Project");
const { canDo, blockedMessage } = require("../utils/projectRules");
const { activityScope, isScopedToIssued, myStatusFor } = require("../utils/roleScope");
const User = require("../models/User");
const Drawing = require("../models/Drawing");
const DrawingRevision = require("../models/DrawingRevision");
const Acknowledgment = require("../models/Acknowledgment");
const Clarification = require("../models/Clarification");
const ActivityLog = require("../models/ActivityLog");
const supabase = require("../config/storage");
const { getProjectAccess } = require("../utils/projectAccess");
const { logActivity } = require("../utils/activity");
const notifications = require("../services/notifications");
const { askAboutDrawing } = require("../services/drawingAssistant");

const STORAGE_BUCKET = "drawing-revisions";

// Deadlines a supervisor may set when publishing (hours after publishing).
const ALLOWED_DUE_HOURS = [24, 48, 72, 168];
const SIGNED_URL_SECONDS = 120;

// Small helper so transaction code can fail with an HTTP status.
function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

const publishRevision = async (req, res, next) => {
  const { revisionId } = req.params;
  const { recipients, dueInHours = null } = req.body || {};

  if (!mongoose.isValidObjectId(revisionId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid revision ID.",
    });
  }

  if (dueInHours !== null && !ALLOWED_DUE_HOURS.includes(dueInHours)) {
    return res.status(400).json({
      success: false,
      message: "Choose a valid acknowledgment deadline or none.",
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
    let drawingNumber;
    let supersededNumbers = [];
    let projectInfo;

    // Publishing, superseding the old revision and creating one pending
    // acknowledgment per recipient must succeed or fail together.
    await session.withTransaction(async () => {
      const revision = await DrawingRevision.findById(revisionId).session(session);

      if (!revision) throw httpError(404, "Drawing revision not found.");

      const project = await Project.findById(revision.project).session(session);

      if (!project) throw httpError(404, "Project not found.");

      projectInfo = { _id: project._id, name: project.name, code: project.code };

      if (String(project.supervisor) !== String(req.user._id)) {
        throw httpError(403, "Only the project supervisor can publish revisions.");
      }

      if (!canDo(project.status, "publish")) {
        throw httpError(409, blockedMessage(project.status, "publish"));
      }

      if (revision.status !== "draft") {
        throw httpError(409, "Only draft revisions can be published.");
      }

      const users = await User.find({
        _id: { $in: recipients },
        isActive: true,
      })
        .select("_id")
        .session(session);

      if (users.length !== recipients.length) {
        throw httpError(400, "One or more recipients are invalid or inactive.");
      }

      const allowedRecipientIds = new Set([
        String(project.supervisor),
        ...project.members.map((member) => String(member.user)),
      ]);

      if (recipients.some((id) => !allowedRecipientIds.has(id))) {
        throw httpError(400, "Every recipient must belong to this project.");
      }

      const previous = await DrawingRevision.find({
        drawing: revision.drawing,
        status: "published",
      })
        .select("revisionNumber")
        .session(session);

      supersededNumbers = previous.map((r) => r.revisionNumber);

      await DrawingRevision.updateMany(
        { drawing: revision.drawing, status: "published" },
        { $set: { status: "superseded" } },
        { session }
      );

      revision.recipients = recipients;
      revision.status = "published";
      revision.publishedBy = req.user._id;
      revision.publishedAt = new Date();
      revision.ackDueAt = dueInHours
        ? new Date(revision.publishedAt.getTime() + dueInHours * 3600000)
        : null;

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

      const drawing = await Drawing.findById(revision.drawing)
        .select("drawingNumber")
        .session(session);
      drawingNumber = drawing?.drawingNumber;

      const supersedeNote = supersededNumbers.length
        ? ` It supersedes Rev ${supersededNumbers.join(", ")}.`
        : "";

      // The audit record is written inside the transaction, so a published
      // revision can never exist without its audit entry.
      await logActivity(
        {
          project: revision.project,
          revision: revision._id,
          actor: req.user._id,
          action: "revision_published",
          message: `${req.user.name} published ${drawingNumber} Rev ${revision.revisionNumber} to ${recipients.length} recipient(s).${supersedeNote}`,
        },
        { session }
      );

      publishedRevision = revision.toObject();
    });

    // After the transaction has committed; failures here never affect it.
    notifications.notifyRevisionPublished({
      project: projectInfo,
      revision: publishedRevision,
      drawingNumber,
      recipientIds: recipients,
      actor: req.user,
      supersededNumbers,
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

    const access = getProjectAccess(project, req.user._id);

    if (!access.isMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
    }

    // Drafts are the supervisor's working area; the rest of the team only
    // sees revisions that have actually been issued.
    const filter = { project: projectId };
    if (!access.isSupervisor) filter.status = { $ne: "draft" };

    // Everyone but the supervisor sees their own standing, not the team's.
    // Subcontractors only see drawings that were issued to them.
    let mine = null;
    if (!access.isSupervisor) {
      const myAcknowledgments = await Acknowledgment.find({
        project: project._id,
        recipient: req.user._id,
      })
        .select("revision status viewedAt")
        .lean();

      mine = new Map(myAcknowledgments.map((a) => [String(a.revision), a]));

      if (isScopedToIssued(access.memberRole)) {
        filter._id = { $in: [...mine.keys()] };
      }
    }

    const revisions = await DrawingRevision.find(filter)
      .populate("drawing", "drawingNumber title")
      .sort({ createdAt: -1 })
      .select("-file.storageKey")
      .lean();

    // One aggregate gives acknowledgment progress for every revision.
    const progress = !access.isSupervisor ? [] : await Acknowledgment.aggregate([
      { $match: { project: project._id } },
      {
        $group: {
          _id: "$revision",
          total: { $sum: 1 },
          acknowledged: {
            $sum: { $cond: [{ $eq: ["$status", "acknowledged"] }, 1, 0] },
          },
          opened: {
            $sum: { $cond: [{ $ne: ["$viewedAt", null] }, 1, 0] },
          },
        },
      },
    ]);

    const progressByRevision = new Map(
      progress.map((p) => [String(p._id), p])
    );

    const withProgress = revisions.map((revision) => {
      if (mine) {
        return { ...revision, myStatus: myStatusFor(mine.get(String(revision._id))) };
      }

      const p = progressByRevision.get(String(revision._id));
      return {
        ...revision,
        ackSummary: {
          total: p?.total || 0,
          acknowledged: p?.acknowledged || 0,
          opened: p?.opened || 0,
        },
      };
    });

    return res.status(200).json({
      success: true,
      count: withProgress.length,
      revisions: withProgress,
    });
  } catch (error) {
    return next(error);
  }
};

/** Load a revision plus its project, enforcing membership and draft rules. */
async function loadRevisionForUser(req, res) {
  const { revisionId } = req.params;

  if (!mongoose.isValidObjectId(revisionId)) {
    res.status(400).json({ success: false, message: "Invalid revision ID." });
    return null;
  }

  const revision = await DrawingRevision.findById(revisionId);
  const project = revision ? await Project.findById(revision.project) : null;

  if (!revision || !project) {
    res.status(404).json({ success: false, message: "Drawing revision not found." });
    return null;
  }

  const access = getProjectAccess(project, req.user._id);

  if (!access.isMember) {
    res.status(403).json({
      success: false,
      message: "You do not have access to this project.",
    });
    return null;
  }

  if (revision.status === "draft" && !access.isSupervisor) {
    res.status(404).json({ success: false, message: "Drawing revision not found." });
    return null;
  }

  // Need to know: a subcontractor can only open what was issued to them.
  // Answer "not found", not "forbidden", so they cannot probe for drawings.
  if (isScopedToIssued(access.memberRole)) {
    const issued = await Acknowledgment.exists({
      revision: revision._id,
      recipient: req.user._id,
    });

    if (!issued) {
      res.status(404).json({ success: false, message: "Drawing revision not found." });
      return null;
    }
  }

  return { revision, project, access };
}

const getRevisionDetail = async (req, res, next) => {
  try {
    const loaded = await loadRevisionForUser(req, res);
    if (!loaded) return undefined;

    const { revision, project, access } = loaded;

    // What this person may know about other people's progress and about
    // drawings that were not issued to them (see utils/roleScope.js).
    const issuedRevisionIds = access.isSupervisor
      ? []
      : await Acknowledgment.find({ project: project._id, recipient: req.user._id }).distinct("revision");

    const [
      drawing,
      acknowledgments,
      clarifications,
      activity,
      currentRevision,
      publisher,
      history,
    ] = await Promise.all([
      Drawing.findById(revision.drawing).select("drawingNumber title description").lean(),
      Acknowledgment.find({ revision: revision._id })
        .populate("recipient", "name email")
        .sort({ createdAt: 1 })
        .lean(),
      Clarification.find({ revision: revision._id })
        .populate("requestedBy", "name")
        .populate("respondedBy", "name")
        .sort({ createdAt: -1 })
        .lean(),
      ActivityLog.find({
        revision: revision._id,
        ...activityScope({ ...access, userId: req.user._id, issuedRevisionIds }),
      })
        .populate("actor", "name")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      // The newest published revision of the same drawing, if this one was
      // replaced. Lets the UI warn "do not build from this".
      revision.status === "superseded"
        ? DrawingRevision.findOne({ drawing: revision.drawing, status: "published" })
            .select("revisionNumber publishedAt")
            .lean()
        : null,
      revision.publishedBy
        ? User.findById(revision.publishedBy).select("name").lean()
        : null,
      // Every revision of this drawing, newest first, so the reader can see
      // how the drawing changed over time. Drafts stay private.
      DrawingRevision.find({
        drawing: revision.drawing,
        ...(access.isSupervisor ? {} : { status: { $ne: "draft" } }),
        ...(isScopedToIssued(access.memberRole) ? { _id: { $in: issuedRevisionIds } } : {}),
      })
        .select("revisionNumber status issueDate publishedAt changeSummary")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const roleByUser = new Map(
      project.members.map((m) => [String(m.user), m.role])
    );

    const withRole = acknowledgments.map((ack) => ({
      ...ack,
      recipientRole: roleByUser.get(String(ack.recipient?._id)) || null,
    }));

    const myAcknowledgment =
      withRole.find((ack) => String(ack.recipient?._id) === String(req.user._id)) ||
      null;

    // Only the supervisor sees every recipient's status; others see their own.
    const visibleAcknowledgments = access.isSupervisor
      ? withRole
      : myAcknowledgment
        ? [myAcknowledgment]
        : [];

    // Clarifications are visible to the whole project team on purpose: a
    // shared answer stops the same question being asked and answered twice.
    const revisionObject = revision.toObject();
    delete revisionObject.file.storageKey;

    return res.status(200).json({
      success: true,
      revision: {
        ...revisionObject,
        drawing,
        publishedByName: publisher?.name || null,
      },
      project: { _id: project._id, name: project.name, code: project.code },
      supersededBy: currentRevision,
      access,
      history,
      myAcknowledgment,
      acknowledgments: visibleAcknowledgments,
      clarifications,
      activity,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Issue a short-lived signed link to the drawing PDF and record that this
 * recipient opened it. Files are never publicly addressable.
 */
const openRevisionFile = async (req, res, next) => {
  try {
    const loaded = await loadRevisionForUser(req, res);
    if (!loaded) return undefined;

    const { revision } = loaded;

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(revision.file.storageKey, SIGNED_URL_SECONDS);

    if (error || !data?.signedUrl) {
      return res.status(502).json({
        success: false,
        message: "The drawing file could not be retrieved from storage.",
      });
    }

    // Record first view for recipients of the current published revision.
    if (revision.status === "published") {
      const firstView = await Acknowledgment.findOneAndUpdate(
        { revision: revision._id, recipient: req.user._id, viewedAt: null },
        { $set: { viewedAt: new Date() } }
      );

      if (firstView) {
        const drawing = await Drawing.findById(revision.drawing).select("drawingNumber");
        await logActivity({
          project: revision.project,
          revision: revision._id,
          actor: req.user._id,
          action: "revision_opened",
          message: `${req.user.name} opened ${drawing?.drawingNumber} Rev ${revision.revisionNumber}.`,
        });
      }
    }

    return res.status(200).json({
      success: true,
      url: data.signedUrl,
      expiresInSeconds: SIGNED_URL_SECONDS,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Add recipients to a revision that is already published, e.g. someone who
 * was left off the original distribution list. Each new recipient gets their
 * own pending acknowledgment; existing ones are untouched.
 */
const addRecipients = async (req, res, next) => {
  try {
    const { revisionId } = req.params;
    const { recipients } = req.body || {};

    if (!mongoose.isValidObjectId(revisionId)) {
      return res.status(400).json({ success: false, message: "Invalid revision ID." });
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

    const revision = await DrawingRevision.findById(revisionId).populate(
      "drawing",
      "drawingNumber"
    );
    const project = revision ? await Project.findById(revision.project) : null;

    if (!revision || !project) {
      return res.status(404).json({ success: false, message: "Drawing revision not found." });
    }

    if (!getProjectAccess(project, req.user._id).isSupervisor) {
      return res.status(403).json({
        success: false,
        message: "Only the project supervisor can add recipients.",
      });
    }

    if (!canDo(project.status, "issue")) {
      return res.status(409).json({
        success: false,
        message: blockedMessage(project.status, "issue"),
      });
    }

    // Sending a superseded drawing to someone new would recreate the exact
    // confusion this product exists to prevent.
    if (revision.status !== "published") {
      return res.status(409).json({
        success: false,
        message: "Recipients can only be added to the current published revision.",
      });
    }

    const memberIds = new Set(project.members.map((m) => String(m.user)));
    const existing = new Set(revision.recipients.map(String));
    const fresh = recipients.filter((id) => !existing.has(id));

    if (fresh.some((id) => !memberIds.has(id))) {
      return res.status(400).json({
        success: false,
        message: "Every recipient must belong to this project.",
      });
    }

    if (fresh.length === 0) {
      return res.status(409).json({
        success: false,
        message: "Those people have already received this revision.",
      });
    }

    const users = await User.find({ _id: { $in: fresh }, isActive: true }).select("name");

    if (users.length !== fresh.length) {
      return res.status(400).json({
        success: false,
        message: "One or more recipients are invalid or inactive.",
      });
    }

    await Acknowledgment.insertMany(
      fresh.map((recipient) => ({
        project: revision.project,
        revision: revision._id,
        recipient,
        status: "pending",
      }))
    );

    revision.recipients.push(...fresh);
    await revision.save();

    await logActivity({
      project: revision.project,
      revision: revision._id,
      actor: req.user._id,
      action: "revision_published",
      message: `${req.user.name} issued ${revision.drawing?.drawingNumber} Rev ${revision.revisionNumber} to ${users.map((u) => u.name).join(", ")}.`,
    });

    notifications.notifyRevisionPublished({
      project,
      revision,
      drawingNumber: revision.drawing?.drawingNumber,
      recipientIds: fresh,
      actor: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `Revision issued to ${users.map((u) => u.name).join(", ")}.`,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "One of those people already has an acknowledgment record.",
      });
    }

    return next(error);
  }
};

/**
 * Ask the AI assistant a question about one revision's PDF. Same access rules
 * as opening the revision; asking never counts as opening it (no receipt
 * evidence is recorded), because an AI summary is not the drawing.
 */
const askDrawingQuestion = async (req, res, next) => {
  try {
    const loaded = await loadRevisionForUser(req, res);
    if (!loaded) return undefined;

    const question = String(req.body?.question || "").trim();
    if (question.length < 3 || question.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Please ask a question between 3 and 500 characters.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "The AI assistant is not set up on this server.",
      });
    }

    const { revision } = loaded;
    const drawing = await Drawing.findById(revision.drawing).select("drawingNumber title").lean();

    const answer = await askAboutDrawing({
      storageKey: revision.file.storageKey,
      question,
      record: {
        drawingNumber: drawing?.drawingNumber || "",
        title: drawing?.title || "",
        revisionNumber: revision.revisionNumber,
        changeSummary: revision.changeSummary,
      },
    });

    return res.status(200).json({ success: true, answer });
  } catch (error) {
    if (error.userMessage) {
      return res.status(error.status || 502).json({ success: false, message: error.userMessage });
    }
    return next(error);
  }
};

module.exports = {
  publishRevision,
  listProjectRevisions,
  getRevisionDetail,
  openRevisionFile,
  addRecipients,
  askDrawingQuestion,
};
