const test = require("node:test");
const assert = require("node:assert/strict");

const { canDo, blockedMessage, PROJECT_STATUSES, STATUS_LABELS } = require("../utils/projectRules");

test("an active project allows every action", () => {
  for (const action of ["upload", "publish", "issue", "addMember", "removeMember", "remind", "acknowledge", "clarify"]) {
    assert.equal(canDo("active", action), true, action);
  }
});

test("on hold stops new work going out but lets people confirm and ask", () => {
  for (const action of ["upload", "publish", "issue", "addMember", "remind"]) {
    assert.equal(canDo("on_hold", action), false, action);
  }
  for (const action of ["acknowledge", "clarify", "removeMember"]) {
    assert.equal(canDo("on_hold", action), true, action);
  }
});

test("completed and archived projects are read-only", () => {
  for (const status of ["completed", "archived"]) {
    for (const action of ["upload", "publish", "issue", "addMember", "removeMember", "remind", "acknowledge", "clarify"]) {
      assert.equal(canDo(status, action), false, `${status} ${action}`);
    }
  }
});

test("a project with no status is treated as active", () => {
  assert.equal(canDo(undefined, "upload"), true);
});

test("an unknown action is a programming error, not a silent yes", () => {
  assert.throws(() => canDo("active", "teleport"), /Unknown project action/);
});

test("refusal messages say why and how to fix it", () => {
  assert.equal(blockedMessage("on_hold", "publish"), "This project is on hold. Set it back to Active to publish revisions.");
  assert.equal(blockedMessage("archived", "upload"), "This project is archived and read-only. Set it back to Active to upload drawings.");
});

test("every status has a label", () => {
  for (const status of PROJECT_STATUSES) assert.ok(STATUS_LABELS[status], status);
});
