import { useState } from "react";
import { Link } from "react-router-dom";
import workflowService from "../../services/workflowService.js";
import { Alert } from "../ui/Feedback.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";
import { formatDateTime } from "../../utils/format.js";

/**
 * Recipient workflow in two deliberate steps:
 *   1. open the drawing (this is what records "delivery evidence")
 *   2. acknowledge receipt
 * Acknowledgment is not approval, and the wording says so.
 */
function AcknowledgePanel({ revision, acknowledgment, supersededBy, onOpen, onAcknowledged }) {
  const { t } = useI18n();
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
              <strong>{t("ack.notCurrent")}</strong> {t("ack.noAction")}
              {supersededBy && (
                <> {t("ack.openInstead")} <Link to={`/revisions/${supersededBy._id}`}>{t("common.rev")} {supersededBy.revisionNumber}</Link>.</>
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
          <h2>{t("ack.title")}</h2>
          <p>{t("ack.desc")}</p>
        </div>
      </div>

      <div className="card-body">
        {error && <Alert kind="error">{error}</Alert>}

        <div className="steps">
          <div className={`step ${opened ? "done" : ""}`}>
            <h3>{t("ack.step1")}</h3>
            <p>{opened ? t("ack.openedAt", { date: formatDateTime(acknowledgment.viewedAt) }) : t("ack.viewPdfHint")}</p>
            <button type="button" className={`btn btn-sm ${opened ? "btn-secondary" : "btn-primary"}`} onClick={onOpen}>
              {opened ? t("ack.openAgain") : t("ack.openDrawing")}
            </button>
          </div>

          <div className={`step ${done ? "done" : ""}`}>
            <h3>{t("ack.step2")}</h3>
            <p>
              {done
                ? t("ack.acknowledgedAt", { date: formatDateTime(acknowledgment.acknowledgedAt) })
                : t("ack.receiptNote")}
            </p>
            {!done && (
              <button type="button" className="btn btn-success btn-sm" onClick={handleAcknowledge} disabled={!opened || saving}>
                {saving ? t("common.saving") : t("ack.button", { rev: revision.revisionNumber })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AcknowledgePanel;
