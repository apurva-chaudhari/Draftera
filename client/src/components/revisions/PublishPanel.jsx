import { useState } from "react";
import drawingService from "../../services/drawingService.js";
import { Alert } from "../ui/Feedback.jsx";
import { roleLabel } from "../../utils/format.js";

/**
 * Supervisor step: choose recipients and issue a draft. Publishing creates
 * one separate acknowledgment record per person and supersedes the previous
 * revision of the same drawing.
 */
function PublishPanel({ revisionId, members, currentUserId, onPublished }) {
  // The supervisor issues the drawing; they are not part of the audience.
  const audience = members.filter((member) => member.user._id !== currentUserId);

  const [selected, setSelected] = useState(() => new Set(audience.map((m) => m.user._id)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggle(id) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePublish() {
    setError("");
    setSaving(true);

    try {
      await drawingService.publishRevision(revisionId, [...selected]);
      onPublished();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Publish this revision</h2>
          <p>Everyone selected must acknowledge it. Any earlier published revision of this drawing becomes superseded.</p>
        </div>
      </div>

      <div className="card-body">
        {error && <Alert kind="error">{error}</Alert>}

        {audience.length === 0 ? (
          <Alert kind="warning">
            Add site engineers or subcontractors to the project team before publishing.
          </Alert>
        ) : (
          <div className="checklist">
            {audience.map((member) => (
              <label className="check-row" key={member.user._id}>
                <input type="checkbox" checked={selected.has(member.user._id)} onChange={() => toggle(member.user._id)} disabled={saving} />
                <span>
                  <strong>{member.user.name}</strong>
                  <span className="cell-sub">{roleLabel(member.role)}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={saving || selected.size === 0}>
          {saving ? "Publishing…" : `Publish to ${selected.size} ${selected.size === 1 ? "person" : "people"}`}
        </button>
      </div>
    </div>
  );
}

export default PublishPanel;
