/** The startup check refuses a broken deployment and explains why. */
const test = require("node:test");
const assert = require("node:assert/strict");

const { validateEnv } = require("../config/env");

const good = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb+srv://u:p@c.mongodb.net/draftera",
  JWT_SECRET: "x".repeat(48),
  SUPABASE_URL: "https://abc.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "key",
  CLIENT_URL: "https://draftera.vercel.app",
  GEMINI_API_KEY: "g",
  BREVO_API_KEY: "b",
  MAIL_FROM: "Draftera <a@b.com>",
};

test("a complete production configuration passes with no warnings", () => {
  const { errors, warnings } = validateEnv(good);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("missing required settings are each reported", () => {
  const { errors } = validateEnv({ NODE_ENV: "development" });
  for (const name of ["MONGODB_URI", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "JWT_SECRET"]) {
    assert.ok(errors.some((e) => e.includes(name)), name);
  }
});

test("a short JWT secret is an error", () => {
  const { errors } = validateEnv({ ...good, JWT_SECRET: "short" });
  assert.ok(errors.some((e) => e.includes("JWT_SECRET")));
});

test("production needs a real CLIENT_URL, not localhost", () => {
  assert.ok(validateEnv({ ...good, CLIENT_URL: "" }).errors.some((e) => e.includes("CLIENT_URL")));
  assert.ok(
    validateEnv({ ...good, CLIENT_URL: "http://localhost:5173" }).errors.some((e) => e.includes("localhost"))
  );
  // Localhost next to the real site (handy for testing) is allowed.
  assert.deepEqual(
    validateEnv({ ...good, CLIENT_URL: "http://localhost:5173,https://draftera.vercel.app" }).errors,
    []
  );
});

test("development does not require CLIENT_URL", () => {
  const { errors } = validateEnv({ ...good, NODE_ENV: "development", CLIENT_URL: "" });
  assert.deepEqual(errors, []);
});

test("a trailing slash or plain http in production is warned about", () => {
  const slash = validateEnv({ ...good, CLIENT_URL: "https://draftera.vercel.app/" });
  assert.ok(slash.warnings.some((w) => w.includes("trailing slash")));

  const http = validateEnv({ ...good, CLIENT_URL: "http://draftera.example.com" });
  assert.ok(http.warnings.some((w) => w.includes("https")));
});

test("optional features warn instead of failing", () => {
  const { errors, warnings } = validateEnv({ ...good, GEMINI_API_KEY: "", BREVO_API_KEY: "" });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.includes("GEMINI_API_KEY")));
  assert.ok(warnings.some((w) => w.includes("BREVO_API_KEY")));
});
