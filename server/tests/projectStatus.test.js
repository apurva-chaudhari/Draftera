/**
 * Changing a project's status, name and description, tested without MongoDB.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { loadWithStubs, fakeRes } = require("./helpers/stubs");

const id = (c) => c.repeat(24);
const SUP = id("1");
const ENG = id("2");
const SUB = id("3");
const OUT = id("4");

function setup(status = "active") {
  const project = {
    _id: id("9"),
    code: "GVA-001",
    name: "Green Valley",
    description: "B+G+7 block",
    status,
    supervisor: SUP,
    members: [
      { user: SUP, role: "project_supervisor" },
      { user: ENG, role: "site_engineer" },
      { user: SUB, role: "subcontractor" },
    ],
  };

  const users = {
    [SUP]: { _id: SUP, name: "Amit" },
    [ENG]: { _id: ENG, name: "Sneha" },
    [SUB]: { _id: SUB, name: "Rohan" },
  };

  const log = [];
  const emails = [];
  const writes = [];

  const Project = {
    findById: async (pid) => (String(pid) === String(project._id) ? project : null),
    updateOne: async (filter, update) => {
      writes.push(update.$set);
      Object.assign(project, update.$set);
      return { modifiedCount: 1 };
    },
  };

  const controller = loadWithStubs("controllers/projectController", {
    mongoose: { isValidObjectId: (v) => /^[a-f0-9]{24}$/.test(String(v)) },
    "../models/Project": Project,
    "../models/User": {},
    "../models/ActivityLog": {},
    "../models/Acknowledgment": {},
    "../models/Clarification": {},
    "../utils/activity": { logActivity: async (event) => log.push(event) },
    "../services/currencyService": {},
    "../utils/report": {},
    "../services/notifications": { notifyProjectStatusChanged: (args) => emails.push(args) },
  });

  const update = async (caller, body, projectId = project._id) => {
    const res = fakeRes();
    await controller.updateProject(
      { user: users[caller] || { _id: caller, name: "Outsider" }, params: { projectId }, body },
      res,
      (error) => { throw error; }
    );
    return res;
  };

  return { project, log, emails, writes, update };
}

test("the supervisor can put a project on hold, and it is logged and the team told", async () => {
  const { project, log, emails, update } = setup();
  const res = await update(SUP, { status: "on_hold" });

  assert.equal(res.statusCode, 200);
  assert.equal(project.status, "on_hold");
  assert.equal(res.body.project.status, "on_hold");
  assert.equal(log.length, 1);
  assert.equal(log[0].action, "project_status_changed");
  assert.match(log[0].message, /from Active to On hold/);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].from, "Active");
  assert.equal(emails[0].to, "On hold");
  assert.equal(emails[0].memberIds.length, 3);
});

test("a project can be completed, archived and reopened", async () => {
  const { project, update } = setup();
  for (const status of ["completed", "archived", "active"]) {
    const res = await update(SUP, { status });
    assert.equal(res.statusCode, 200, status);
    assert.equal(project.status, status);
  }
});

test("only the supervisor may change settings", async () => {
  for (const caller of [ENG, SUB]) {
    const { project, update } = setup();
    const res = await update(caller, { status: "archived" });
    assert.equal(res.statusCode, 403);
    assert.equal(project.status, "active");
  }
});

test("someone outside the project is refused", async () => {
  const { update } = setup();
  const res = await update(OUT, { status: "archived" });
  assert.equal(res.statusCode, 403);
});

test("an invalid status or an empty request is a 400", async () => {
  const { update, writes } = setup();
  assert.equal((await update(SUP, { status: "finished" })).statusCode, 400);
  assert.equal((await update(SUP, {})).statusCode, 400);
  assert.equal(writes.length, 0);
});

test("setting the same status again changes nothing and sends nothing", async () => {
  const { log, emails, writes, update } = setup();
  const res = await update(SUP, { status: "active" });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.message, "No changes to save.");
  assert.equal(writes.length, 0);
  assert.equal(log.length, 0);
  assert.equal(emails.length, 0);
});

test("name and description are validated and trimmed", async () => {
  const { project, update } = setup();
  assert.equal((await update(SUP, { name: "x" })).statusCode, 400);
  assert.equal((await update(SUP, { name: 42 })).statusCode, 400);
  assert.equal((await update(SUP, { description: "d".repeat(2001) })).statusCode, 400);

  const res = await update(SUP, { name: "  Green Valley Phase 2  ", description: " Podium + towers " });
  assert.equal(res.statusCode, 200);
  assert.equal(project.name, "Green Valley Phase 2");
  assert.equal(project.description, "Podium + towers");
});

test("renaming is logged but does not email the team", async () => {
  const { log, emails, update } = setup();
  await update(SUP, { name: "Green Valley Phase 2" });
  assert.equal(log[0].action, "project_updated");
  assert.equal(emails.length, 0);
});

test("the project code cannot be changed", async () => {
  const { project, writes, update } = setup();
  const res = await update(SUP, { code: "HACK-1", name: "Green Valley Phase 2" });
  assert.equal(res.statusCode, 200);
  assert.equal(project.code, "GVA-001");
  assert.equal("code" in writes[0], false);
});

test("a malformed project id is rejected", async () => {
  const { update } = setup();
  assert.equal((await update(SUP, { status: "archived" }, "not-an-id")).statusCode, 400);
});
