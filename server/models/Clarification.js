
const mongoose = require("mongoose");

const CLARIFICATION_STATUSES = ["open", "answered", "resolved"];

const clarificationSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    revision: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DrawingRevision",
      required: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    question: {
      type: String,
      required: [true, "Clarification question is required."],
      trim: true,
      minlength: 5,
      maxlength: 5000,
    },
    response: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: CLARIFICATION_STATUSES,
      default: "open",
      required: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

clarificationSchema.index({ project: 1, status: 1, createdAt: -1 });
clarificationSchema.index({ revision: 1, createdAt: -1 });
clarificationSchema.index({ requestedBy: 1, status: 1 });

module.exports = mongoose.model("Clarification", clarificationSchema);
module.exports.CLARIFICATION_STATUSES = CLARIFICATION_STATUSES;
