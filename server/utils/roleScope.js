/**
 * What each project role is allowed to see. Pure functions (no database), so
 * the rules are easy to read and to test. The controllers pass the results to
 * their queries.
 *
 *   project_supervisor  everything, including drafts and who has opened what
 *   site_engineer       every issued drawing, but not other people's status
 *   subcontractor       only the drawings issued to them (need to know)
 *
 * Nobody except the supervisor sees drafts or other people's progress.
 */

// Activity that is about the project itself, not about one person's progress.
const TEAM_VISIBLE_ACTIONS = [
  "project_created",
  "member_added",
  "member_removed",
  "project_status_changed",
  "project_updated",
  "revision_published",
  "clarification_requested",
  "clarification_answered",
  "clarification_resolved",
];

const isScopedToIssued = (memberRole) => memberRole === "subcontractor";

/**
 * Query filter for an activity feed (merge it into the feed's find()).
 * `issuedRevisionIds` only matters for subcontractors: events about a drawing
 * that was never issued to them stay hidden.
 */
function activityScope({ isSupervisor, memberRole, userId, issuedRevisionIds = [] }) {
  if (isSupervisor) return {};

  const mine = { actor: userId };

  const teamEvents = isScopedToIssued(memberRole)
    ? { action: { $in: TEAM_VISIBLE_ACTIONS }, revision: { $in: [null, ...issuedRevisionIds] } }
    : { action: { $in: TEAM_VISIBLE_ACTIONS } };

  return { $or: [mine, teamEvents] };
}

/**
 * How a member's own standing on a revision reads, for lists where they must
 * not see anyone else's numbers.
 *   acknowledged | opened | pending | not_issued
 */
function myStatusFor(acknowledgment) {
  if (!acknowledgment) return "not_issued";
  if (acknowledgment.status === "acknowledged") return "acknowledged";
  return acknowledgment.viewedAt ? "opened" : "pending";
}

module.exports = { TEAM_VISIBLE_ACTIONS, isScopedToIssued, activityScope, myStatusFor };
