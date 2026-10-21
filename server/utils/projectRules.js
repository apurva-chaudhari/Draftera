/**
 * What a project's status allows. One table, used by every controller, so
 * "on hold" and "completed" mean the same thing everywhere.
 *
 *   active     normal work
 *   on_hold    paused: nothing new goes out, but people can still confirm and
 *              ask about drawings they already hold
 *   completed  finished: read-only, the record stays readable
 *   archived   closed and out of the way: read-only as well
 */
const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"];

const STATUS_LABELS = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

// Which statuses allow each action, and how to describe it in a message.
const ACTIONS = {
  upload: { in: ["active"], verb: "upload drawings" },
  publish: { in: ["active"], verb: "publish revisions" },
  issue: { in: ["active"], verb: "issue revisions to more people" },
  addMember: { in: ["active"], verb: "add team members" },
  removeMember: { in: ["active", "on_hold"], verb: "remove team members" },
  remind: { in: ["active"], verb: "send reminders" },
  acknowledge: { in: ["active", "on_hold"], verb: "acknowledge revisions" },
  clarify: { in: ["active", "on_hold"], verb: "raise or answer questions" },
};

function canDo(status, action) {
  const rule = ACTIONS[action];
  if (!rule) throw new Error(`Unknown project action "${action}".`);
  return rule.in.includes(status || "active");
}

/** The sentence shown to the user when an action is refused. */
function blockedMessage(status, action) {
  const { verb } = ACTIONS[action];
  const state = status === "on_hold" ? "on hold" : status;
  const reason = status === "on_hold" ? "is on hold" : `is ${state} and read-only`;
  return `This project ${reason}. Set it back to Active to ${verb}.`;
}

/** Statuses whose work is still live (shown on the overview and in tasks). */
const OPEN_STATUSES = ["active", "on_hold"];

module.exports = { PROJECT_STATUSES, STATUS_LABELS, OPEN_STATUSES, canDo, blockedMessage };
