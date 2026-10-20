
const crypto = require("crypto");
const path = require("path");

const Project = require("../models/Project");
const { canDo, blockedMessage } = require("../utils/projectRules");
const Drawing = require("../models/Drawing");
const DrawingRevision = require("../models/DrawingRevision");
const supabase = require("../config/storage");
const { logActivity } = require("../utils/activity");

const uploadDrawingRevision = async (req, res, next) => {
  let uploadedStorageKey;

  try {
    const {
      projectId,
      drawingNumber,
      title,
      description = "",
      revisionNumber,
      issueDate,
      changeSummary,
    } = req.body || {};

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a PDF drawing.",
      });
    }

    if (
      !projectId ||
      !/^[a-f\d]{24}$/i.test(projectId) ||
      typeof drawingNumber !== "string" ||
      typeof title !== "string" ||
      typeof revisionNumber !== "string" ||
      typeof issueDate !== "string" ||
      typeof changeSummary !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required drawing details.",
      });
    }

    const normalizedDrawingNumber = drawingNumber.trim().toUpperCase();
    const normalizedTitle = title.trim();
    const normalizedRevisionNumber = revisionNumber.trim().toUpperCase();
    const normalizedSummary = changeSummary.trim();
    const normalizedDescription =
      typeof description === "string" ? description.trim() : null;

    if (
      normalizedDrawingNumber.length < 1 ||
      normalizedDrawingNumber.length > 100 ||
      normalizedTitle.length < 2 ||
      normalizedTitle.length > 200 ||
      normalizedRevisionNumber.length < 1 ||
      normalizedRevisionNumber.length > 30 ||
      normalizedSummary.length < 3 ||
      normalizedSummary.length > 5000 ||
      normalizedDescription === null ||
      normalizedDescription.length > 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more drawing details are invalid.",
      });
    }

    const parsedIssueDate = new Date(issueDate);

    if (
      Number.isNaN(parsedIssueDate.getTime()) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(issueDate) ||
      parsedIssueDate.toISOString().slice(0, 10) !== issueDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid issue date in YYYY-MM-DD format.",
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
    const isSupervisor = String(project.supervisor) === userId;
    const isProjectMember = project.members.some(
      (member) => String(member.user) === userId
    );

    if (!isSupervisor && !isProjectMember) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project.",
      });
    }

    if (
      !isSupervisor &&
      !project.members.some(
        (member) =>
          String(member.user) === userId &&
          member.role === "project_supervisor"
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Only project supervisors can upload drawing revisions.",
      });
    }

    if (!canDo(project.status, "upload")) {
      return res.status(409).json({
        success: false,
        message: blockedMessage(project.status, "upload"),
      });
    }

    const existingDrawing = await Drawing.findOne({
      project: project._id,
      drawingNumber: normalizedDrawingNumber,
    });

    if (
      existingDrawing &&
      (await DrawingRevision.exists({
        drawing: existingDrawing._id,
        revisionNumber: normalizedRevisionNumber,
      }))
    ) {
      return res.status(409).json({
        success: false,
        message: "This revision number already exists for the drawing.",
      });
    }

    const storageKey = [
      String(project._id),
      crypto.randomUUID(),
      path.basename(req.file.originalname).replace(/[^\w.-]/g, "_"),
    ].join("/");

    const { error: storageError } = await supabase.storage
      .from("drawing-revisions")
      .upload(storageKey, req.file.buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageError) {
      return res.status(502).json({
        success: false,
        message: "The PDF could not be saved to secure storage.",
      });
    }

    uploadedStorageKey = storageKey;

    let drawing = existingDrawing;

    if (!drawing) {
      drawing = await Drawing.create({
        project: project._id,
        drawingNumber: normalizedDrawingNumber,
        title: normalizedTitle,
        description: normalizedDescription,
        createdBy: req.user._id,
      });
    }

    const revision = await DrawingRevision.create({
      project: project._id,
      drawing: drawing._id,
      revisionNumber: normalizedRevisionNumber,
      issueDate: parsedIssueDate,
      changeSummary: normalizedSummary,
      file: {
        storageKey,
        originalName: path.basename(req.file.originalname).slice(0, 255),
        mimeType: "application/pdf",
        sizeBytes: req.file.size,
      },
      status: "draft",
      createdBy: req.user._id,
    });

    await logActivity({
      project: project._id,
      revision: revision._id,
      actor: req.user._id,
      action: "revision_uploaded",
      message: `${req.user.name} uploaded ${drawing.drawingNumber} Rev ${revision.revisionNumber} as a draft.`,
    });

    return res.status(201).json({
      success: true,
      message: "Drawing revision uploaded as a draft.",
      drawing,
      revision,
    });
  } catch (error) {
    if (uploadedStorageKey) {
      try {
        await supabase.storage
          .from("drawing-revisions")
          .remove([uploadedStorageKey]);
      } catch (cleanupError) {
        console.error("Storage cleanup failed after upload error.");
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This drawing or revision number already exists.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "The drawing details are invalid.",
      });
    }

    return next(error);
  }
};

module.exports = { uploadDrawingRevision };
