import { apiRequest } from "./api.js";

/**
 * Sign-in state lives in an httpOnly cookie set by the server, so nothing is
 * kept in localStorage and page scripts can never read the session token.
 */
const authService = {
  register(userData) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  login(credentials) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  /** Asks the server who the cookie belongs to. Rejects when signed out. */
  getCurrentUser() {
    return apiRequest("/auth/me");
  },

  /** Ends the session on the server (clears the cookie). Never throws. */
  async logout() {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {
      // Already signed out or offline: the user is leaving either way.
    }
  },
};

export default authService;
