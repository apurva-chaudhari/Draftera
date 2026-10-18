import { useState } from "react";
import { Link } from "react-router-dom";
import workflowService from "../../services/workflowService.js";
import drawingService from "../../services/drawingService.js";
import Badge, { RecipientStatus } from "../ui/Badge.jsx";
import { Alert, EmptyState } from "../ui/Feedback.jsx";
import RevChip from "../ui/RevChip.jsx";
import { dueLabel, formatDate, formatDateTime, roleLabel, timeAgo } from "../../utils/format.js";

/**
 * The supervisor's answer to "does everyone have the latest drawing?".
 * For each drawing it lists every team member against the CURRENT revision
 * and flags anyone who acknowledged an older revision but not this one.
 */
function CurrencyMatrix({ data, onChanged }) {
  const [message, setMessage] = useState(null);
  const [busyKey, setBusyKey] = useState("");

  async function remind(revisionId, person) {
    setMessage(null);
    setBusyKey(`${revisionId}:${person.user._id}`);

    try {
      const response = await workflowService.sendReminder(revisionId, person.user._id);
      setMessage({ kind: "success", text: response.message });
      onChanged();
    } catch (requestError) {
      setMessage({ kind: "error", text: requestError.message });
    } finally {
      setBusyKey("");
    }
  }

  async function issueTo(revisionId, person) {
    setMessage(null);
    setBusyKey(`${revisionId}:${person.user._id}`);

    try {
      const response = await drawingService.addRecipients(revisionId, [person.user._id]);
      setMessage({ kind: "success", text: response.message });
      onChanged();
    } catch (requestError) {
      setMessage({ kind: "error", text: requestError.message });
    } finally {
      setBusyKey("");
    }
  }

  if (!data.drawings.length) {
    return (
      <div className="card">
        <EmptyState title="Nothing to track yet">
          Publish a drawing revision and this view will show who has opened and acknowledged it, and who may still be working from an older one.
        </EmptyState>
      </div>
    );
  }

  const { totals } = data;

  return (
    <div className="stack">
      {message && <Alert kind={message.kind}>{message.text}</Alert>}

      {totals.overdue > 0 && (
        <Alert kind="error">
          <strong>{totals.overdue} {totals.overdue === 1 ? "acknowledgment is" : "acknowledgments are"} overdue.</strong> The deadline has passed without confirmation.
        </Alert>
      )}

      {totals.atRisk > 0 ? (
        <Alert kind="warning">
          <strong>{totals.atRisk} {totals.atRisk === 1 ? "person has" : "people have"} not confirmed the latest revision</strong> after
          acknowledging an earlier one. They may be building from a superseded drawing.
        </Alert>
      ) : (
        <Alert kind="success">Nobody is known to be on an out-of-date drawing.</Alert>
      )}

      <div className="legend">
        <span><strong>Acknowledged</strong>: confirmed receipt of the current revision</span>
        <span><strong>Opened</strong>: viewed the file, not yet confirmed</span>
        <span><strong>Not opened</strong>: sent, no evidence it was seen</span>
        <span><strong>Not issued</strong>: left off the distribution list</span>
      </div>

      {data.drawings.map((row) => (
        <div className="card" key={row.drawing._id}>
          <div className="card-header">
            <div className="matrix-head">
              <h2 className="mono">{row.drawing.drawingNumber}</h2>
              <span style={{ color: "var(--color-text-muted)", fontSize: 13.5 }}>{row.drawing.title}</span>
            </div>
            <div className="matrix-head">
              <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Current</span>
              <RevChip revision={row.currentRevision.revisionNumber} />
              <Link to={`/revisions/${row.currentRevision._id}`} style={{ fontSize: 13 }}>View</Link>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Status on current revision</th>
                  <th>Opened</th>
                  <th>Acknowledged</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {row.people.map((person) => {
                  const key = `${row.currentRevision._id}:${person.user._id}`;
                  const canRemind = ["pending", "opened"].includes(person.state);

                  return (
                    <tr key={person.user._id}>
                      <td data-label="Person">
                        <span className="cell-title">{person.user.name}</span>
                        <span className="cell-sub">{roleLabel(person.role)}</span>
                      </td>
                      <td data-label="Status">
                        <div>
                        <RecipientStatus status={person.state} />
                        {person.overdue && <> <Badge tone="danger">Overdue</Badge></>}
                        {person.atRisk && (
                          <span className="risk-note">
                            Last acknowledged Rev {person.lastAckedRevision}. May still be working from it.
                          </span>
                        )}
                        </div>
                      </td>
                      <td data-label="Opened">{formatDateTime(person.viewedAt)}</td>
                      <td data-label="Acknowledged">{formatDateTime(person.acknowledgedAt)}</td>
                      <td data-label="" style={{ textAlign: "right" }}>
                        {canRemind && (
                          <button type="button" className="btn btn-secondary btn-sm" disabled={busyKey === key} onClick={() => remind(row.currentRevision._id, person)}>
                            {busyKey === key ? "Sending…" : "Remind"}
                          </button>
                        )}
                        {person.lastRemindedAt && (
                          <span className="cell-sub">Reminded {timeAgo(person.lastRemindedAt)}</span>
                        )}
                        {person.state === "not_issued" && (
                          <button type="button" className="btn btn-primary btn-sm" disabled={busyKey === key} onClick={() => issueTo(row.currentRevision._id, person)}>
                            {busyKey === key ? "Issuing…" : "Issue to them"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card-body" style={{ paddingTop: 12, paddingBottom: 14, color: "var(--color-text-faint)", fontSize: 12.5 }}>
            Issued {formatDate(row.currentRevision.publishedAt)}
            {row.currentRevision.ackDueAt && <> · {dueLabel(row.currentRevision.ackDueAt)}</>}. Acknowledgment confirms receipt only; it is not approval.
          </div>
        </div>
      ))}
    </div>
  );
}

export default CurrencyMatrix;
