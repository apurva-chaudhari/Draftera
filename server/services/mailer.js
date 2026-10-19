/**
 * Sends email through Brevo's HTTPS API (https://developers.brevo.com).
 *
 * An HTTPS API is used instead of SMTP on purpose: Render's free plan blocks
 * outbound SMTP ports (25, 465, 587), but ordinary HTTPS requests work.
 *
 * Configuration (server/.env):
 *   BREVO_API_KEY  API key from Brevo → SMTP & API → API keys
 *   MAIL_FROM      a sender verified in Brevo, e.g. "Draftera <you@gmail.com>"
 *
 * Without both, email is simply switched off: nothing is sent and nothing
 * breaks. Sending is best-effort and never throws, so a mail problem can
 * never fail the user's request.
 */
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 8000;

// Addresses that can never receive mail (seed data, tests). Skipping them
// avoids useless bounces that harm the sender's reputation.
const UNDELIVERABLE = /(@draftera\.demo|\.(demo|test|invalid|example|localhost)|@example\.(com|org|net))$/i;

/** Accepts "Name <a@b.com>" or "a@b.com". */
function parseSender(from) {
  const match = /^\s*(?:"?([^"<]*?)"?\s*)?<([^<>\s]+@[^<>\s]+)>\s*$/.exec(from || "");
  if (match) return { name: (match[1] || "").trim() || "Draftera", email: match[2] };
  if (/^[^\s<>@]+@[^\s<>@]+$/.test((from || "").trim())) {
    return { name: "Draftera", email: from.trim() };
  }
  return null;
}

function getMailConfig(env = process.env) {
  const apiKey = (env.BREVO_API_KEY || "").trim();
  const sender = parseSender(env.MAIL_FROM);
  return apiKey && sender ? { apiKey, sender } : null;
}

function isMailConfigured(env = process.env) {
  return getMailConfig(env) !== null;
}

/**
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
async function sendMail(
  { to, toName = "", subject, text, html },
  { env = process.env, fetchImpl = globalThis.fetch } = {}
) {
  const config = getMailConfig(env);

  if (!config) return { sent: false, reason: "not_configured" };
  if (!to || UNDELIVERABLE.test(to)) return { sent: false, reason: "undeliverable_address" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchImpl(BREVO_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "api-key": config.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: config.sender,
        to: [{ email: to, ...(toName ? { name: toName } : {}) }],
        subject,
        textContent: text,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      // Log the status only: the response body could echo addresses.
      console.error(`Email not sent: provider answered ${response.status}.`);
      return { sent: false, reason: `provider_${response.status}` };
    }

    return { sent: true };
  } catch (error) {
    console.error("Email not sent:", error.name === "AbortError" ? "timed out" : error.message);
    return { sent: false, reason: "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendMail, isMailConfigured, getMailConfig, parseSender, UNDELIVERABLE };
