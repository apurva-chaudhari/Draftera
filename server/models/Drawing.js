
const mongoose = require("mongoose");

const drawingSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    drawingNumber: {
      type: String,
      required: [true, "Drawing number is required."],
      trim: true,
      uppercase: true,
      maxlength: 100,
    },
    title: {
      type: String,
      required: [true, "Drawing title is required."],
      trim: true,
      minlength: 2,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
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

// A drawing number must be unique within its project.
drawingSchema.index(
  { project: 1, drawingNumber: 1 },
  { unique: true }
);

drawingSchema.index({ project: 1, title: 1 });

module.exports = mongoose.model("Drawing", drawingSchema);
