const mongoose = require("mongoose");

const Project = require("../models/Project");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const Clarification = require("../models/Clarification");
const { getProjectAccess } = require("../utils/projectAccess");
const { logActivity } = require("../utils/activity");
const { loadProjectCurrency } = require("../services/currencyService");
const { buildDistributionCsv } = require("../utils/report");
const notifications = require("../services/notifications");
const { PROJECT_STATUSES, STATUS_LABELS, canDo, blockedMessage } = require("../utils/projectRules");
const { activityScope, isScopedToIssued } = require("../utils/roleScope");
const Acknowledgment = require("../models/Acknowledgment");

// Roles a supervisor may grant when adding someone to a project team.
const ASSIGNABLE_MEMBER_ROLES = ["site_engineer", "subcontractor"];

const createProject = async (req, res, next) => {
  try {
    // Subcontractors cannot create projects.
    const allowedRoles = ["admin", "project_supervisor", "site_engineer"];

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

    await logActivity({
      project: project._id,
      actor: req.user._id,
      action: "project_created",
      message: `${req.user.name} created project ${project.code}.`,
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
      $or: [{ supervisor: req.user._id }, { "members.user": req.user._id }],
    })
      .populate("supervisor", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Tell the client what the caller's role is in each project.
    const withRole = projects.map((project) => ({
      ...project,
      myRole: getProjectAccess(project, req.user._id).memberRole,
      memberCount: project.members.length,
    }));

    return res.status(200).json({
      success: true,
      count: withRole.length,
      projects: withRole,
    });
  } catch (error) {
    return next(error);
  }
};

/** Load a project and confirm the caller belongs to it. */
async function loadAccessibleProject(req, res) {
  const { projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    res.status(400).json({ success: false, message: "Invalid project ID." });
    return null;
  }

  const project = await Project.findById(projectId);

  if (!project) {
    res.status(404).json({ success: false, message: "Project not found." });
    return null;
  }

  const access = getProjectAccess(project, req.user._id);

  if (!access.isMember) {
    res.status(403).json({
      success: false,
      message: "You do not have access to this project.",
    });
    return null;
  }

  return { project, access };
}

const getProjectById = async (req, res, next) => {
  try {
    const loaded = await loadAccessibleProject(req, res);
    if (!loaded) return undefined;

    const project = await Project.findById(loaded.project._id)
      .populate("supervisor", "name email")
      .populate("members.user", "name email")
      .lean();

    return res.status(200).json({
      success: true,
      project,
      access: loaded.access,
    });
  } catch (error) {
    return next(error);
  }
};

const addProjectMember = async (req, res, next) => {
  try {
    const loaded = await loadAccessibleProject(req, res);
    if (!loaded) return undefined;

    const { project, access } = loaded;

    if (!access.isSupervisor) {
      return res.status(403).json({
        success: false,
        message: "Only the project supervisor can add team members.",
      });
    }

    if (!canDo(project.status, "addMember")) {
      return res.status(409).json({
        success: false,
        message: blockedMessage(project.status, "addMember"),
      });
    }

    const { email, role } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Enter the email address of a registered user.",
      });
    }

    if (!ASSIGNABLE_MEMBER_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Choose a role: site engineer or subcontractor.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
      isActive: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No registered user has that email. Ask them to create a Draftera account first.",
      });
    }

    // The $ne guard makes the "already a member" check atomic.
    const result = await Project.updateOne(
      { _id: project._id, "members.user": { $ne: user._id } },
      {
        $push: {
          members: { user: user._id, role, addedBy: req.user._id },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).json({
        success: false,
        message: "This person is already on the project team.",
      });
    }

    await logActivity({
      project: project._id,
      actor: req.user._id,
      action: "member_added",
      message: `${req.user.name} added ${user.name} as ${role.replace("_", " ")}.`,
    });

    notifications.notifyAddedToProject({ project, user, role, actor: req.user });

    return res.status(201).json({
      success: true,
      message: `${user.name} added to the project.`,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Remove someone from a project team (supervisor only).
 *
 * The person loses access immediately because every permission check reads
 * the project's member list. Their past acknowledgments, questions and audit
 * entries are deliberately kept: they are the project's record of who was
 * told what, and deleting them would rewrite history.
 */
const removeProjectMember = async (req, res, next) => {
  try {
    const loaded = await loadAccessibleProject(req, res);
    if (!loaded) return undefined;

    const { project, access } = loaded;

    if (!access.isSupervisor) {
      return res.status(403).json({
        success: false,
        message: "Only the project supervisor can remove team members.",
      });
    }

    if (!canDo(project.status, "removeMember")) {
      return res.status(409).json({
        success: false,
        message: blockedMessage(project.status, "removeMember"),
      });
    }

    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    // Removing the supervisor would leave the project with nobody able to
    // manage it, so it is not allowed.
    if (String(project.supervisor) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "The project supervisor cannot be removed.",
      });
    }

    const member = project.members.find((m) => String(m.user) === String(userId));

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "That person is not on the project team.",
      });
    }

    // Atomic: only succeeds if they are still a member and not the supervisor.
    const result = await Project.updateOne(
      {
        _id: project._id,
        supervisor: { $ne: userId },
        "members.user": userId,
      },
      { $pull: { members: { user: userId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "That person is not on the project team.",
      });
    }

    const user = await User.findById(userId).select("name email");
    const name = user?.name || "A team member";

    await logActivity({
      project: project._id,
      actor: req.user._id,
      action: "member_removed",
      message: `${req.user.name} removed ${name} (${member.role.replace("_", " ")}) from the project.`,
    });

    if (user) {
      notifications.notifyRemovedFromProject({ project, user, actor: req.user });
    }

    return res.status(200).json({
      success: true,
      message: `${name} removed from the project.`,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Change a project's status, name or description (supervisor only).
 *
 * The project code is fixed on purpose: it appears on every drawing record
 * and in reports, so renaming it would make old records hard to match.
 * Changing the status takes effect at once (see utils/projectRules.js) and
 * the team is told by email.
 */
const updateProject = async (req, res, next) => {
  try {
    const loaded = await loadAccessibleProject(req, res);
    if (!loaded) return undefined;

    const { project, access } = loaded;

    if (!access.isSupervisor) {
      return res.status(403).json({
        success: false,
        message: "Only the project supervisor can change project settings.",
      });
    }

    const body = req.body || {};
    const supplied = ["status", "name", "description"].filter((key) => body[key] !== undefined);

    if (supplied.length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update." });
    }

    const fail = (message) => res.status(400).json({ success: false, message });
    const changes = {};

    if (body.status !== undefined) {
      if (!PROJECT_STATUSES.includes(body.status)) {
        return fail(`Status must be one of: ${PROJECT_STATUSES.join(", ")}.`);
      }
      if (body.status !== project.status) changes.status = body.status;
    }

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 150) return fail("Project name must contain 2–150 characters.");
      if (name !== project.name) changes.name = name;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== "string") return fail("Project description must be text.");
      const description = body.description.trim();
      if (description.length > 2000) return fail("Project description cannot exceed 2000 characters.");
      if (description !== (project.description || "")) changes.description = description;
    }

    if (Object.keys(changes).length === 0) {
      return res.status(200).json({
        success: true,
        message: "No changes to save.",
        project: { _id: project._id, name: project.name, code: project.code, description: project.description, status: project.status },
      });
    }

    const previousStatus = project.status;
    await Project.updateOne({ _id: project._id }, { $set: changes });

    if (changes.status) {
      await logActivity({
        project: project._id,
        actor: req.user._id,
        action: "project_status_changed",
        message: `${req.user.name} changed the project from ${STATUS_LABELS[previousStatus]} to ${STATUS_LABELS[changes.status]}.`,
      });

      notifications.notifyProjectStatusChanged({
        project: { _id: project._id, code: project.code, name: changes.name || project.name },
        from: STATUS_LABELS[previousStatus],
        to: STATUS_LABELS[changes.status],
        memberIds: project.members.map((m) => m.user),
        actor: req.user,
      });
    }

    if (changes.name || changes.description !== undefined) {
      await logActivity({
        project: project._id,
        actor: req.user._id,
        action: "project_updated",
        message: `${req.user.name} updated the project ${[changes.name && "name", changes.description !== undefined && "description"].filter(Boolean).join(" and ")}.`,
      });
    }

    return res.status(200).json({
      success: true,
      message: changes.status
        ? `Project is now ${STATUS_LABELS[changes.status]}.`
        : "Project details saved.",
      project: {
        _id: project._id,
        code: project.code,
        name: changes.name || project.name,
        description: changes.description !== undefined ? changes.description : project.description,
        status: changes.status || project.status,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getProjectCurrency = async (req, res, next) => {
  try {
    const loaded = await loadAccessibleProject(req, res);
    if (!loaded) return undefined;

    // The currency matrix exposes everyone's acknowledgment status, which is
    // the supervisor's monitoring view.
    if (!loaded.access.isSupervisor) {
      return res.status(403).json({
        success: false,
        message: "Only the project supervisor can view revision currency.",
      });
    }

    const currency = await loadProjectCurrency(loaded.project._id);

    return res.status(200).json({ success: true, ...currency });
  } catch (error) {
    return next(error);
  }
};

/** Download the distribution report as a CSV file (supervisor only). */
const getProjectReport = async (req, res, next) => {
  try {
    const loaded = await loadAccessibleProject(req, res);
    if (!loaded) return undefined;

    if (!loaded.access.isSupervisor) {
      return res.status(403).json({
        success: false,
        message: "Only the project supervisor can export reports.",
      });
    }

    const [currency, openQuestions] = await Promise.all([
      loadProjectCurrency(loaded.project._id),
      Clarification.aggregate([
        {
          $match: {
            project: loaded.project._id,
            status: { $in: ["open", "answered"] },
          },
        },
        { $group: { _id: "$revision", count: { $sum: 1 } } },
      ]),
    ]);

    const openQuestionsByRevision = Object.fromEntries(
      openQuestions.map((row) => [String(row._id), row.count])
    );

    const csv = buildDistributionCsv({
      project: loaded.project,
      currency,
      openQuestionsByRevision,
    });

    const date = new Date().toISOString().slice(0, 10);

    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${loaded.project.code}-distribution-report-${date}.csv"`,
      "Cache-Control": "no-store",
    });

    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};

const getProjectActivity = async (req, res, next) => {
  try {
    const loaded = await loadAccessibleProject(req, res);
    if (!loaded) return undefined;

    const { project, access } = loaded;

    // Other people's progress and unissued drawings are not the team's business.
    const issuedRevisionIds = isScopedToIssued(access.memberRole)
      ? await Acknowledgment.find({ project: project._id, recipient: req.user._id }).distinct("revision")
      : [];

    const activity = await ActivityLog.find({
      project: project._id,
      ...activityScope({ ...access, userId: req.user._id, issuedRevisionIds }),
    })
      .populate("actor", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({ success: true, activity });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  addProjectMember,
  removeProjectMember,
  updateProject,
  getProjectCurrency,
  getProjectActivity,
  getProjectReport,
};
