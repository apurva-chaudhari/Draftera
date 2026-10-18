import { useState } from "react";
import { Link } from "react-router-dom";
import workflowService from "../../services/workflowService.js";
import { Alert } from "../ui/Feedback.jsx";
import { formatDateTime } from "../../utils/format.js";

/**
 * Recipient workflow in two deliberate steps:
 *   1. open the drawing (this is what records "delivery evidence")
 *   2. acknowledge receipt
 * Acknowledgment is not approval, and the wording says so.
 */
function AcknowledgePanel({ revision, acknowledgment, supersededBy, onOpen, onAcknowledged }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAcknowledge() {
    setError("");
    setSaving(true);

    try {
      await workflowService.acknowledge(revision._id);
      onAcknowledged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (revision.status === "superseded" && acknowledgment.status !== "acknowledged") {
    return (
      <div className="card">
        <div className="card-body">
          <Alert kind="warning">
            <span>
              <strong>This revision is no longer current.</strong> No action is needed here.
              {supersededBy && (
                <> Open <Link to={`/revisions/${supersededBy._id}`}>Rev {supersededBy.revisionNumber}</Link> instead.</>
              )}
            </span>
          </Alert>
        </div>
      </div>
    );
  }

  const opened = Boolean(acknowledgment.viewedAt);
  const done = acknowledgment.status === "acknowledged";

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Your confirmation</h2>
          <p>You were asked to confirm you have received this revision.</p>
        </div>
      </div>

      <div className="card-body">
        {error && <Alert kind="error">{error}</Alert>}

        <div className="steps">
          <div className={`step ${opened ? "done" : ""}`}>
            <h3>1. Open the drawing</h3>
            <p>{opened ? `Opened ${formatDateTime(acknowledgment.viewedAt)}.` : "View the PDF so you know exactly what changed."}</p>
            <button type="button" className={`btn btn-sm ${opened ? "btn-secondary" : "btn-primary"}`} onClick={onOpen}>
              {opened ? "Open again" : "Open drawing"}
            </button>
          </div>

          <div className={`step ${done ? "done" : ""}`}>
            <h3>2. Acknowledge receipt</h3>
            <p>
              {done
                ? `Acknowledged ${formatDateTime(acknowledgment.acknowledgedAt)}.`
                : "Confirms you have the latest revision and will work from it. It does not mean you approve the design."}
            </p>
            {!done && (
              <button type="button" className="btn btn-success btn-sm" onClick={handleAcknowledge} disabled={!opened || saving}>
                {saving ? "Saving…" : `Acknowledge Rev ${revision.revisionNumber}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcknowledgePanel;
