import { useState } from "react";
import workflowService from "../../services/workflowService.js";
import { RecipientStatus } from "../ui/Badge.jsx";
import { Alert } from "../ui/Feedback.jsx";
import Badge from "../ui/Badge.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";
import { dueLabel, formatDateTime, isOverdue, roleLabel, timeAgo } from "../../utils/format.js";

/** Supervisor view: every recipient and exactly how far they have got. */
function RecipientStatusTable({ revision, acknowledgments, onChanged }) {
  const { t } = useI18n();
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
          <h2>{t("recipients.title")}</h2>
          <p>
            {t("recipients.progress", { done: acknowledgments.filter((a) => a.status === "acknowledged").length, total: acknowledgments.length })}
            {revision.status === "published" && revision.ackDueAt && <> · {dueLabel(revision.ackDueAt)}</>}
          </p>
        </div>
      </div>

      {message && <div style={{ padding: "16px 22px 0" }}><Alert kind={message.kind}>{message.text}</Alert></div>}

      <div className="table-wrap">
        <table className="table table-cards">
          <thead>
            <tr>
              <th>{t("col.person")}</th>
              <th>{t("col.status")}</th>
              <th>{t("col.opened")}</th>
              <th>{t("col.acknowledged")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {acknowledgments.map((ack) => (
              <tr key={ack._id}>
                <td data-label={t("col.person")}>
                  <span className="cell-title">{ack.recipient?.name}</span>
                  <span className="cell-sub">{roleLabel(ack.recipientRole)}</span>
                </td>
                <td data-label={t("col.status")}>
                  <div>
                    <RecipientStatus status={stateOf(ack)} />
                    {stateOf(ack) !== "acknowledged" && revision.status === "published" && isOverdue(revision.ackDueAt) && (
                      <div style={{ marginTop: 4 }}><Badge tone="danger">{t("common.overdue")}</Badge></div>
                    )}
                  </div>
                </td>
                <td data-label={t("col.opened")}>{formatDateTime(ack.viewedAt)}</td>
                <td data-label={t("col.acknowledged")}>{formatDateTime(ack.acknowledgedAt)}</td>
                <td data-label="" style={{ textAlign: "right" }}>
                  {ack.status !== "acknowledged" && revision.status === "published" && (
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busyId === ack.recipient._id} onClick={() => remind(ack.recipient._id)}>
                      {busyId === ack.recipient._id ? t("common.sending") : t("common.remind")}
                    </button>
                  )}
                  {ack.lastRemindedAt && (
                    <span className="cell-sub">{t("recipients.reminded", { when: timeAgo(ack.lastRemindedAt), n: ack.reminderCount })}</span>
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
