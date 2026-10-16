
import { apiRequest } from "./api.js";

const TOKEN_KEY = "draftera_token";
const USER_KEY = "draftera_user";

const authService = {
  async register(userData) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  async login(credentials) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (!data.token) {
      throw new Error("Login response did not include an authentication token.");
    }

    localStorage.setItem(TOKEN_KEY, data.token);

    if (data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data;
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
