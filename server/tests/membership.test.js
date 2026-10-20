/**
 * Member removal and its consequences, tested without MongoDB by replacing
 * the models with small in-memory fakes. (The same rules are exercised
 * against a real database in workflow.integration.test.js.)
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { loadWithStubs, fakeRes } = require("./helpers/stubs");

const id = (c) => c.repeat(24);
const SUP = id("1");
const ENG = id("2");
const SUB = id("3");
const OUT = id("4");

function setup() {
  const project = {
    _id: id("9"),
    code: "GVA-001",
    name: "Green Valley",
    supervisor: SUP,
    members: [
      { user: SUP, role: "project_supervisor" },
      { user: ENG, role: "site_engineer" },
      { user: SUB, role: "subcontractor" },
    ],
  };

  const users = {
    [SUP]: { _id: SUP, name: "Amit", email: "amit@gmail.com" },
    [ENG]: { _id: ENG, name: "Sneha", email: "sneha@gmail.com" },
    [SUB]: { _id: SUB, name: "Rohan", email: "rohan@gmail.com" },
  };

  const log = [];
  const emails = [];

  // Enough of Mongo's update semantics for the one query the controller runs.
  const Project = {
    findById: async (pid) => (String(pid) === String(project._id) ? project : null),
    updateOne: async (filter, update) => {
      const target = filter["members.user"];
      const isMember = project.members.some((m) => m.user === target);
      const notSupervisor = project.supervisor !== filter.supervisor.$ne;
      if (!isMember || !notSupervisor) return { modifiedCount: 0 };
      project.members = project.members.filter((m) => m.user !== update.$pull.members.user);
      return { modifiedCount: 1 };
    },
  };

  // The controller looks users up through User.findById(..).select(..).
  const User = { findById: (userId) => ({ select: async () => users[userId] || null }) };
  const controller = loadWithStubs("controllers/projectController", {
    mongoose: { isValidObjectId: (v) => /^[a-f0-9]{24}$/.test(String(v)) },
    "../models/Project": Project,
    "../models/User": User,
    "../models/ActivityLog": {},
    "../models/Acknowledgment": {},
    "../models/Clarification": {},
    "../utils/activity": { logActivity: async (event) => log.push(event) },
    "../services/currencyService": {},
    "../utils/report": {},
    "../services/notifications": {
      notifyAddedToProject: () => {},
      notifyRemovedFromProject: (args) => emails.push(args),
    },
  });

  const remove = async (caller, targetId, projectId = project._id) => {
    const res = fakeRes();
    await controller.removeProjectMember(
      { user: users[caller] || { _id: caller, name: "Outsider" }, params: { projectId, userId: targetId } },
      res,
      (error) => { throw error; }
    );
    return res;
  };

  return { project, users, log, emails, remove };
}

test("the supervisor can remove a team member", async () => {
  const { project, log, emails, remove } = setup();
  const res = await remove(SUP, SUB);

  assert.equal(res.statusCode, 200);
  assert.match(res.body.message, /Rohan removed/);
  assert.deepEqual(project.members.map((m) => m.user), [SUP, ENG]);
});

test("removal is written to the audit trail and the person is notified", async () => {
  const { log, emails, remove } = setup();
  await remove(SUP, SUB);

  assert.equal(log.length, 1);
  assert.equal(log[0].action, "member_removed");
  assert.match(log[0].message, /Amit removed Rohan \(subcontractor\)/);
  assert.equal(emails.length, 1);
  assert.equal(emails[0].user.email, "rohan@gmail.com");
});

test("only the supervisor may remove people", async () => {
  const { project, remove } = setup();
  const res = await remove(ENG, SUB);
  assert.equal(res.statusCode, 403);
  assert.equal(project.members.length, 3);
});

test("someone outside the project cannot even probe it", async () => {
  const { project, remove } = setup();
  const res = await remove(OUT, SUB);
  assert.equal(res.statusCode, 403);
  assert.equal(project.members.length, 3);
});

test("the supervisor cannot be removed, not even by themselves", async () => {
  const { project, log, remove } = setup();
  const res = await remove(SUP, SUP);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /supervisor cannot be removed/);
  assert.equal(project.members.length, 3);
  assert.equal(log.length, 0);
});

test("removing someone who is not on the team is a 404, and removing twice is too", async () => {
  const { remove } = setup();
  assert.equal((await remove(SUP, OUT)).statusCode, 404);
  assert.equal((await remove(SUP, SUB)).statusCode, 200);
  assert.equal((await remove(SUP, SUB)).statusCode, 404);
});

test("malformed ids are rejected", async () => {
  const { remove } = setup();
  assert.equal((await remove(SUP, "not-an-id")).statusCode, 400);
  assert.equal((await remove(SUP, SUB, "bad")).statusCode, 400);
});

// ---- what a removed person can no longer do ------------------------------

function acknowledgmentController({ project, ack, revision }, delivery = { sent: true }) {
  const calls = { ackFind: 0, saved: 0 };
  const ctrl = loadWithStubs("controllers/acknowledgmentController", {
    mongoose: { isValidObjectId: (v) => /^[a-f0-9]{24}$/.test(String(v)) },
    "../models/Acknowledgment": {
      findOne: async () => { calls.ackFind += 1; return ack; },
      find: () => { throw new Error("not used"); },
    },
    "../models/DrawingRevision": { findById: () => ({ populate: async () => revision }) },
    "../models/Project": {
      findById: async () => project,
      find: () => ({ select: () => ({ lean: async () => (project.members.some((m) => m.user === SUB) ? [{ _id: project._id }] : []) }) }),
    },
    "../models/User": { findById: () => ({ select: async () => ({ _id: SUB, name: "Rohan", email: "rohan@gmail.com" }) }) },
    "../utils/activity": { logActivity: async () => {} },
    "../services/notifications": { notifyReminder: async () => delivery },
  });
  return { ctrl, calls };
}

function scenario() {
  const project = {
    _id: id("9"), code: "GVA-001", supervisor: SUP,
    members: [{ user: SUP, role: "project_supervisor" }, { user: SUB, role: "subcontractor" }],
  };
  const revision = { _id: id("7"), project: project._id, status: "published", revisionNumber: "B", drawing: { drawingNumber: "PLB-201" } };
  const ack = { status: "pending", viewedAt: new Date(), save: async function save() { this.saved = true; } };
  return { project, revision, ack };
}

test("a removed member can no longer acknowledge a revision", async () => {
  const s = scenario();
  const { ctrl } = acknowledgmentController(s);
  s.project.members = s.project.members.filter((m) => m.user !== SUB); // removed

  const res = fakeRes();
  await ctrl.acknowledgeRevision(
    { user: { _id: SUB, name: "Rohan" }, params: { revisionId: s.revision._id } }, res, (e) => { throw e; }
  );
  assert.equal(res.statusCode, 403);
  assert.equal(s.ack.saved, undefined, "the acknowledgment was not recorded");
});

test("a current member still can", async () => {
  const s = scenario();
  const { ctrl } = acknowledgmentController(s);
  const res = fakeRes();
  await ctrl.acknowledgeRevision(
    { user: { _id: SUB, name: "Rohan" }, params: { revisionId: s.revision._id } }, res, (e) => { throw e; }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(s.ack.status, "acknowledged");
});

test("reminders are refused for someone who has left the project", async () => {
  const s = scenario();
  s.ack.reminderCount = 0;
  const { ctrl } = acknowledgmentController(s);
  s.project.members = s.project.members.filter((m) => m.user !== SUB);

  const res = fakeRes();
  await ctrl.sendReminder(
    { user: { _id: SUP, name: "Amit" }, params: { revisionId: s.revision._id, userId: SUB } }, res, (e) => { throw e; }
  );
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /no longer on the project team/);
  assert.equal(s.ack.reminderCount, 0, "no reminder counted");
});

test("reminder tells the supervisor honestly whether an email was sent", async () => {
  const s = scenario();
  s.ack.reminderCount = 0;
  s.ack.lastRemindedAt = null;
  const { ctrl } = acknowledgmentController(s);

  const res = fakeRes();
  await ctrl.sendReminder(
    { user: { _id: SUP, name: "Amit" }, params: { revisionId: s.revision._id, userId: SUB } }, res, (e) => { throw e; }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.emailed, true);
  assert.match(res.body.message, /emailed to Rohan/);
});

test("without email set up the reminder is only recorded, and says so", async () => {
  const s = scenario();
  s.ack.reminderCount = 0;
  s.ack.lastRemindedAt = null;
  const { ctrl } = acknowledgmentController(s, { sent: false, reason: "not_configured" });

  const res = fakeRes();
  await ctrl.sendReminder(
    { user: { _id: SUP, name: "Amit" }, params: { revisionId: s.revision._id, userId: SUB } }, res, (e) => { throw e; }
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.emailed, false);
  assert.match(res.body.message, /No email was sent because email is not set up/);
  assert.equal(s.ack.reminderCount, 1, "the reminder is still recorded");
});
