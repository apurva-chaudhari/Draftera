import { apiRequest } from "./api.js";

/** Dashboard, acknowledgment and clarification endpoints. */
const workflowService = {
  getDashboard() {
    return apiRequest("/dashboard/summary");
  },

  listMyAcknowledgments() {
    return apiRequest("/acknowledgments/mine");
  },

  acknowledge(revisionId) {
    return apiRequest(`/acknowledgments/${revisionId}/acknowledge`, {
      method: "POST",
    });
  },

  sendReminder(revisionId, userId) {
    return apiRequest(`/acknowledgments/${revisionId}/remind/${userId}`, {
      method: "POST",
    });
  },

  listMyClarifications() {
    return apiRequest("/clarifications/mine");
  },

  askClarification(revisionId, question) {
    return apiRequest(`/clarifications/revision/${revisionId}`, {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },

  respondToClarification(clarificationId, response) {
    return apiRequest(`/clarifications/${clarificationId}/respond`, {
      method: "PATCH",
      body: JSON.stringify({ response }),
    });
  },

  resolveClarification(clarificationId) {
    return apiRequest(`/clarifications/${clarificationId}/resolve`, {
      method: "PATCH",
    });
  },
};

export default workflowService;
