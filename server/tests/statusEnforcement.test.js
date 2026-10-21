/**
 * A project's status really changes what people can do, tested without
 * MongoDB. The rules themselves are in projectRules.test.js; these prove the
 * controllers apply them.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { loadWithStubs, fakeRes } = require("./helpers/stubs");

const id = (c) => c.repeat(24);
const SUP = id("1");
const SUB = id("3");
const REV = id("7");

const mongooseStub = { isValidObjectId: (v) => /^[a-f0-9]{24}$/.test(String(v)) };

function makeProject(status) {
  return {
    _id: id("9"),
    code: "GVA-001",
    name: "Green Valley",
    status,
    supervisor: SUP,
    members: [
      { user: SUP, role: "project_supervisor" },
      { user: SUB, role: "subcontractor" },
    ],
  };
}

function projectController(project, extra = {}) {
  const Project = {
    findById: async () => project,
    updateOne: async () => ({ modifiedCount: 1 }),
  };
  return loadWithStubs("controllers/projectController", {
    mongoose: mongooseStub,
    "../models/Project": Project,
    "../models/User": { findById: () => ({ select: async () => ({ _id: SUB, name: "Rohan" }) }) },
    "../models/ActivityLog": {},
    "../models/Acknowledgment": {},
    "../models/Clarification": {},
    "../utils/activity": { logActivity: async () => {} },
    "../services/currencyService": {},
    "../utils/report": {},
    "../services/notifications": { notifyAddedToProject: () => {}, notifyRemovedFromProject: () => {}, ...extra },
  });
}

async function call(fn, user, params, body = {}) {
  const res = fakeRes();
  await fn({ user, params, body }, res, (error) => { throw error; });
  return res;
}

const supervisor = { _id: SUP, name: "Amit" };

test("adding a team member is refused unless the project is active", async () => {
  for (const status of ["on_hold", "completed", "archived"]) {
    const controller = projectController(makeProject(status));
    const res = await call(controller.addProjectMember, supervisor, { projectId: id("9") }, { email: "x@y.com", role: "subcontractor" });
    assert.equal(res.statusCode, 409, status);
    assert.match(res.body.message, /Set it back to Active to add team members/);
  }
});

test("removing someone is still allowed on hold, but not once the project is closed", async () => {
  const onHold = projectController(makeProject("on_hold"));
  assert.equal((await call(onHold.removeProjectMember, supervisor, { projectId: id("9"), userId: SUB })).statusCode, 200);

  const done = projectController(makeProject("completed"));
  const res = await call(done.removeProjectMember, supervisor, { projectId: id("9"), userId: SUB });
  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /read-only/);
});

function acknowledgmentController(project, ack) {
  const revision = {
    _id: REV,
    status: "published",
    project: project._id,
    revisionNumber: "B",
    drawing: { drawingNumber: "PLB-201" },
  };

  return loadWithStubs("controllers/acknowledgmentController", {
    mongoose: mongooseStub,
    "../models/Acknowledgment": { findOne: async () => ack },
    "../models/DrawingRevision": { findById: () => ({ populate: async () => revision }) },
    "../models/Project": { findById: async () => project },
    "../models/User": {},
    "../utils/activity": { logActivity: async () => {} },
    "../services/notifications": {},
  });
}

const makeAck = () => ({ status: "pending", viewedAt: new Date(), save: async function () { return this; } });
const subcontractor = { _id: SUB, name: "Rohan" };

test("people can still acknowledge while a project is on hold", async () => {
  const ack = makeAck();
  const res = await call(acknowledgmentController(makeProject("on_hold"), ack).acknowledgeRevision, subcontractor, { revisionId: REV });
  assert.equal(res.statusCode, 200);
  assert.equal(ack.status, "acknowledged");
});

test("nobody can acknowledge on a completed or archived project", async () => {
  for (const status of ["completed", "archived"]) {
    const ack = makeAck();
    const res = await call(acknowledgmentController(makeProject(status), ack).acknowledgeRevision, subcontractor, { revisionId: REV });
    assert.equal(res.statusCode, 409, status);
    assert.equal(ack.status, "pending", status);
  }
});

test("an outsider still gets 403, not a hint about the project's status", async () => {
  const res = await call(
    acknowledgmentController(makeProject("archived"), makeAck()).acknowledgeRevision,
    { _id: id("4"), name: "Outsider" },
    { revisionId: REV }
  );
  assert.equal(res.statusCode, 403);
});
