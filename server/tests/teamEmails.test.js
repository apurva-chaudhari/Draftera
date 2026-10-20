/**
 * The newer emails: project status changes and the question/answer loop.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { makeNotifier } = require("../services/notifications");
const templates = require("../utils/emailTemplates");

const users = {
  s: { _id: "s", name: "Amit", email: "amit@gmail.com" },
  e: { _id: "e", name: "Sneha", email: "sneha@gmail.com" },
  r: { _id: "r", name: "Rohan", email: "rohan@gmail.com" },
};

function notifier() {
  const sent = [];
  const mailer = { sendMail: async (mail) => { sent.push(mail); return { sent: true }; } };
  const loadUsers = async (ids) => ids.map((i) => users[i]).filter(Boolean);
  return { sent, n: makeNotifier({ mailer, loadUsers, env: { APP_URL: "https://draftera.example" } }) };
}

const project = { _id: "p1", code: "GVA-001", name: "Green Valley", supervisor: "s" };
const revision = { _id: "rev1", revisionNumber: "B" };

test("a status change emails everyone except the supervisor who made it", async () => {
  const { sent, n } = notifier();
  const result = await n.notifyProjectStatusChanged({
    project, from: "Active", to: "On hold", memberIds: ["s", "e", "r"], actor: users.s,
  });

  assert.equal(result.sent, 2);
  assert.deepEqual(sent.map((m) => m.to).sort(), ["rohan@gmail.com", "sneha@gmail.com"]);
  assert.match(sent[0].subject, /GVA-001 is now On hold/);
  assert.match(sent[0].text, /Keep working from the revisions you already hold/);
  assert.match(sent[0].text, /https:\/\/draftera\.example\/projects\/p1/);
});

test("reopening a project says work has resumed", () => {
  const mail = templates.projectStatusChanged({ recipientName: "Rohan", projectCode: "GVA-001", projectName: "GV", from: "On hold", to: "Active", changedBy: "Amit", link: "x" });
  assert.match(mail.text, /Work has resumed/);
});

test("a new question emails the supervisor with the question in it", async () => {
  const { sent, n } = notifier();
  await n.notifyClarificationRequested({
    project, revision, drawingNumber: "PLB-201", question: "Is the sleeve at grid C4 100 or 150 mm?", actor: users.r,
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "amit@gmail.com");
  assert.match(sent[0].subject, /Question on PLB-201 Rev B/);
  assert.match(sent[0].text, /sleeve at grid C4/);
  assert.match(sent[0].text, /\/revisions\/rev1/);
});

test("a supervisor asking their own question is not emailed", async () => {
  const { sent, n } = notifier();
  const result = await n.notifyClarificationRequested({ project, revision, drawingNumber: "PLB-201", question: "test question", actor: users.s });
  assert.equal(result.reason, "self");
  assert.equal(sent.length, 0);
});

test("the answer goes back to the person who asked", async () => {
  const { sent, n } = notifier();
  await n.notifyClarificationAnswered({
    project, revision, drawingNumber: "PLB-201", askerId: "r", response: "150 mm, see detail 4.", actor: users.s,
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "rohan@gmail.com");
  assert.match(sent[0].text, /150 mm, see detail 4/);
  assert.match(sent[0].text, /mark it resolved/);
});

test("long questions are shortened in the email, and markup is escaped", () => {
  const mail = templates.clarificationRequested({
    supervisorName: "Amit", projectCode: "GVA-001", drawingNumber: "PLB-201", revisionNumber: "B",
    askedBy: "<b>Rohan</b>", question: `${"x".repeat(600)} <script>`, link: "https://x",
  });

  assert.ok(mail.text.length < 900);
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("&lt;b&gt;Rohan&lt;/b&gt;"));
});

test("a mail failure while notifying never throws", async () => {
  const n = makeNotifier({
    mailer: { sendMail: async () => { throw new Error("boom"); } },
    loadUsers: async (ids) => ids.map((i) => users[i]),
    env: {},
  });
  await assert.doesNotReject(() => n.notifyClarificationRequested({ project, revision, drawingNumber: "D", question: "a question", actor: users.r }));
  await assert.doesNotReject(() => n.notifyClarificationAnswered({ project, revision, drawingNumber: "D", askerId: "r", response: "x", actor: users.s }));
});
