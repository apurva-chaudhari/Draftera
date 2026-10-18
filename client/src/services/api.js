const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const TOKEN_KEY = "draftera_token";
const USER_KEY = "draftera_user";

/**
 * Thin wrapper around fetch for the Draftera API.
 *  - adds the bearer token
 *  - sends JSON unless the body is FormData (file uploads)
 *  - turns API errors into Error objects with the server's message
 *  - signs the user out if the server says the token is no longer valid
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const isJsonBody = typeof options.body === "string";

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot reach the server. Check your connection and try again."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && token) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.assign("/login");
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

/**
 * Download a file (e.g. a CSV report) with the bearer token and hand it to
 * the browser as a save-as. A plain link cannot be used because the API needs
 * the Authorization header.
 */
async function apiDownload(endpoint, fallbackName) {
  const token = localStorage.getItem(TOKEN_KEY);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "The file could not be downloaded.");
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
