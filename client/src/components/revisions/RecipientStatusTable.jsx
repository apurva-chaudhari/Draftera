import { useState } from "react";
import workflowService from "../../services/workflowService.js";
import { RecipientStatus } from "../ui/Badge.jsx";
import { Alert } from "../ui/Feedback.jsx";
import { formatDateTime, roleLabel, timeAgo } from "../../utils/format.js";

/** Supervisor view: every recipient and exactly how far they have got. */
function RecipientStatusTable({ revision, acknowledgments, onChanged }) {
  const [message, setMessage] = useState(null);
  const [busyId, setBusyId] = useState("");

  async function remind(userId) {
    setMessage(null);
    setBusyId(userId);

    try {
      const response = await workflowService.sendReminder(revision._id, userId);
      setMessage({ kind: "success", text: response.message });
      onChanged();
    } catch (requestError) {
      setMessage({ kind: "error", text: requestError.message });
    } finally {
      setBusyId("");
    }
  }

  const stateOf = (ack) =>
    ack.status === "acknowledged" ? "acknowledged" : ack.viewedAt ? "opened" : "pending";

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2>Recipients</h2>
          <p>
            {acknowledgments.filter((a) => a.status === "acknowledged").length} of {acknowledgments.length} acknowledged
          </p>
        </div>
      </div>

      {message && <div style={{ padding: "16px 22px 0" }}><Alert kind={message.kind}>{message.text}</Alert></div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Person</th>
              <th>Status</th>
              <th>Opened</th>
              <th>Acknowledged</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {acknowledgments.map((ack) => (
              <tr key={ack._id}>
                <td>
                  <span className="cell-title">{ack.recipient?.name}</span>
                  <span className="cell-sub">{roleLabel(ack.recipientRole)}</span>
                </td>
                <td><RecipientStatus status={stateOf(ack)} /></td>
                <td>{formatDateTime(ack.viewedAt)}</td>
                <td>{formatDateTime(ack.acknowledgedAt)}</td>
                <td style={{ textAlign: "right" }}>
                  {ack.status !== "acknowledged" && revision.status === "published" && (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === ack.recipient._id} onClick={() => remind(ack.recipient._id)}>
                      {busyId === ack.recipient._id ? "Sending…" : "Remind"}
                    </button>
                  )}
                  {ack.lastRemindedAt && (
                    <span className="cell-sub">Reminded {timeAgo(ack.lastRemindedAt)} ({ack.reminderCount}×)</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecipientStatusTable;
