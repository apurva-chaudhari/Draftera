/**
 * Startup configuration check. Pure (takes the environment as an argument),
 * so it is easy to unit test.
 *
 * `errors` stop the server from starting: a deployment that boots without
 * them would only fail later, on the first sign-in or upload, with a vague
 * message. `warnings` are logged and the server still starts.
 */
function isLocalOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(origin);
}

function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  const production = env.NODE_ENV === "production";
  const has = (name) => Boolean(String(env[name] || "").trim());

  for (const name of ["MONGODB_URI", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
    if (!has(name)) errors.push(`${name} is not set.`);
  }

  const secret = String(env.JWT_SECRET || "");
  if (secret.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters.");
  }

  const origins = String(env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (production) {
    if (origins.length === 0) {
      errors.push("CLIENT_URL is not set. Set it to your web app address (https, no trailing slash).");
    } else if (origins.every(isLocalOrigin)) {
      errors.push("CLIENT_URL only lists localhost, so no browser on the real site could sign in.");
    }

    if (origins.some((origin) => origin.endsWith("/"))) {
      warnings.push("CLIENT_URL has a trailing slash. Remove it or browsers will be refused by CORS.");
    }

    if (origins.some((origin) => origin.startsWith("http://") && !isLocalOrigin(origin))) {
      warnings.push("CLIENT_URL contains an http:// address. Use https in production.");
    }
  }

  if (!has("GEMINI_API_KEY")) {
    warnings.push("GEMINI_API_KEY is not set: the AI drawing assistant is switched off.");
  }

  if (!has("BREVO_API_KEY") || !has("MAIL_FROM")) {
    warnings.push("BREVO_API_KEY / MAIL_FROM are not both set: email notifications are switched off.");
  }

  return { errors, warnings };
}

module.exports = { validateEnv };
