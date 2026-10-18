import { apiRequest } from "./api.js";

const drawingService = {
  uploadRevision(formData) {
    return apiRequest("/drawings/upload", { method: "POST", body: formData });
  },

  listProjectRevisions(projectId) {
    return apiRequest(`/drawings/project/${projectId}`);
  },

  getRevision(revisionId) {
    return apiRequest(`/drawings/revision/${revisionId}`);
  },

  publishRevision(revisionId, recipients, dueInHours = null) {
    return apiRequest(`/drawings/${revisionId}/publish`, {
      method: "POST",
      body: JSON.stringify({ recipients, dueInHours }),
    });
  },

  /** Issue an already-published revision to people who were left off. */
  addRecipients(revisionId, recipients) {
    return apiRequest(`/drawings/revision/${revisionId}/recipients`, {
      method: "POST",
      body: JSON.stringify({ recipients }),
    });
  },

  /** Returns a short-lived signed URL and records that the user opened it. */
  openRevisionFile(revisionId) {
    return apiRequest(`/drawings/revision/${revisionId}/open`, {
      method: "POST",
    });
  },
};

export default drawingService;
