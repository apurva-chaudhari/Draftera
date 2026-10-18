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

test("a forged token is rejected", async () => {
  const res = await fetch(`${base}/api/projects`, {
    headers: { Authorization: "Bearer not.a.real.token" },
  });
  assert.equal(res.status, 401);
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
