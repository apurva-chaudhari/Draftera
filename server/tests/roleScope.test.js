const test = require("node:test");
const assert = require("node:assert/strict");

const { activityScope, myStatusFor, isScopedToIssued, TEAM_VISIBLE_ACTIONS } = require("../utils/roleScope");

test("the supervisor's feed is unfiltered", () => {
  assert.deepEqual(activityScope({ isSupervisor: true, memberRole: "project_supervisor", userId: "u1" }), {});
});

test("other people's opens, acknowledgments, reminders and drafts are never team-visible", () => {
  for (const hidden of ["revision_opened", "revision_acknowledged", "reminder_sent", "revision_uploaded"]) {
    assert.equal(TEAM_VISIBLE_ACTIONS.includes(hidden), false, hidden);
  }
});

test("a site engineer sees team events plus their own actions", () => {
  const scope = activityScope({ isSupervisor: false, memberRole: "site_engineer", userId: "u2" });
  assert.deepEqual(scope.$or[0], { actor: "u2" });
  assert.deepEqual(scope.$or[1].action.$in, TEAM_VISIBLE_ACTIONS);
  assert.equal("revision" in scope.$or[1], false);
});

test("a subcontractor only sees events about drawings issued to them", () => {
  const scope = activityScope({ isSupervisor: false, memberRole: "subcontractor", userId: "u3", issuedRevisionIds: ["r1", "r2"] });
  assert.deepEqual(scope.$or[1].revision, { $in: [null, "r1", "r2"] });
});

test("only subcontractors are limited to what was issued to them", () => {
  assert.equal(isScopedToIssued("subcontractor"), true);
  assert.equal(isScopedToIssued("site_engineer"), false);
  assert.equal(isScopedToIssued("project_supervisor"), false);
});

test("a member's own status reads clearly", () => {
  assert.equal(myStatusFor(null), "not_issued");
  assert.equal(myStatusFor({ status: "pending", viewedAt: null }), "pending");
  assert.equal(myStatusFor({ status: "pending", viewedAt: new Date() }), "opened");
  assert.equal(myStatusFor({ status: "acknowledged", viewedAt: new Date() }), "acknowledged");
});
