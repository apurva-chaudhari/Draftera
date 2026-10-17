
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
    acknowledgedAt: {
      type: Date,
      default: null,
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
