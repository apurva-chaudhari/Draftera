
const mongoose = require("mongoose");

const USER_ROLES = [
  "admin",
  "project_supervisor",
  "site_engineer",
  "subcontractor",
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address.",
      ],
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required."],
      select: false,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      default: "site_engineer",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


module.exports = mongoose.model("User", userSchema);
module.exports.USER_ROLES = USER_ROLES;
