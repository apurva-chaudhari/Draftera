/**
 * Session cookie helpers. No third-party imports, so they are easy to test.
 *
 * The signed session token lives in an httpOnly cookie: page scripts (and
 * any injected script) can never read it, unlike a token in localStorage.
 */
const SESSION_COOKIE = "draftera_session";
const SESSION_HOURS = 8;
const SESSION_MS = SESSION_HOURS * 60 * 60 * 1000;

/**
 * Cookie attributes. In production the API and the web app normally live on
 * different domains (Render + Vercel), so the cookie must be SameSite=None
 * and Secure to be sent at all. If both are served from one site (for
 * example through a Vercel proxy) set COOKIE_SAMESITE=lax.
 */
function sessionCookieOptions(env = process.env) {
  const production = env.NODE_ENV === "production";
  const requested = String(env.COOKIE_SAMESITE || "").toLowerCase();
  const sameSite = ["lax", "strict", "none"].includes(requested)
    ? requested
    : production
      ? "none"
      : "lax";

  return {
    httpOnly: true,
    // Browsers reject SameSite=None cookies that are not Secure.
    secure: production || sameSite === "none",
    sameSite,
    path: "/",
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions(),
    maxAge: SESSION_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions());
}

/** Read one cookie from the Cookie header without extra dependencies. */
function readCookie(req, name) {
  const header = req.headers && req.headers.cookie;
  if (!header) return null;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;

    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return null;
      }
    }
  }

  return null;
}

module.exports = {
  SESSION_COOKIE,
  SESSION_HOURS,
  SESSION_MS,
  sessionCookieOptions,
  setSessionCookie,
  clearSessionCookie,
  readCookie,
};
