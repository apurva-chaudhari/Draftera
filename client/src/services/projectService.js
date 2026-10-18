import { apiRequest } from "./api.js";

const projectService = {
  list() {
    return apiRequest("/projects");
  },

  get(projectId) {
    return apiRequest(`/projects/${projectId}`);
  },

  create(payload) {
    return apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  addMember(projectId, payload) {
    return apiRequest(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getCurrency(projectId) {
    return apiRequest(`/projects/${projectId}/currency`);
  },

  getActivity(projectId) {
    return apiRequest(`/projects/${projectId}/activity`);
  },
};

export default projectService;
