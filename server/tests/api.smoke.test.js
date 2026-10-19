const test = require("node:test");
const assert = require("node:assert/strict");

// Dummy configuration so modules that read env at import time can load.
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
process.env.CLIENT_URL = "http://localhost:5173";

const app = require("../app");

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test("health reports database disconnected without a DB", async () => {
  const res = await fetch(`${base}/api/health`);
  assert.equal(res.status, 503);
});

test("unknown routes return a JSON 404", async () => {
  const res = await fetch(`${base}/api/nope`);
  assert.equal(res.status, 404);
  assert.equal((await res.json()).success, false);
});

for (const path of [
  "/api/projects",
  "/api/dashboard/summary",
  "/api/acknowledgments/mine",
  "/api/clarifications/mine",
  "/api/drawings/project/507f1f77bcf86cd799439011",
  "/api/drawings/revision/507f1f77bcf86cd799439011",
]) {
  test(`GET ${path} requires authentication`, async () => {
    const res = await fetch(`${base}${path}`);
    assert.equal(res.status, 401);
  });
}

test("a forged session cookie is rejected", async () => {
  const res = await fetch(`${base}/api/projects`, {
    headers: { Cookie: "draftera_session=not.a.real.token" },
  });
  assert.equal(res.status, 401);
});

test("a bearer token is no longer accepted: sessions are cookie-only", async () => {
  const res = await fetch(`${base}/api/projects`, {
    headers: { Authorization: "Bearer not.a.real.token" },
  });
  assert.equal(res.status, 401);
  assert.equal((await res.json()).message, "Authentication required.");
});

test("logout clears the session cookie", async () => {
  const res = await fetch(`${base}/api/auth/logout`, { method: "POST" });
  assert.equal(res.status, 200);
  const cookie = res.headers.get("set-cookie") || "";
  assert.match(cookie, /draftera_session=;/);
  assert.match(cookie, /HttpOnly/i);
});

test("cross-site writes are blocked (CSRF defence)", async () => {
  const res = await fetch(`${base}/api/auth/logout`, {
    method: "POST",
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(res.status, 403);
});

test("CORS allows credentials for the real front end only", async () => {
  const res = await fetch(`${base}/api/health`, {
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
});

test("every data model is included in backups", () => {
  const mongoose = require("mongoose");
  const { collectionNames } = require("../utils/backupRuntime");
  const covered = new Set(collectionNames());
  for (const model of Object.values(mongoose.models)) {
    assert.ok(covered.has(model.collection.name), `${model.modelName} is missing from the backup list`);
  }
});

test("registration refuses privileged roles", async () => {
  const res = await fetch(`${base}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Mallory",
      email: "mallory@example.com",
      password: "password123",
      role: "admin",
    }),
  });
  assert.equal(res.status, 403);
});

test("CORS rejects unknown origins", async () => {
  const res = await fetch(`${base}/api/health`, {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(res.status, 403);
});
