/**
 * End-to-end business workflow against a REAL MongoDB.
 *
 * Skipped unless TEST_MONGODB_URI is set. The database name must end in
 * "_test" because the suite DROPS the database before running. MongoDB must be
 * a replica set (Atlas, or a local `--replSet`) because publishing uses
 * transactions.
 *
 *   TEST_MONGODB_URI="mongodb://localhost:27017/draftera_test?replicaSet=rs0" npm test
 *
 * Supabase Storage is replaced by an in-memory fake, so no network or
 * credentials are needed for files.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const URI = process.env.TEST_MONGODB_URI;
const dbName = URI ? new URL(URI).pathname.replace("/", "") : "";
const skip = !URI
  ? "TEST_MONGODB_URI not set"
  : !dbName.endsWith("_test")
    ? "refusing to run: database name must end with _test"
    : false;

process.env.JWT_SECRET = "integration-secret-integration-secret-123456";
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
process.env.CLIENT_URL = "http://localhost:5173";

// ---- in-memory replacement for Supabase Storage (installed before app load)
const files = new Map();
const storagePath = require.resolve("../config/storage");
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    storage: {
      from: () => ({
        upload: async (key, buffer) => {
          files.set(key, buffer);
          return { data: { path: key }, error: null };
        },
        createSignedUrl: async (key) =>
          files.has(key)
            ? { data: { signedUrl: `https://storage.test/${key}?token=abc` }, error: null }
            : { data: null, error: { message: "not found" } },
        remove: async (keys) => {
          keys.forEach((k) => files.delete(k));
          return { data: {}, error: null };
        },
      }),
    },
  },
};

const mongoose = require("mongoose");
const app = require("../app");
const { buildPdf } = require("../utils/samplePdf");

let server;
let base;

async function call(method, path, { token, json, form } = {}) {
  const headers = {};
  let body;
  // Sessions travel in an httpOnly cookie; `token` is that cookie's value.
  if (token) headers.Cookie = `draftera_session=${token}`;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  if (form) body = form;

  const res = await fetch(`${base}${path}`, { method, headers, body });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("json") ? await res.json() : await res.text();
  return { status: res.status, data, headers: res.headers };
}

function pdfForm(fields, name = "drawing.pdf", content = buildPdf(["Test drawing"])) {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  form.append("file", new Blob([content], { type: "application/pdf" }), name);
  return form;
}

const people = {};
const ctx = {};

async function register(key, name, role) {
  const res = await call("POST", "/api/auth/register", {
    json: { name, email: `${key}@test.com`, password: "Test@12345", role },
  });
  assert.equal(res.status, 201, `register ${key}: ${JSON.stringify(res.data)}`);
  assert.equal(res.data.token, undefined, "the token must never appear in the response body");

  const setCookie = res.headers.get("set-cookie") || "";
  assert.match(setCookie, /HttpOnly/i, "session cookie is httpOnly");
  const token = /draftera_session=([^;]+)/.exec(setCookie)?.[1];
  assert.ok(token, "register sets a session cookie");

  people[key] = { id: res.data.user.id, token, name };
}

test.before(async () => {
  if (skip) return;
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init())
  );
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (skip) return;
  server.close();
  await mongoose.disconnect();
});

test("workflow", { skip }, async (t) => {
  await t.test("registration and access", async () => {
    await register("amit", "Amit Patil", "site_engineer");
    await register("sneha", "Sneha More", "site_engineer");
    await register("rohan", "Rohan Gaikwad", "subcontractor");
    await register("kavita", "Kavita Joshi", "subcontractor");
    await register("vikram", "Vikram Outsider", "subcontractor");

    const dup = await call("POST", "/api/auth/register", {
      json: { name: "Again", email: "amit@test.com", password: "Test@12345" },
    });
    assert.equal(dup.status, 409);

    const bad = await call("POST", "/api/auth/login", {
      json: { email: "amit@test.com", password: "wrong-password" },
    });
    assert.equal(bad.status, 401);
  });

  await t.test("sessions: login sets a cookie, /me reads it, logout clears it", async () => {
    const login = await call("POST", "/api/auth/login", {
      json: { email: "amit@test.com", password: "Test@12345" },
    });
    assert.equal(login.status, 200);
    assert.equal(login.data.token, undefined);
    const cookie = login.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);

    const me = await call("GET", "/api/auth/me", { token: people.amit.token });
    assert.equal(me.data.user.email, "amit@test.com");

    const noCookie = await call("GET", "/api/auth/me");
    assert.equal(noCookie.status, 401);

    const logout = await call("POST", "/api/auth/logout", { token: people.amit.token });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /draftera_session=;/);
  });

  await t.test("subcontractors cannot create projects; engineers can", async () => {
    const denied = await call("POST", "/api/projects", {
      token: people.rohan.token,
      json: { name: "Nope", code: "NOPE" },
    });
    assert.equal(denied.status, 403);

    const res = await call("POST", "/api/projects", {
      token: people.amit.token,
      json: { name: "Green Valley", code: "gva-001" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.data.project.code, "GVA-001");
    ctx.projectId = res.data.project._id;

    const dup = await call("POST", "/api/projects", {
      token: people.amit.token,
      json: { name: "Other", code: "GVA-001" },
    });
    assert.equal(dup.status, 409);
  });

  await t.test("only the supervisor adds members; no duplicates", async () => {
    const add = (token, email, role) =>
      call("POST", `/api/projects/${ctx.projectId}/members`, { token, json: { email, role } });

    assert.equal((await add(people.amit.token, "sneha@test.com", "site_engineer")).status, 201);
    assert.equal((await add(people.amit.token, "rohan@test.com", "subcontractor")).status, 201);
    assert.equal((await add(people.amit.token, "kavita@test.com", "subcontractor")).status, 201);
    assert.equal((await add(people.amit.token, "rohan@test.com", "subcontractor")).status, 409);
    assert.equal((await add(people.amit.token, "ghost@test.com", "subcontractor")).status, 404);
    assert.equal((await add(people.rohan.token, "vikram@test.com", "subcontractor")).status, 403);
    assert.equal((await add(people.amit.token, "vikram@test.com", "project_supervisor")).status, 400);
  });

  await t.test("outsiders cannot see the project", async () => {
    const detail = await call("GET", `/api/projects/${ctx.projectId}`, { token: people.vikram.token });
    assert.equal(detail.status, 403);
    const list = await call("GET", "/api/projects", { token: people.vikram.token });
    assert.equal(list.data.count, 0);
  });

  const upload = (revisionNumber, extra = {}, token = people.amit.token) =>
    call("POST", "/api/drawings/upload", {
      token,
      form: pdfForm({
        projectId: ctx.projectId,
        drawingNumber: "PLB-201",
        title: "Level 2 plumbing layout",
        revisionNumber,
        issueDate: "2026-10-10",
        changeSummary: `Change for rev ${revisionNumber}`,
        ...extra,
      }),
    });

  await t.test("upload rules", async () => {
    const a = await upload("A");
    assert.equal(a.status, 201, JSON.stringify(a.data));
    assert.equal(a.data.revision.status, "draft");
    ctx.revA = a.data.revision._id;

    assert.equal((await upload("A")).status, 409, "duplicate revision number");
    assert.equal((await upload("Z", {}, people.rohan.token)).status, 403, "non-supervisor");

    const notPdf = await call("POST", "/api/drawings/upload", {
      token: people.amit.token,
      form: pdfForm(
        { projectId: ctx.projectId, drawingNumber: "X-1", title: "Fake", revisionNumber: "A", issueDate: "2026-10-10", changeSummary: "fake" },
        "fake.pdf",
        Buffer.from("this is not a pdf")
      ),
    });
    assert.equal(notPdf.status, 400);
  });

  await t.test("drafts are invisible to the team", async () => {
    const list = await call("GET", `/api/drawings/project/${ctx.projectId}`, { token: people.rohan.token });
    assert.equal(list.data.count, 0);
    const detail = await call("GET", `/api/drawings/revision/${ctx.revA}`, { token: people.rohan.token });
    assert.equal(detail.status, 404);
    const own = await call("GET", `/api/drawings/project/${ctx.projectId}`, { token: people.amit.token });
    assert.equal(own.data.count, 1);
  });

  const publish = (revisionId, recipients, token = people.amit.token, dueInHours = null) =>
    call("POST", `/api/drawings/${revisionId}/publish`, { token, json: { recipients, dueInHours } });

  await t.test("publish validation", async () => {
    assert.equal((await publish(ctx.revA, [])).status, 400);
    assert.equal((await publish(ctx.revA, [people.rohan.id], people.rohan.token)).status, 403);
    assert.equal((await publish(ctx.revA, [people.vikram.id])).status, 400, "recipient outside project");
    assert.equal((await publish(ctx.revA, [people.rohan.id], people.amit.token, 5)).status, 400, "bad deadline");
  });

  await t.test("publish Rev A to two people, leaving Kavita off", async () => {
    const res = await publish(ctx.revA, [people.sneha.id, people.rohan.id], people.amit.token, 24);
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.equal(res.data.revision.status, "published");
    assert.ok(res.data.revision.ackDueAt);

    assert.equal((await publish(ctx.revA, [people.rohan.id])).status, 409, "cannot publish twice");

    const detail = await call("GET", `/api/drawings/revision/${ctx.revA}`, { token: people.amit.token });
    assert.equal(detail.data.acknowledgments.length, 2);
    assert.ok(detail.data.activity.some((a) => a.action === "revision_published"), "audit written with publish");
  });

  await t.test("currency view: Kavita is not issued", async () => {
    const res = await call("GET", `/api/projects/${ctx.projectId}/currency`, { token: people.amit.token });
    const people_ = res.data.drawings[0].people;
    assert.equal(people_.find((p) => p.user.name === "Kavita Joshi").state, "not_issued");
    assert.equal(people_.find((p) => p.user.name === "Rohan Gaikwad").state, "pending");

    const forbidden = await call("GET", `/api/projects/${ctx.projectId}/currency`, { token: people.rohan.token });
    assert.equal(forbidden.status, 403);
  });

  await t.test("acknowledge requires opening the file first", async () => {
    const early = await call("POST", `/api/acknowledgments/${ctx.revA}/acknowledge`, { token: people.rohan.token });
    assert.equal(early.status, 409);

    const notRecipient = await call("POST", `/api/acknowledgments/${ctx.revA}/acknowledge`, { token: people.kavita.token });
    assert.equal(notRecipient.status, 403);

    const open = await call("POST", `/api/drawings/revision/${ctx.revA}/open`, { token: people.rohan.token });
    assert.equal(open.status, 200);
    assert.match(open.data.url, /^https:\/\/storage\.test\//);

    const outsider = await call("POST", `/api/drawings/revision/${ctx.revA}/open`, { token: people.vikram.token });
    assert.equal(outsider.status, 403);

    const ok = await call("POST", `/api/acknowledgments/${ctx.revA}/acknowledge`, { token: people.rohan.token });
    assert.equal(ok.status, 200);

    const again = await call("POST", `/api/acknowledgments/${ctx.revA}/acknowledge`, { token: people.rohan.token });
    assert.equal(again.status, 200, "idempotent");
  });

  await t.test("first view is recorded once", async () => {
    await call("POST", `/api/drawings/revision/${ctx.revA}/open`, { token: people.sneha.token });
    await call("POST", `/api/drawings/revision/${ctx.revA}/open`, { token: people.sneha.token });
    const detail = await call("GET", `/api/drawings/revision/${ctx.revA}`, { token: people.amit.token });
    const opened = detail.data.activity.filter(
      (a) => a.action === "revision_opened" && a.message.includes("Sneha")
    );
    assert.equal(opened.length, 1);
  });

  await t.test("issue the revision to Kavita after the fact", async () => {
    const res = await call("POST", `/api/drawings/revision/${ctx.revA}/recipients`, {
      token: people.amit.token,
      json: { recipients: [people.kavita.id] },
    });
    assert.equal(res.status, 200);

    const again = await call("POST", `/api/drawings/revision/${ctx.revA}/recipients`, {
      token: people.amit.token,
      json: { recipients: [people.kavita.id] },
    });
    assert.equal(again.status, 409);
  });

  await t.test("reminders: supervisor only, once per hour, not after acknowledging", async () => {
    const url = (id) => `/api/acknowledgments/${ctx.revA}/remind/${id}`;
    assert.equal((await call("POST", url(people.kavita.id), { token: people.rohan.token })).status, 403);
    assert.equal((await call("POST", url(people.kavita.id), { token: people.amit.token })).status, 200);
    assert.equal((await call("POST", url(people.kavita.id), { token: people.amit.token })).status, 429);
    assert.equal((await call("POST", url(people.rohan.id), { token: people.amit.token })).status, 409);
  });

  await t.test("clarifications: ask, answer, resolve", async () => {
    const ask = await call("POST", `/api/clarifications/revision/${ctx.revA}`, {
      token: people.rohan.token,
      json: { question: "Does this affect Level 3?" },
    });
    assert.equal(ask.status, 201);
    const id = ask.data.clarification._id;

    assert.equal((await call("PATCH", `/api/clarifications/${id}/respond`, { token: people.sneha.token, json: { response: "Yes" } })).status, 403);
    assert.equal((await call("PATCH", `/api/clarifications/${id}/resolve`, { token: people.amit.token })).status, 409, "cannot resolve unanswered");
    assert.equal((await call("PATCH", `/api/clarifications/${id}/respond`, { token: people.amit.token, json: { response: "Yes, follows next week." } })).status, 200);
    assert.equal((await call("PATCH", `/api/clarifications/${id}/resolve`, { token: people.sneha.token })).status, 403, "only asker or supervisor");
    assert.equal((await call("PATCH", `/api/clarifications/${id}/resolve`, { token: people.rohan.token })).status, 200);
    assert.equal((await call("PATCH", `/api/clarifications/${id}/respond`, { token: people.amit.token, json: { response: "late" } })).status, 409, "resolved is final");
  });

  await t.test("Rev B supersedes Rev A and exposes Rohan as at risk", async () => {
    const b = await upload("B");
    assert.equal(b.status, 201);
    ctx.revB = b.data.revision._id;

    const pub = await publish(ctx.revB, [people.sneha.id, people.rohan.id, people.kavita.id]);
    assert.equal(pub.status, 200);

    const revA = await call("GET", `/api/drawings/revision/${ctx.revA}`, { token: people.rohan.token });
    assert.equal(revA.data.revision.status, "superseded");
    assert.equal(revA.data.supersededBy._id, ctx.revB);
    assert.equal(revA.data.history.length, 2, "history keeps both revisions");

    const ackOld = await call("POST", `/api/acknowledgments/${ctx.revA}/acknowledge`, { token: people.sneha.token });
    assert.equal(ackOld.status, 409, "cannot acknowledge a superseded revision");

    const currency = await call("GET", `/api/projects/${ctx.projectId}/currency`, { token: people.amit.token });
    const rohan = currency.data.drawings[0].people.find((p) => p.user.name === "Rohan Gaikwad");
    assert.equal(currency.data.drawings[0].currentRevision.revisionNumber, "B");
    assert.equal(rohan.state, "pending");
    assert.equal(rohan.atRisk, true);
    assert.equal(rohan.lastAckedRevision, "A");
  });

  await t.test("dashboard counts only current work", async () => {
    const res = await call("GET", "/api/dashboard/summary", { token: people.rohan.token });
    assert.equal(res.data.summary.pendingAcknowledgments, 1, "Rev B only, not stale Rev A");

    const sup = await call("GET", "/api/dashboard/summary", { token: people.amit.token });
    assert.ok(sup.data.summary.atRiskRecipients >= 1);
  });

  await t.test("acknowledging Rev B clears the risk", async () => {
    await call("POST", `/api/drawings/revision/${ctx.revB}/open`, { token: people.rohan.token });
    const ok = await call("POST", `/api/acknowledgments/${ctx.revB}/acknowledge`, { token: people.rohan.token });
    assert.equal(ok.status, 200);

    const currency = await call("GET", `/api/projects/${ctx.projectId}/currency`, { token: people.amit.token });
    const rohan = currency.data.drawings[0].people.find((p) => p.user.name === "Rohan Gaikwad");
    assert.equal(rohan.state, "current");
    assert.equal(rohan.atRisk, false);
  });

  await t.test("CSV report is supervisor-only and well formed", async () => {
    const denied = await call("GET", `/api/projects/${ctx.projectId}/report.csv`, { token: people.rohan.token });
    assert.equal(denied.status, 403);

    const res = await call("GET", `/api/projects/${ctx.projectId}/report.csv`, { token: people.amit.token });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/csv/);
    assert.match(res.headers.get("content-disposition"), /GVA-001-distribution-report-/);
    assert.match(res.data, /Rohan Gaikwad/);
  });

  await t.test("activity trail covers the whole journey", async () => {
    const res = await call("GET", `/api/projects/${ctx.projectId}/activity`, { token: people.amit.token });
    const actions = new Set(res.data.activity.map((a) => a.action));
    for (const action of [
      "project_created", "member_added", "revision_uploaded", "revision_published",
      "revision_opened", "revision_acknowledged", "reminder_sent",
      "clarification_requested", "clarification_answered", "clarification_resolved",
    ]) {
      assert.ok(actions.has(action), `missing audit action ${action}`);
    }
  });

  await t.test("removing a team member", async () => {
    const remove = (token, userId) =>
      call("DELETE", `/api/projects/${ctx.projectId}/members/${userId}`, { token });

    assert.equal((await remove(people.sneha.token, people.rohan.id)).status, 403, "engineers cannot remove");
    assert.equal((await remove(people.amit.token, people.amit.id)).status, 400, "supervisor cannot be removed");
    assert.equal((await remove(people.amit.token, people.vikram.id)).status, 404, "not on the team");

    const done = await remove(people.amit.token, people.rohan.id);
    assert.equal(done.status, 200, JSON.stringify(done.data));
    assert.equal((await remove(people.amit.token, people.rohan.id)).status, 404, "already removed");

    // Access is gone straight away.
    assert.equal((await call("GET", `/api/projects/${ctx.projectId}`, { token: people.rohan.token })).status, 403);
    assert.equal((await call("GET", "/api/projects", { token: people.rohan.token })).data.count, 0);
    assert.equal((await call("POST", `/api/drawings/revision/${ctx.revB}/open`, { token: people.rohan.token })).status, 403);
    assert.equal((await call("POST", `/api/acknowledgments/${ctx.revB}/acknowledge`, { token: people.rohan.token })).status, 403);
    assert.equal((await call("GET", "/api/acknowledgments/mine", { token: people.rohan.token })).data.count, 0);
    assert.equal((await call("GET", "/api/clarifications/mine", { token: people.rohan.token })).data.count, 0);
    assert.equal((await call("GET", "/api/dashboard/summary", { token: people.rohan.token })).data.summary.pendingAcknowledgments, 0);

    // He disappears from the live monitoring view...
    const currency = await call("GET", `/api/projects/${ctx.projectId}/currency`, { token: people.amit.token });
    assert.ok(!currency.data.drawings[0].people.some((p) => p.user.name === "Rohan Gaikwad"));

    // ...but his history is kept, and the removal is audited.
    assert.ok((await mongoose.models.Acknowledgment.countDocuments({ recipient: people.rohan.id })) > 0, "history kept");
    const detail = await call("GET", `/api/drawings/revision/${ctx.revB}`, { token: people.amit.token });
    const former = detail.data.acknowledgments.find((a) => a.recipient?.name === "Rohan Gaikwad");
    assert.ok(former, "supervisor still sees his past acknowledgment");
    assert.equal(former.recipientRole, null);

    const activity = await call("GET", `/api/projects/${ctx.projectId}/activity`, { token: people.amit.token });
    assert.ok(activity.data.activity.some((a) => a.action === "member_removed" && /Rohan/.test(a.message)));

    // Reminders to a former member are refused.
    const remind = await call("POST", `/api/acknowledgments/${ctx.revB}/remind/${people.rohan.id}`, { token: people.amit.token });
    assert.equal(remind.status, 409);

    // He can be added back.
    const back = await call("POST", `/api/projects/${ctx.projectId}/members`, {
      token: people.amit.token,
      json: { email: "rohan@test.com", role: "subcontractor" },
    });
    assert.equal(back.status, 201);
    assert.equal((await call("GET", `/api/projects/${ctx.projectId}`, { token: people.rohan.token })).status, 200);
  });

  await t.test("deactivated users are locked out immediately", async () => {
    await mongoose.models.User.updateOne({ _id: people.kavita.id }, { isActive: false });
    const res = await call("GET", "/api/projects", { token: people.kavita.token });
    assert.equal(res.status, 401);
  });
});
