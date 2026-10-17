
import { apiRequest } from "./api.js";

const TOKEN_KEY = "draftera_token";
const USER_KEY = "draftera_user";

function saveSession(data, action) {
  if (!data.token) {
    throw new Error(
      `${action} response did not include an authentication token.`
    );
  }

  if (!data.user) {
    throw new Error(`${action} response did not include user information.`);
  }

  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));

  return data;
}

const authService = {
  async register(userData) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });

    return saveSession(data, "Registration");
  },

  async login(credentials) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    return saveSession(data, "Login");
  },

  async getCurrentUser() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      throw new Error("You are not logged in.");
    }

    return apiRequest("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
};

export default authService;
