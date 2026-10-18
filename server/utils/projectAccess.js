const Project = require("../models/Project");

/**
 * Work out what a user is allowed to do inside a project.
 * Roles are per project: the same person can supervise one project and be a
 * subcontractor on another.
 */
function getProjectAccess(project, userId) {
  const id = String(userId);
  const isSupervisor = String(project.supervisor) === id;
  const membership = project.members.find((m) => String(m.user) === id);

  return {
    isSupervisor,
    isMember: isSupervisor || Boolean(membership),
    memberRole: isSupervisor
      ? "project_supervisor"
      : membership
        ? membership.role
        : null,
  };
}

/** Ids of every project the user supervises or belongs to. */
async function findAccessibleProjectIds(userId) {
  const projects = await Project.find({
    $or: [{ supervisor: userId }, { "members.user": userId }],
  })
    .select("_id")
    .lean();

  return projects.map((p) => p._id);
}

module.exports = { getProjectAccess, findAccessibleProjectIds };
