const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SESSION_COOKIE,
  sessionCookieOptions,
  setSessionCookie,
  clearSessionCookie,
  readCookie,
} = require("../utils/session");
const { loadWithStubs, fakeRes } = require("./helpers/stubs");

test("cookie is httpOnly and lax in development", () => {
  const options = sessionCookieOptions({ NODE_ENV: "development" });
  assert.deepEqual(options, { httpOnly: true, secure: false, sameSite: "lax", path: "/" });
});

test("production cookie is Secure and SameSite=None for a cross-domain front end", () => {
  const options = sessionCookieOptions({ NODE_ENV: "production" });
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "none");
  assert.equal(options.httpOnly, true);
});

test("COOKIE_SAMESITE=lax is honoured in production", () => {
  const options = sessionCookieOptions({ NODE_ENV: "production", COOKIE_SAMESITE: "LAX" });
  assert.equal(options.sameSite, "lax");
  assert.equal(options.secure, true);
});

test("SameSite=None is never sent without Secure", () => {
  const options = sessionCookieOptions({ NODE_ENV: "development", COOKIE_SAMESITE: "none" });
  assert.equal(options.secure, true);
});

test("an invalid COOKIE_SAMESITE falls back to the safe default", () => {
  assert.equal(sessionCookieOptions({ NODE_ENV: "development", COOKIE_SAMESITE: "bogus" }).sameSite, "lax");
});

test("setSessionCookie sets an httpOnly cookie that expires in 8 hours", () => {
  const res = fakeRes();
  setSessionCookie(res, "abc.def.ghi");
  const set = res.headers[`cookie:${SESSION_COOKIE}`];
  assert.equal(set.value, "abc.def.ghi");
  assert.equal(set.options.httpOnly, true);
  assert.equal(set.options.maxAge, 8 * 60 * 60 * 1000);
});

test("clearSessionCookie uses the same attributes so the browser removes it", () => {
  const res = fakeRes();
  clearSessionCookie(res);
  assert.equal(res.headers[`clear:${SESSION_COOKIE}`].httpOnly, true);
});

test("readCookie finds the right cookie among several", () => {
  const req = { headers: { cookie: "theme=dark; draftera_session=tok%2Ben; other=1" } };
  assert.equal(readCookie(req, "draftera_session"), "tok+en");
  assert.equal(readCookie(req, "theme"), "dark");
  assert.equal(readCookie(req, "missing"), null);
});

test("readCookie tolerates no header and malformed encoding", () => {
  assert.equal(readCookie({ headers: {} }, "x"), null);
  assert.equal(readCookie({ headers: { cookie: "x=%E0%A4%A" } }, "x"), null);
  assert.equal(readCookie({ headers: { cookie: "novalue" } }, "novalue"), null);
});

// ---- requireAuth, with the database and JWT replaced by fakes

function makeAuth({ user, payload = { sub: "u1" }, verify } = {}) {
  const verified = [];
  const middleware = loadWithStubs("middleware/authMiddleware", {
    "../models/User": { findById: async () => user },
    "../utils/auth": {
      verifyToken: (token) => {
        verified.push(token);
        if (verify) return verify(token);
        return payload;
      },
    },
  });
  return { requireAuth: middleware.requireAuth, verified };
}

async function run(requireAuth, headers) {
  const req = { headers };
  const res = fakeRes();
  let nextCalled = false;
  let nextError;
  await requireAuth(req, res, (error) => {
    nextCalled = true;
    nextError = error;
  });
  return { req, res, nextCalled, nextError };
}

test("requireAuth accepts a valid session cookie", async () => {
  const { requireAuth, verified } = makeAuth({ user: { _id: "u1", isActive: true } });
  const { req, nextCalled } = await run(requireAuth, { cookie: "draftera_session=good.token" });
  assert.equal(nextCalled, true);
  assert.deepEqual(verified, ["good.token"]);
  assert.equal(req.user._id, "u1");
});

test("requireAuth ignores an Authorization header", async () => {
  const { requireAuth, verified } = makeAuth({ user: { _id: "u1", isActive: true } });
  const { res, nextCalled } = await run(requireAuth, { authorization: "Bearer good.token" });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(verified, []);
});

test("requireAuth rejects a deactivated user even with a valid token", async () => {
  const { requireAuth } = makeAuth({ user: { _id: "u1", isActive: false } });
  const { res, nextCalled } = await run(requireAuth, { cookie: "draftera_session=good.token" });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("requireAuth rejects an expired or forged token", async () => {
  const { requireAuth } = makeAuth({
    verify: () => {
      const error = new Error("jwt expired");
      error.name = "TokenExpiredError";
      throw error;
    },
  });
  const { res, nextCalled } = await run(requireAuth, { cookie: "draftera_session=old.token" });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});
