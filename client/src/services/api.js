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

export { API_BASE_URL, apiRequest };
