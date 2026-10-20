import test from "node:test";
import assert from "node:assert/strict";
import {
  PROJECT_STATUS_OPTIONS,
  dueLabel,
  greeting,
  initials,
  isOpenProject,
  isOverdue,
  roleLabel,
  statusNotice,
  timeAgo,
} from "./format.js";

const NOW = new Date("2026-10-20T12:00:00Z").getTime();

test("isOverdue is true only when a deadline exists and has passed", () => {
  assert.equal(isOverdue("2026-10-19T00:00:00Z", NOW), true);
  assert.equal(isOverdue("2026-10-21T00:00:00Z", NOW), false);
  assert.equal(isOverdue(null, NOW), false);
  assert.equal(isOverdue(undefined, NOW), false);
});

test("dueLabel describes missing, upcoming and passed deadlines", () => {
  assert.equal(dueLabel(null, NOW), "No deadline");
  assert.match(dueLabel("2026-10-21T00:00:00Z", NOW), /^Due /);
  assert.match(dueLabel("2026-10-19T00:00:00Z", NOW), /^Overdue since /);
});

test("initials uses the first two words and tolerates empty names", () => {
  assert.equal(initials("Amit Patil"), "AP");
  assert.equal(initials("Rohan"), "R");
  assert.equal(initials("a b c"), "AB");
  assert.equal(initials(""), "?");
});

test("roleLabel maps known roles and falls back gracefully", () => {
  assert.equal(roleLabel("project_supervisor"), "Project supervisor");
  assert.equal(roleLabel("subcontractor"), "Subcontractor");
  assert.equal(roleLabel("something_else"), "Team member");
});

test("timeAgo reports recency in friendly units", () => {
  assert.equal(timeAgo(null), "—");
  assert.equal(timeAgo(new Date().toISOString()), "just now");
  assert.match(timeAgo(new Date(Date.now() - 5 * 60000).toISOString()), /min ago/);
  assert.match(timeAgo(new Date(Date.now() - 3 * 3600000).toISOString()), /h ago/);
  assert.match(timeAgo(new Date(Date.now() - 2 * 86400000).toISOString()), /d ago/);
});

test("greeting returns a time-of-day greeting", () => {
  assert.match(greeting(), /^Good (morning|afternoon|evening)$/);
});

test("every project status is described and has a label", () => {
  assert.deepEqual(
    PROJECT_STATUS_OPTIONS.map((o) => o.value),
    ["active", "on_hold", "completed", "archived"]
  );
  for (const option of PROJECT_STATUS_OPTIONS) {
    assert.ok(option.label && option.effect.length > 20, option.value);
  }
});

test("only active and on-hold projects count as open", () => {
  assert.equal(isOpenProject("active"), true);
  assert.equal(isOpenProject("on_hold"), true);
  assert.equal(isOpenProject("completed"), false);
  assert.equal(isOpenProject("archived"), false);
});

test("statusNotice explains non-active projects and is silent for active ones", () => {
  assert.equal(statusNotice("active"), null);
  assert.match(statusNotice("on_hold"), /on hold/);
  assert.match(statusNotice("completed"), /read-only/);
  assert.match(statusNotice("archived"), /archived/);
});
