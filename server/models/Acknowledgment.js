
const mongoose = require("mongoose");

const ACKNOWLEDGMENT_STATUSES = ["pending", "acknowledged"];

const acknowledgmentSchema = new mongoose.Schema(
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
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ACKNOWLEDGMENT_STATUSES,
      default: "pending",
      required: true,
    },
    // First time the recipient opened the drawing file. This is the only
    // "delivery evidence" the system has: a sent message is not a seen one.
    viewedAt: {
      type: Date,
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    // Supervisor follow-ups, so repeated nudging is visible and rate limited.
    lastRemindedAt: {
      type: Date,
      default: null,
    },
    reminderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// A recipient gets exactly one acknowledgment record per revision.
acknowledgmentSchema.index(
  { revision: 1, recipient: 1 },
  { unique: true }
);

acknowledgmentSchema.index({ project: 1, status: 1 });
acknowledgmentSchema.index({ recipient: 1, status: 1 });

module.exports = mongoose.model("Acknowledgment", acknowledgmentSchema);
module.exports.ACKNOWLEDGMENT_STATUSES = ACKNOWLEDGMENT_STATUSES;
