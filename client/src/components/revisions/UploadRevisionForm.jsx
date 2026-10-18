import { useState } from "react";
import drawingService from "../../services/drawingService.js";
import { Alert } from "../ui/Feedback.jsx";

const MAX_BYTES = 10 * 1024 * 1024;
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Uploads a PDF as a DRAFT. Nothing reaches the team until the supervisor
 * publishes it and chooses recipients.
 */
function UploadRevisionForm({ projectId, existingDrawings = [], onUploaded, onCancel }) {
  const [drawingNumber, setDrawingNumber] = useState("");
  const [title, setTitle] = useState("");
  const [revisionNumber, setRevisionNumber] = useState("A");
  const [issueDate, setIssueDate] = useState(today());
  const [changeSummary, setChangeSummary] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Picking an existing drawing number pre-fills its title.
  function handleDrawingNumber(value) {
    setDrawingNumber(value);
    const match = existingDrawings.find(
      (drawing) => drawing.drawingNumber === value.trim().toUpperCase()
    );
    if (match) setTitle(match.title);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!file) return setError("Choose a PDF drawing to upload.");
    if (file.type !== "application/pdf") return setError("Only PDF files are allowed.");
    if (file.size > MAX_BYTES) return setError("The PDF must be 10 MB or smaller.");

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("drawingNumber", drawingNumber.trim());
    formData.append("title", title.trim());
    formData.append("revisionNumber", revisionNumber.trim());
    formData.append("issueDate", issueDate);
    formData.append("changeSummary", changeSummary.trim());
    formData.append("file", file);

    setSaving(true);

    try {
      const response = await drawingService.uploadRevision(formData);
      onUploaded(response.revision);
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
          <h2>Upload drawing revision</h2>
          <p>Saved as a draft. You choose who receives it when you publish.</p>
        </div>
      </div>

      <div className="card-body">
        {error && <Alert kind="error">{error}</Alert>}

        <div className="form-grid">
          <label className="field">
            Drawing number
            <input list="existing-drawings" value={drawingNumber} onChange={(e) => handleDrawingNumber(e.target.value)} placeholder="STR-101" maxLength={100} required disabled={saving} />
            <datalist id="existing-drawings">
              {existingDrawings.map((drawing) => (
                <option key={drawing._id} value={drawing.drawingNumber}>{drawing.title}</option>
              ))}
            </datalist>
            <small>Pick an existing number to add a new revision to that drawing.</small>
          </label>

          <label className="field">
            Drawing title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Level 3 slab reinforcement" minLength={2} maxLength={200} required disabled={saving} />
          </label>

          <label className="field">
            Revision
            <input value={revisionNumber} onChange={(e) => setRevisionNumber(e.target.value)} placeholder="A, B, C…" maxLength={30} required disabled={saving} />
          </label>

          <label className="field">
            Issue date
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required disabled={saving} />
          </label>

          <label className="field full">
            What changed in this revision?
            <textarea rows={3} value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="e.g. Bar spacing reduced to 100 mm c/c near the lift core. Do not use Rev A." minLength={3} maxLength={5000} required disabled={saving} />
            <small>Recipients read this first. Say what changed and what to stop doing.</small>
          </label>

          <label className="field full">
            Drawing file (PDF, max 10 MB)
            <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} required disabled={saving} />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Uploading…" : "Save as draft"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

export default UploadRevisionForm;
