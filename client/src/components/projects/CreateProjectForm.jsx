import { useState } from "react";
import projectService from "../../services/projectService.js";
import { Alert } from "../ui/Feedback.jsx";

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

function CreateProjectForm({ onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
    };

    if (payload.name.length < 2 || payload.name.length > 150) {
      return setError("Project name must contain 2–150 characters.");
    }

    if (
      payload.code.length < 2 ||
      payload.code.length > 30 ||
      !CODE_PATTERN.test(payload.code)
    ) {
      return setError(
        "Project code must be 2–30 characters: letters, numbers, hyphens or underscores."
      );
    }

    setSaving(true);

    try {
      const response = await projectService.create(payload);
      onCreated(response.project);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <div className="card-header">
        <div>
          <h2>New project</h2>
          <p>You become the project supervisor and can add your team afterwards.</p>
        </div>
      </div>

      <div className="card-body">
        {error && <Alert kind="error">{error}</Alert>}

        <div className="form-grid">
          <label className="field">
            Project name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Riverside Commercial Tower" maxLength={150} required disabled={saving} />
          </label>

          <label className="field">
            Project code
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="RCT-001" maxLength={30} required disabled={saving} />
            <small>Letters, numbers, hyphens, underscores. Must be unique.</small>
          </label>

          <label className="field full">
            Description (optional)
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} disabled={saving} />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create project"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

export default CreateProjectForm;
