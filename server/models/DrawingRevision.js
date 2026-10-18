
const mongoose = require("mongoose");

const REVISION_STATUSES = ["draft", "published", "superseded"];

const drawingRevisionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    drawing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Drawing",
      required: true,
    },
    revisionNumber: {
      type: String,
      required: [true, "Revision identifier is required."],
      trim: true,
      uppercase: true,
      maxlength: 30,
    },
    issueDate: {
      type: Date,
      required: [true, "Issue date is required."],
    },
    changeSummary: {
      type: String,
      required: [true, "Change summary is required."],
      trim: true,
      minlength: 3,
      maxlength: 5000,
    },
    file: {
      storageKey: {
        type: String,
        required: [true, "Drawing file storage key is required."],
        trim: true,
        maxlength: 500,
      },
      originalName: {
        type: String,
        required: [true, "Original file name is required."],
        trim: true,
        maxlength: 255,
      },
      mimeType: {
        type: String,
        required: [true, "File MIME type is required."],
        enum: ["application/pdf"],
      },
      sizeBytes: {
        type: Number,
        required: true,
        min: 1,
      },
    },
    status: {
      type: String,
      enum: REVISION_STATUSES,
      default: "draft",
      required: true,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    // Optional deadline for recipients to acknowledge. After this time an
    // unacknowledged revision is reported as overdue.
    ackDueAt: {
      type: Date,
      default: null,
    },
    recipients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// A revision identifier cannot be duplicated for the same drawing.
drawingRevisionSchema.index(
  { drawing: 1, revisionNumber: 1 },
  { unique: true }
);

drawingRevisionSchema.index({ project: 1, status: 1, publishedAt: -1 });

drawingRevisionSchema.index({ recipients: 1, status: 1 });

module.exports = mongoose.model("DrawingRevision", drawingRevisionSchema);
module.exports.REVISION_STATUSES = REVISION_STATUSES;
