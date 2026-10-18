import { useState } from "react";
import drawingService from "../../services/drawingService.js";
import { Alert } from "../ui/Feedback.jsx";
import { roleLabel } from "../../utils/format.js";

const DEADLINES = [
  { value: "", label: "No deadline" },
  { value: "24", label: "Within 24 hours" },
  { value: "48", label: "Within 48 hours" },
  { value: "72", label: "Within 3 days" },
  { value: "168", label: "Within 7 days" },
];

/**
 * Supervisor step: choose recipients and a deadline, then issue the draft.
 * Publishing is hard to undo (it supersedes the previous revision and asks
 * people to act), so it needs a second, explicit confirmation.
 */
function PublishPanel({ revision, members, currentUserId, supersedes, onPublished }) {
  // The supervisor issues the drawing; they are not part of the audience.
  const audience = members.filter((member) => member.user._id !== currentUserId);

  const [selected, setSelected] = useState(() => new Set(audience.map((m) => m.user._id)));
  const [deadline, setDeadline] = useState("48");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggle(id) {
    setConfirming(false);
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
      await drawingService.publishRevision(
        revision._id,
        [...selected],
        deadline ? Number(deadline) : null
      );
      onPublished();
    } catch (requestError) {
      setError(requestError.message);
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  const omitted = audience.filter((member) => !selected.has(member.user._id));

  return (
    <div className="card flagged">
      <div className="card-header">
        <div>
          <h2>Publish this revision</h2>
          <p>Choose who must receive it. Anyone left unticked will not be told about it.</p>
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

        <label className="field" style={{ maxWidth: 280, marginBottom: 16 }}>
          Acknowledge by
          <select value={deadline} onChange={(e) => { setDeadline(e.target.value); setConfirming(false); }} disabled={saving}>
            {DEADLINES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <small>People still pending after this are marked overdue.</small>
        </label>

        {confirming && (
          <div className="confirm-box" role="alert">
            <strong>Please confirm.</strong>
            <ul>
              <li>Rev {revision.revisionNumber} will be sent to {selected.size} {selected.size === 1 ? "person" : "people"}.</li>
              {supersedes && (
                <li>Rev {supersedes.revisionNumber} will become <strong>superseded</strong>; its confirmations will not carry over.</li>
              )}
              {omitted.length > 0 && (
                <li>Not sent to: {omitted.map((m) => m.user.name).join(", ")}.</li>
              )}
            </ul>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: 0 }}>
          {confirming ? (
            <>
              <button type="button" className="btn btn-accent" onClick={handlePublish} disabled={saving}>
                {saving ? "Publishing…" : "Yes, publish now"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={saving}>
                Go back
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-accent" onClick={() => setConfirming(true)} disabled={selected.size === 0}>
              Review and publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PublishPanel;
