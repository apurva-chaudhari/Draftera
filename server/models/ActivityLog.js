const mongoose = require("mongoose");

// Every meaningful action in a project is recorded here so the team can
// answer "who did what, and when" without relying on memory or chat history.
const ACTIVITY_ACTIONS = [
  "project_created",
  "member_added",
  "member_removed",
  "revision_uploaded",
  "revision_published",
  "revision_opened",
  "revision_acknowledged",
  "reminder_sent",
  "clarification_requested",
  "clarification_answered",
  "clarification_resolved",
];

const activityLogSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    revision: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DrawingRevision",
      default: null,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ACTIVITY_ACTIONS,
      required: true,
    },
    // Short human-readable sentence shown in the timeline.
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

activityLogSchema.index({ project: 1, createdAt: -1 });
activityLogSchema.index({ revision: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
module.exports.ACTIVITY_ACTIONS = ACTIVITY_ACTIONS;
