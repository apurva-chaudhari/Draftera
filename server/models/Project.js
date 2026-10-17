
const mongoose = require("mongoose");

const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"];

const projectMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["project_supervisor", "site_engineer", "subcontractor"],
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required."],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    code: {
      type: String,
      required: [true, "Project code is required."],
      trim: true,
      uppercase: true,
      minlength: 2,
      maxlength: 30,
      match: [
        /^[A-Z0-9][A-Z0-9_-]*$/,
        "Project code may contain letters, numbers, hyphens, and underscores.",
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: "active",
      required: true,
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [projectMemberSchema],
      default: [],
    },
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

projectSchema.index({ code: 1 }, { unique: true });
projectSchema.index({ supervisor: 1, status: 1 });
projectSchema.index({ "members.user": 1, status: 1 });

module.exports = mongoose.model("Project", projectSchema);
module.exports.PROJECT_STATUSES = PROJECT_STATUSES;
