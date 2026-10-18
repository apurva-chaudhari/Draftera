const ActivityLog = require("../models/ActivityLog");

/**
 * Record an activity event.
 *
 * Without a session the write is best-effort: logging must never break the
 * user's request, so failures are reported to the server log and swallowed.
 *
 * With a session (inside a transaction) the write is part of the operation:
 * if the audit record cannot be saved, the whole transaction rolls back, so a
 * state change can never exist without its audit trail.
 */
async function logActivity(
  { project, revision = null, actor, action, message },
  { session } = {}
) {
  const event = { project, revision, actor, action, message };

  if (session) {
    await ActivityLog.create([event], { session });
    return;
  }

  try {
    await ActivityLog.create(event);
  } catch (error) {
    console.error("Activity log failed:", error.message);
  }
}

module.exports = { logActivity };
