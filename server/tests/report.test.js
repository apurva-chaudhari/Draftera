const test = require("node:test");
const assert = require("node:assert/strict");

const { buildDistributionCsv, escapeCell, HEADERS } = require("../utils/report");
const { buildCurrencyMatrix } = require("../utils/currency");

test("cells starting with a formula character are neutralised", () => {
  assert.equal(escapeCell("=HYPERLINK(\"http://evil\")"), "\"'=HYPERLINK(\"\"http://evil\"\")\"");
  assert.equal(escapeCell("+1"), "'+1");
  assert.equal(escapeCell("-2"), "'-2");
  assert.equal(escapeCell("@SUM(A1)"), "'@SUM(A1)");
});

test("cells with commas, quotes or line breaks are quoted", () => {
  assert.equal(escapeCell("Slab, level 3"), "\"Slab, level 3\"");
  assert.equal(escapeCell("5\" pipe"), "\"5\"\" pipe\"");
  assert.equal(escapeCell("two\nlines"), "\"two\nlines\"");
});

test("empty values become empty cells", () => {
  assert.equal(escapeCell(null), "");
  assert.equal(escapeCell(undefined), "");
  assert.equal(escapeCell(0), "0");
});

const project = { code: "GVA-001", name: "Green Valley" };
const drawing = { _id: "d1", drawingNumber: "PLB-201", title: "Level 2, plumbing" };
const members = [
  { user: { _id: "sup", name: "Amit" }, role: "project_supervisor" },
  { user: { _id: "rohan", name: "Rohan", email: "rohan@test.com" }, role: "subcontractor" },
  { user: { _id: "kavita", name: "=Kavita", email: "kavita@test.com" }, role: "subcontractor" },
];
const rev = {
  _id: "r1",
  drawing: "d1",
  revisionNumber: "B",
  status: "published",
  publishedAt: "2026-10-10T00:00:00Z",
  ackDueAt: "2026-10-11T00:00:00Z",
  recipients: ["rohan"],
};

test("report has a header row plus one row per person per current drawing", () => {
  const currency = buildCurrencyMatrix({
    members,
    drawings: [drawing],
    revisions: [rev],
    acknowledgments: [
      { revision: "r1", recipient: "rohan", status: "pending", viewedAt: null },
    ],
    now: new Date("2026-10-20T00:00:00Z"),
  });

  const csv = buildDistributionCsv({
    project,
    currency,
    openQuestionsByRevision: { r1: 2 },
  });

  assert.ok(csv.startsWith("\uFEFF"), "starts with a BOM for Excel");

  const lines = csv.replace("\uFEFF", "").trim().split("\r\n");
  assert.equal(lines.length, 3, "header + Rohan + Kavita");
  assert.equal(lines[0], HEADERS.join(","));

  const rohan = lines.find((l) => l.includes("Rohan"));
  assert.match(rohan, /Not opened/);
  assert.match(rohan, /,Yes,0,2$/, "overdue Yes, 0 reminders, 2 open questions");

  const kavita = lines.find((l) => l.includes("Kavita"));
  assert.match(kavita, /Not issued/);
  assert.match(kavita, /'=Kavita/, "formula-like name is neutralised");
  assert.match(kavita, /"Level 2, plumbing"|Level 2, plumbing/);
});

test("report for a project with nothing published is just the header", () => {
  const csv = buildDistributionCsv({
    project,
    currency: { drawings: [], totals: {} },
  });
  assert.equal(csv.replace("\uFEFF", "").trim(), HEADERS.join(","));
});
