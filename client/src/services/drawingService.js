
import { API_BASE_URL } from "./api.js";

const drawingService = {
  async uploadRevision(formData) {
    const token = localStorage.getItem("draftera_token");

    if (!token) {
      throw new Error("Please log in to upload a drawing.");
    }

    const response = await fetch(`${API_BASE_URL}/drawings/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to upload the drawing revision."
      );
    }

    return data;
  },
};

export default drawingService;
