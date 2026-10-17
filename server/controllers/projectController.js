
const Project = require("../models/Project");

const createProject = async (req, res, next) => {
  try {
    // Subcontractors cannot create projects.
    const allowedRoles = [
      "admin",
      "project_supervisor",
      "site_engineer",
    ];

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to create projects.",
      });
    }

    const { name, code, description = "" } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof code !== "string" ||
      !name.trim() ||
      !code.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Project name and project code are required.",
      });
    }

    if (typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Project description must be text.",
      });
    }

    const normalizedName = name.trim();
    const normalizedCode = code.trim().toUpperCase();
    const normalizedDescription = description.trim();

    if (normalizedName.length < 2 || normalizedName.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Project name must contain 2–150 characters.",
      });
    }

    if (
      normalizedCode.length < 2 ||
      normalizedCode.length > 30 ||
      !/^[A-Z0-9][A-Z0-9_-]*$/.test(normalizedCode)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Project code must be 2–30 characters and contain only letters, numbers, hyphens, or underscores.",
      });
    }

    if (normalizedDescription.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Project description cannot exceed 2000 characters.",
      });
    }

    const existingProject = await Project.findOne({
      code: normalizedCode,
    }).lean();

    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: "A project with this code already exists.",
      });
    }

    const project = await Project.create({
      name: normalizedName,
      code: normalizedCode,
      description: normalizedDescription,
      supervisor: req.user._id,
      createdBy: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "project_supervisor",
          addedBy: req.user._id,
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully.",
      project,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A project with this code already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({
      $or: [
        { supervisor: req.user._id },
        { "members.user": req.user._id },
      ],
    })
      .populate("supervisor", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
};
