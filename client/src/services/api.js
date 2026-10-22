import { translate } from "../i18n/core.js";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Thin wrapper around fetch for the Draftera API.
 *  - the session lives in an httpOnly cookie that the browser sends by itself
 *    (credentials: "include"); page scripts never see or store the token
 *  - sends JSON unless the body is FormData (file uploads)
 *  - turns API errors into Error objects with the server's message
 *  - sends the user to the login page if the session has expired
 */
async function apiRequest(endpoint, options = {}) {
  const isJsonBody = typeof options.body === "string";

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(translate("api.unreachable"));
  }

  const data = await response.json().catch(() => ({}));

  // An expired session on a normal page sends the user back to sign in.
  // The /auth calls handle their own 401s (wrong password, not signed in).
  if (response.status === 401 && !endpoint.startsWith("/auth/")) {
    window.location.assign("/login");
  }

  if (!response.ok) {
    throw new Error(data.message || translate("api.generic"));
  }

  return data;
}

/**
 * Download a file (e.g. a CSV report) with the session cookie and hand it to
 * the browser as a save-as.
 */
async function apiDownload(endpoint, fallbackName) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: "include",
    });
  } catch {
    throw new Error(translate("api.unreachable"));
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || translate("api.downloadFailed"));
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/);
  const filename = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export { API_BASE_URL, apiRequest, apiDownload };
