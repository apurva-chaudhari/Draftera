/**
 * Who sees which drawings, and what they see about each, tested without
 * MongoDB. Roles: supervisor, site engineer, subcontractor.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { loadWithStubs, fakeRes } = require("./helpers/stubs");

const id = (c) => c.repeat(24);
const SUP = id("1");
const ENG = id("2");
const SUB = id("3");
const OTHER_SUB = id("5");
const PRJ = id("9");

const project = {
  _id: PRJ,
  supervisor: SUP,
  status: "active",
  members: [
    { user: SUP, role: "project_supervisor" },
    { user: ENG, role: "site_engineer" },
    { user: SUB, role: "subcontractor" },
    { user: OTHER_SUB, role: "subcontractor" },
  ],
};

// Three published drawings and one draft. SUB holds R1 (acknowledged) and R2
// (opened). Nobody but the supervisor should ever see the draft.
const revisions = [
  { _id: id("a"), status: "published", drawing: { drawingNumber: "PLB-201" }, project: PRJ },
  { _id: id("b"), status: "published", drawing: { drawingNumber: "ELE-110" }, project: PRJ },
  { _id: id("c"), status: "published", drawing: { drawingNumber: "ARC-204" }, project: PRJ },
  { _id: id("d"), status: "draft", drawing: { drawingNumber: "STR-300" }, project: PRJ },
];

const acknowledgments = [
  { revision: id("a"), recipient: SUB, project: PRJ, status: "acknowledged", viewedAt: new Date() },
  { revision: id("b"), recipient: SUB, project: PRJ, status: "pending", viewedAt: new Date() },
  { revision: id("a"), recipient: OTHER_SUB, project: PRJ, status: "pending", viewedAt: null },
  { revision: id("c"), recipient: OTHER_SUB, project: PRJ, status: "pending", viewedAt: null },
  { revision: id("a"), recipient: ENG, project: PRJ, status: "pending", viewedAt: null },
];

function controller() {
  const seenFilters = [];

  const DrawingRevision = {
    find: (filter) => {
      seenFilters.push(filter);
      let rows = revisions.filter((r) => r.project === filter.project);
      if (filter.status?.$ne) rows = rows.filter((r) => r.status !== filter.status.$ne);
      if (filter._id?.$in) rows = rows.filter((r) => filter._id.$in.includes(r._id));
      const chain = { populate: () => chain, sort: () => chain, select: () => chain, lean: async () => rows.map((r) => ({ ...r })) };
      return chain;
    },
    findById: async (rid) => {
      const r = revisions.find((x) => x._id === rid);
      return r ? { ...r, toObject: () => ({ ...r, file: {} }) } : null;
    },
  };

  const Acknowledgment = {
    find: (filter) => {
      const rows = acknowledgments.filter(
        (a) => a.project === filter.project && (!filter.recipient || a.recipient === filter.recipient)
      );
      const chain = { select: () => chain, lean: async () => rows, distinct: async (f) => rows.map((a) => a[f]) };
      return chain;
    },
    exists: async (filter) => (acknowledgments.some((a) => a.revision === filter.revision && a.recipient === filter.recipient) ? { _id: 1 } : null),
    aggregate: async () => [
      { _id: id("a"), total: 3, acknowledged: 1, opened: 1 },
      { _id: id("b"), total: 1, acknowledged: 0, opened: 1 },
    ],
  };

  const ctrl = loadWithStubs("controllers/revisionController", {
    mongoose: { isValidObjectId: (v) => /^[a-f0-9]{24}$/.test(String(v)) },
    "../models/Project": { findById: async () => project },
    "../models/User": {},
    "../models/Drawing": {},
    "../models/DrawingRevision": DrawingRevision,
    "../models/Acknowledgment": Acknowledgment,
    "../models/Clarification": {},
    "../models/ActivityLog": {},
    "../config/storage": { storage: { from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: "https://signed" } }) }) } },
    "../utils/activity": { logActivity: async () => {} },
    "../services/notifications": {},
  });

  return { ctrl, seenFilters };
}

async function list(userId) {
  const { ctrl } = controller();
  const res = fakeRes();
  await ctrl.listProjectRevisions({ user: { _id: userId, name: "x" }, params: { projectId: PRJ } }, res, (e) => { throw e; });
  return res;
}

const numbers = (res) => res.body.revisions.map((r) => r.drawing.drawingNumber).sort();

test("the supervisor sees every drawing including drafts, with team progress", async () => {
  const res = await list(SUP);
  assert.deepEqual(numbers(res), ["ARC-204", "ELE-110", "PLB-201", "STR-300"]);
  assert.ok(res.body.revisions.every((r) => r.ackSummary && r.myStatus === undefined));
});

test("a site engineer sees all issued drawings but never drafts or team numbers", async () => {
  const res = await list(ENG);
  assert.deepEqual(numbers(res), ["ARC-204", "ELE-110", "PLB-201"]);
  assert.ok(res.body.revisions.every((r) => r.ackSummary === undefined));
});

test("a subcontractor sees only the drawings issued to them", async () => {
  const res = await list(SUB);
  assert.deepEqual(numbers(res), ["ELE-110", "PLB-201"]);
});

test("a different subcontractor sees a different set", async () => {
  const res = await list(OTHER_SUB);
  assert.deepEqual(numbers(res), ["ARC-204", "PLB-201"]);
});

test("members see their own status, never the team's counts", async () => {
  const res = await list(SUB);
  const byNumber = Object.fromEntries(res.body.revisions.map((r) => [r.drawing.drawingNumber, r.myStatus]));
  assert.deepEqual(byNumber, { "PLB-201": "acknowledged", "ELE-110": "opened" });
  assert.ok(res.body.revisions.every((r) => r.ackSummary === undefined));
});

test("an engineer who was not issued a drawing is told so", async () => {
  const res = await list(ENG);
  const byNumber = Object.fromEntries(res.body.revisions.map((r) => [r.drawing.drawingNumber, r.myStatus]));
  assert.equal(byNumber["PLB-201"], "pending");
  assert.equal(byNumber["ELE-110"], "not_issued");
});

async function open(userId, revisionId) {
  const { ctrl } = controller();
  const res = fakeRes();
  await ctrl.openRevisionFile({ user: { _id: userId, name: "x" }, params: { revisionId } }, res, (e) => { throw e; });
  return res;
}

test("a subcontractor cannot open a drawing that was not issued to them", async () => {
  const res = await open(SUB, id("c"));
  assert.equal(res.statusCode, 404);
  assert.equal(res.body.message, "Drawing revision not found.");
});

test("a draft stays invisible to everyone but the supervisor", async () => {
  for (const user of [ENG, SUB]) {
    assert.equal((await open(user, id("d"))).statusCode, 404);
  }
});
