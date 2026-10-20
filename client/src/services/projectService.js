import { apiDownload, apiRequest } from "./api.js";

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

  /** Change status, name or description (supervisor only). */
  update(projectId, payload) {
    return apiRequest(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  addMember(projectId, payload) {
    return apiRequest(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  removeMember(projectId, userId) {
    return apiRequest(`/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  getCurrency(projectId) {
    return apiRequest(`/projects/${projectId}/currency`);
  },

  downloadReport(projectId) {
    return apiDownload(`/projects/${projectId}/report.csv`, "distribution-report.csv");
  },

  getActivity(projectId) {
    return apiRequest(`/projects/${projectId}/activity`);
  },
};

export default projectService;
