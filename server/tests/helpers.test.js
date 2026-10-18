const test = require("node:test");
const assert = require("node:assert/strict");

const { getProjectAccess } = require("../utils/projectAccess");
const { rateLimiter } = require("../middleware/rateLimiter");

const project = {
  supervisor: "sup",
  members: [
    { user: "sup", role: "project_supervisor" },
    { user: "eng", role: "site_engineer" },
    { user: "sub", role: "subcontractor" },
  ],
};

test("supervisor access", () => {
  assert.deepEqual(getProjectAccess(project, "sup"), {
    isSupervisor: true,
    isMember: true,
    memberRole: "project_supervisor",
  });
});

test("members get their project role and no supervisor rights", () => {
  const access = getProjectAccess(project, "sub");
  assert.equal(access.isSupervisor, false);
  assert.equal(access.isMember, true);
  assert.equal(access.memberRole, "subcontractor");
});

test("outsiders have no access", () => {
  assert.deepEqual(getProjectAccess(project, "stranger"), {
    isSupervisor: false,
    isMember: false,
    memberRole: null,
  });
});

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    set(key, value) {
      this.headers[key] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("rate limiter allows up to the limit then blocks with Retry-After", () => {
  const limiter = rateLimiter({ windowMs: 60000, max: 3 });
  let passed = 0;

  for (let i = 0; i < 3; i += 1) limiter({ ip: "1.1.1.1" }, fakeRes(), () => (passed += 1));
  assert.equal(passed, 3);

  const blocked = fakeRes();
  limiter({ ip: "1.1.1.1" }, blocked, () => assert.fail("should not pass"));
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers["Retry-After"]) > 0);
});

test("rate limiter counts each client separately", () => {
  const limiter = rateLimiter({ windowMs: 60000, max: 1 });
  let passed = 0;
  limiter({ ip: "a" }, fakeRes(), () => (passed += 1));
  limiter({ ip: "b" }, fakeRes(), () => (passed += 1));
  assert.equal(passed, 2);
});
