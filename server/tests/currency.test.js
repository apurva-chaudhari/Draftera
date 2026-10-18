const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCurrencyMatrix } = require("../utils/currency");

// Small fixture helpers keep each scenario readable.
const user = (id, name) => ({ _id: id, name });
const drawing = { _id: "d1", drawingNumber: "STR-001", title: "Foundation" };
const members = [
  { user: user("sup", "Supervisor"), role: "project_supervisor" },
  { user: user("eng", "Engineer"), role: "site_engineer" },
  { user: user("sub", "Subcontractor"), role: "subcontractor" },
];

const revA = {
  _id: "rA",
  drawing: "d1",
  revisionNumber: "A",
  status: "superseded",
  publishedAt: "2026-10-01",
  recipients: ["eng", "sub"],
};
const revB = {
  _id: "rB",
  drawing: "d1",
  revisionNumber: "B",
  status: "published",
  publishedAt: "2026-10-10",
  recipients: ["eng", "sub"],
};

const ack = (revision, recipient, extra = {}) => ({
  revision,
  recipient,
  status: "pending",
  viewedAt: null,
  acknowledgedAt: null,
  ...extra,
});

const run = (revisions, acknowledgments, m = members) =>
  buildCurrencyMatrix({ members: m, drawings: [drawing], revisions, acknowledgments });

test("supervisor is never counted as part of the audience", () => {
  const result = run([revB], [ack("rB", "eng"), ack("rB", "sub")]);
  const names = result.drawings[0].people.map((p) => p.user.name);
  assert.deepEqual(names, ["Engineer", "Subcontractor"]);
});

test("a sent revision without evidence of viewing is 'pending', never 'current'", () => {
  const result = run([revB], [ack("rB", "eng"), ack("rB", "sub")]);
  assert.ok(result.drawings[0].people.every((p) => p.state === "pending"));
  assert.equal(result.totals.current, 0);
});

test("opened but not acknowledged is reported as 'opened'", () => {
  const result = run(
    [revB],
    [ack("rB", "eng", { viewedAt: "2026-10-11" }), ack("rB", "sub")]
  );
  const states = result.drawings[0].people.map((p) => p.state);
  assert.deepEqual(states, ["opened", "pending"]);
});

test("acknowledging Rev A does not make anyone current on Rev B", () => {
  const result = run(
    [revA, revB],
    [
      ack("rA", "eng", { status: "acknowledged", acknowledgedAt: "2026-10-02" }),
      ack("rA", "sub", { status: "acknowledged", acknowledgedAt: "2026-10-02" }),
      ack("rB", "eng"),
      ack("rB", "sub"),
    ]
  );
  const people = result.drawings[0].people;
  assert.ok(people.every((p) => p.state === "pending"));
  assert.ok(people.every((p) => p.atRisk && p.lastAckedRevision === "A"));
  assert.equal(result.totals.atRisk, 2);
});

test("someone left off the distribution of Rev B is flagged 'not_issued' and at risk", () => {
  const partialB = { ...revB, recipients: ["eng"] };
  const result = run(
    [revA, partialB],
    [
      ack("rA", "sub", { status: "acknowledged", acknowledgedAt: "2026-10-02" }),
      ack("rB", "eng", { status: "acknowledged", acknowledgedAt: "2026-10-11" }),
    ]
  );
  const sub = result.drawings[0].people.find((p) => p.user.name === "Subcontractor");
  assert.equal(sub.state, "not_issued");
  assert.equal(sub.atRisk, true);
  assert.equal(sub.lastAckedRevision, "A");
});

test("fully acknowledged revision has zero risk", () => {
  const result = run(
    [revB],
    [
      ack("rB", "eng", { status: "acknowledged", viewedAt: "x", acknowledgedAt: "y" }),
      ack("rB", "sub", { status: "acknowledged", viewedAt: "x", acknowledgedAt: "y" }),
    ]
  );
  assert.equal(result.totals.current, 2);
  assert.equal(result.totals.atRisk, 0);
});

test("drawings that only have drafts are skipped", () => {
  const draft = { ...revB, status: "draft", publishedAt: null, recipients: [] };
  const result = run([draft], []);
  assert.equal(result.drawings.length, 0);
});

test("latest published revision wins when picking the current one", () => {
  const older = { ...revA, status: "published" };
  const result = run([older, revB], []);
  assert.equal(result.drawings[0].currentRevision.revisionNumber, "B");
});
