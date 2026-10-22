import { useState } from "react";
import { Link } from "react-router-dom";
import workflowService from "../../services/workflowService.js";
import drawingService from "../../services/drawingService.js";
import Badge, { RecipientStatus } from "../ui/Badge.jsx";
import { Alert, EmptyState } from "../ui/Feedback.jsx";
import RevChip from "../ui/RevChip.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";
import { dueLabel, formatDate, formatDateTime, roleLabel, timeAgo } from "../../utils/format.js";

/**
 * The supervisor's answer to "does everyone have the latest drawing?".
 * For each drawing it lists every team member against the CURRENT revision
 * and flags anyone who acknowledged an older revision but not this one.
 */
function CurrencyMatrix({ data, onChanged }) {
  const { t } = useI18n();
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
        <EmptyState title={t("currency.empty")}>
          {t("currency.empty.body")}
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
          <strong>{t("currency.overdue", { count: totals.overdue })}</strong> {t("currency.overdue.body")}
        </Alert>
      )}

      {totals.atRisk > 0 ? (
        <Alert kind="warning">
          <strong>{t("currency.atRisk", { count: totals.atRisk })}</strong> {t("currency.atRisk.body")}
        </Alert>
      ) : (
        <Alert kind="success">{t("currency.allGood")}</Alert>
      )}

      <div className="legend">
        <span><strong>{t("col.acknowledged")}</strong>: {t("currency.legend.acknowledged")}</span>
        <span><strong>{t("col.opened")}</strong>: {t("currency.legend.opened")}</span>
        <span><strong>{t("recipient.pending")}</strong>: {t("currency.legend.pending")}</span>
        <span><strong>{t("recipient.notIssued")}</strong>: {t("currency.legend.notIssued")}</span>
      </div>

      {data.drawings.map((row) => (
        <div className="card" key={row.drawing._id}>
          <div className="card-header">
            <div className="matrix-head">
              <h2 className="mono">{row.drawing.drawingNumber}</h2>
              <span style={{ color: "var(--color-text-muted)", fontSize: 13.5 }}>{row.drawing.title}</span>
            </div>
            <div className="matrix-head">
              <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{t("revision.current")}</span>
              <RevChip revision={row.currentRevision.revisionNumber} />
              <Link to={`/revisions/${row.currentRevision._id}`} style={{ fontSize: 13 }}>{t("common.view")}</Link>
            </div>
          </div>

          <div className="table-wrap">
            <table className="table table-cards">
              <thead>
                <tr>
                  <th>{t("col.person")}</th>
                  <th>{t("currency.col.status")}</th>
                  <th>{t("col.opened")}</th>
                  <th>{t("col.acknowledged")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {row.people.map((person) => {
                  const key = `${row.currentRevision._id}:${person.user._id}`;
                  const canRemind = ["pending", "opened"].includes(person.state);

                  return (
                    <tr key={person.user._id}>
                      <td data-label={t("col.person")}>
                        <span className="cell-title">{person.user.name}</span>
                        <span className="cell-sub">{roleLabel(person.role)}</span>
                      </td>
                      <td data-label={t("col.status")}>
                        <div>
                        <RecipientStatus status={person.state} />
                        {person.overdue && <> <Badge tone="danger">{t("common.overdue")}</Badge></>}
                        {person.atRisk && (
                          <span className="risk-note">
                            {t("currency.riskNote", { rev: person.lastAckedRevision })}
                          </span>
                        )}
                        </div>
                      </td>
                      <td data-label={t("col.opened")}>{formatDateTime(person.viewedAt)}</td>
                      <td data-label={t("col.acknowledged")}>{formatDateTime(person.acknowledgedAt)}</td>
                      <td data-label="" style={{ textAlign: "right" }}>
                        {canRemind && (
                          <button type="button" className="btn btn-secondary btn-sm" disabled={busyKey === key} onClick={() => remind(row.currentRevision._id, person)}>
                            {busyKey === key ? t("common.sending") : t("common.remind")}
                          </button>
                        )}
                        {person.lastRemindedAt && (
                          <span className="cell-sub">{t("currency.reminded", { when: timeAgo(person.lastRemindedAt) })}</span>
                        )}
                        {person.state === "not_issued" && (
                          <button type="button" className="btn btn-primary btn-sm" disabled={busyKey === key} onClick={() => issueTo(row.currentRevision._id, person)}>
                            {busyKey === key ? t("currency.issuing") : t("currency.issueTo")}
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
            {t("currency.issuedOn", { date: formatDate(row.currentRevision.publishedAt) })}
            {row.currentRevision.ackDueAt && <> · {dueLabel(row.currentRevision.ackDueAt)}</>}. {t("currency.receiptOnly")}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CurrencyMatrix;
