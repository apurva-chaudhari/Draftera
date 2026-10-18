const ActivityLog = require("../models/ActivityLog");

/**
 * Record an activity event.
 *
 * Logging must never break the user's request, so failures are reported to
 * the server log and swallowed.
 */
async function logActivity({ project, revision = null, actor, action, message }) {
  try {
    await ActivityLog.create({ project, revision, actor, action, message });
  } catch (error) {
    console.error("Activity log failed:", error.message);
  }
}

module.exports = { logActivity };
