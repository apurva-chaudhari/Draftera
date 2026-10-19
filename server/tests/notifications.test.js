const test = require("node:test");
const assert = require("node:assert/strict");

const { sendMail, parseSender, isMailConfigured } = require("../services/mailer");
const { makeNotifier, appUrl } = require("../services/notifications");
const templates = require("../utils/emailTemplates");
const { pickOverdueReminders } = require("../utils/overdue");

const ENV = { BREVO_API_KEY: "key-123", MAIL_FROM: "Draftera <alerts@example-sender.in>" };

// ---------------------------------------------------------------- mailer

test("sender can be written as 'Name <email>' or a bare email", () => {
  assert.deepEqual(parseSender("Draftera <a@b.in>"), { name: "Draftera", email: "a@b.in" });
  assert.deepEqual(parseSender('"Site Team" <a@b.in>'), { name: "Site Team", email: "a@b.in" });
  assert.deepEqual(parseSender("a@b.in"), { name: "Draftera", email: "a@b.in" });
  assert.equal(parseSender("not an email"), null);
  assert.equal(parseSender(undefined), null);
});

test("email is switched off unless both key and sender are set", async () => {
  assert.equal(isMailConfigured({}), false);
  assert.equal(isMailConfigured({ BREVO_API_KEY: "k" }), false);
  assert.equal(isMailConfigured(ENV), true);

  const calls = [];
  const result = await sendMail(
    { to: "x@gmail.com", subject: "s", text: "t", html: "h" },
    { env: {}, fetchImpl: async () => calls.push(1) }
  );
  assert.deepEqual(result, { sent: false, reason: "not_configured" });
  assert.equal(calls.length, 0);
});

test("sendMail posts the right request to Brevo", async () => {
  let seen;
  const result = await sendMail(
    { to: "priya@gmail.com", toName: "Priya", subject: "Hi", text: "plain", html: "<p>rich</p>" },
    { env: ENV, fetchImpl: async (url, init) => { seen = { url, init }; return { ok: true, status: 201 }; } }
  );

  assert.deepEqual(result, { sent: true });
  assert.equal(seen.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(seen.init.method, "POST");
  assert.equal(seen.init.headers["api-key"], "key-123");
  const body = JSON.parse(seen.init.body);
  assert.deepEqual(body.sender, { name: "Draftera", email: "alerts@example-sender.in" });
  assert.deepEqual(body.to, [{ email: "priya@gmail.com", name: "Priya" }]);
  assert.equal(body.subject, "Hi");
  assert.equal(body.textContent, "plain");
  assert.equal(body.htmlContent, "<p>rich</p>");
});

test("demo and reserved addresses are never emailed", async () => {
  for (const to of ["supervisor@draftera.demo", "a@b.test", "a@example.com", "a@b.invalid"]) {
    const result = await sendMail({ to, subject: "s" }, { env: ENV, fetchImpl: async () => { throw new Error("must not be called"); } });
    assert.equal(result.reason, "undeliverable_address", to);
  }
});

test("a provider error or network failure is reported, never thrown", async () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    const rejected = await sendMail({ to: "a@gmail.com", subject: "s" }, { env: ENV, fetchImpl: async () => ({ ok: false, status: 401 }) });
    assert.deepEqual(rejected, { sent: false, reason: "provider_401" });

    const offline = await sendMail({ to: "a@gmail.com", subject: "s" }, { env: ENV, fetchImpl: async () => { throw new Error("ECONNRESET"); } });
    assert.deepEqual(offline, { sent: false, reason: "network_error" });
  } finally {
    console.error = quiet;
  }
});

// ---------------------------------------------------------------- templates

test("user-supplied text is HTML-escaped in emails but kept readable in plain text", () => {
  const mail = templates.revisionIssued({
    recipientName: "<script>alert(1)</script>",
    projectCode: "P&Q",
    projectName: 'Tower "A"',
    drawingNumber: "STR-101",
    revisionNumber: "B",
    issuedBy: "Amit",
    link: 'https://app.test/revisions/1" onclick="x',
  });

  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("&lt;script&gt;"));
  assert.ok(mail.html.includes("P&amp;Q"));
  assert.ok(!mail.html.includes('onclick="x'));
  assert.ok(mail.text.includes("P&Q"));
});

test("a new revision email says what it replaces and when it is due", () => {
  const mail = templates.revisionIssued({
    recipientName: "Imran", projectCode: "DEMO", projectName: "Demo Tower",
    drawingNumber: "STR-101", revisionNumber: "C", issuedBy: "Amit",
    dueAt: "2026-10-20T10:00:00Z", supersededNumbers: ["A", "B"],
    link: "https://app.test/revisions/9",
  });

  assert.equal(mail.subject, "New drawing revision: STR-101 Rev C (DEMO)");
  assert.match(mail.text, /replaces Rev A, B/);
  assert.match(mail.text, /acknowledge by .*2026/);
  assert.match(mail.text, /https:\/\/app\.test\/revisions\/9/);
});

test("overdue reminders are labelled overdue", () => {
  const mail = templates.reminder({
    recipientName: "Imran", projectCode: "DEMO", drawingNumber: "STR-101", revisionNumber: "C",
    remindedBy: "Amit", dueAt: "2026-10-01T10:00:00Z", overdue: true, link: "https://app.test/r",
  });
  assert.match(mail.subject, /^Overdue:/);
  assert.match(mail.text, /overdue/);
});

// ---------------------------------------------------------------- notifier

function makeFakeNotifier(env = {}) {
  const sent = [];
  const users = [
    { _id: "amit", name: "Amit", email: "amit@gmail.com" },
    { _id: "rohan", name: "Rohan", email: "rohan@gmail.com" },
    { _id: "kavita", name: "Kavita", email: "kavita@gmail.com" },
  ];
  const notifier = makeNotifier({
    env,
    mailer: { sendMail: async (mail) => { sent.push(mail); return { sent: true }; } },
    loadUsers: async (ids) => users.filter((u) => ids.map(String).includes(u._id)),
  });
  return { notifier, sent };
}

const project = { _id: "p1", code: "GVA-001", name: "Green Valley" };
const actor = { _id: "amit", name: "Amit" };

test("publishing emails each recipient but never the person who published", async () => {
  const { notifier, sent } = makeFakeNotifier({ APP_URL: "https://draftera.app/" });
  const result = await notifier.notifyRevisionPublished({
    project, revision: { _id: "r1", revisionNumber: "B", ackDueAt: null },
    drawingNumber: "PLB-201", recipientIds: ["amit", "rohan", "kavita"], actor,
  });

  assert.deepEqual(result, { attempted: 2, sent: 2 });
  assert.deepEqual(sent.map((m) => m.to).sort(), ["kavita@gmail.com", "rohan@gmail.com"]);
  assert.match(sent[0].text, /https:\/\/draftera\.app\/revisions\/r1/);
});

test("a failing mail provider never breaks the caller", async () => {
  const quiet = console.error;
  console.error = () => {};
  try {
    const notifier = makeNotifier({
      mailer: { sendMail: async () => { throw new Error("boom"); } },
      loadUsers: async () => [{ _id: "rohan", name: "Rohan", email: "rohan@gmail.com" }],
    });
    const result = await notifier.notifyRevisionPublished({
      project, revision: { _id: "r1", revisionNumber: "A" }, drawingNumber: "X-1", recipientIds: ["rohan"], actor,
    });
    assert.deepEqual(result, { attempted: 1, sent: 0 });

    const broken = makeNotifier({ mailer: { sendMail: async () => ({ sent: true }) }, loadUsers: async () => { throw new Error("db down"); } });
    assert.deepEqual(
      await broken.notifyRevisionPublished({ project, revision: { _id: "r", revisionNumber: "A" }, drawingNumber: "X", recipientIds: ["x"], actor }),
      { attempted: 0, sent: 0 }
    );
  } finally {
    console.error = quiet;
  }
});

test("reminder result tells the caller whether an email really went out", async () => {
  const { notifier, sent } = makeFakeNotifier();
  const result = await notifier.notifyReminder({
    project, revision: { _id: "r1", revisionNumber: "B", ackDueAt: null }, drawingNumber: "PLB-201",
    user: { _id: "rohan", name: "Rohan", email: "rohan@gmail.com" }, actor,
  });
  assert.equal(result.sent, true);
  assert.match(sent[0].subject, /^Reminder:/);

  const off = makeNotifier({ mailer: { sendMail: async () => ({ sent: false, reason: "not_configured" }) }, loadUsers: async () => [] });
  const offResult = await off.notifyReminder({
    project, revision: { _id: "r1", revisionNumber: "B" }, drawingNumber: "X",
    user: { _id: "rohan", name: "Rohan", email: "rohan@gmail.com" }, actor,
  });
  assert.deepEqual(offResult, { sent: false, reason: "not_configured" });
});

test("added/removed notices skip the actor themselves", async () => {
  const { notifier, sent } = makeFakeNotifier();
  assert.equal((await notifier.notifyAddedToProject({ project, user: actor, role: "site_engineer", actor })).reason, "self");
  assert.equal((await notifier.notifyRemovedFromProject({ project, user: actor, actor })).reason, "self");
  assert.equal(sent.length, 0);

  await notifier.notifyRemovedFromProject({ project, user: { _id: "rohan", name: "Rohan", email: "rohan@gmail.com" }, actor });
  assert.match(sent[0].subject, /removed from GVA-001/);
  assert.match(sent[0].text, /no longer have access/);
});

test("links use APP_URL, else the first public CLIENT_URL, else localhost", () => {
  assert.equal(appUrl({ APP_URL: "https://a.app/" }), "https://a.app");
  assert.equal(appUrl({ CLIENT_URL: "http://localhost:5173,https://x.vercel.app/" }), "https://x.vercel.app");
  assert.equal(appUrl({ CLIENT_URL: "http://localhost:5173" }), "http://localhost:5173");
  assert.equal(appUrl({}), "http://localhost:5173");
});

// ---------------------------------------------------------------- overdue

const NOW = new Date("2026-10-20T12:00:00Z");
const overdueProject = { _id: "p1", supervisor: "sup", members: [{ user: "sup" }, { user: "rohan" }, { user: "kavita" }] };
const revision = { _id: "r1", status: "published", ackDueAt: "2026-10-19T12:00:00Z" };
const ack = (over) => ({ _id: "a", project: "p1", revision: "r1", recipient: "rohan", status: "pending", lastRemindedAt: null, ...over });

const pick = (overrides = {}) =>
  pickOverdueReminders({ revisions: [revision], acknowledgments: [ack()], projects: [overdueProject], now: NOW, ...overrides });

test("an unacknowledged person past the deadline is picked", () => {
  assert.equal(pick().length, 1);
});

test("nobody is picked before the deadline, for a superseded revision, or once acknowledged", () => {
  assert.equal(pick({ now: new Date("2026-10-19T00:00:00Z") }).length, 0);
  assert.equal(pick({ revisions: [{ ...revision, status: "superseded" }] }).length, 0);
  assert.equal(pick({ revisions: [{ ...revision, ackDueAt: null }] }).length, 0);
  assert.equal(pick({ acknowledgments: [ack({ status: "acknowledged" })] }).length, 0);
});

test("people removed from the project are not reminded", () => {
  assert.equal(pick({ acknowledgments: [ack({ recipient: "ghost" })] }).length, 0);
});

test("a person reminded within 24 hours is skipped, later is picked again", () => {
  assert.equal(pick({ acknowledgments: [ack({ lastRemindedAt: "2026-10-20T06:00:00Z" })] }).length, 0);
  assert.equal(pick({ acknowledgments: [ack({ lastRemindedAt: "2026-10-19T06:00:00Z" })] }).length, 1);
});
