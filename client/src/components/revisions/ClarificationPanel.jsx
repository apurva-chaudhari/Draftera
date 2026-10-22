import { useState } from "react";
import workflowService from "../../services/workflowService.js";
import { ClarificationStatus } from "../ui/Badge.jsx";
import { Alert } from "../ui/Feedback.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";
import { formatDateTime } from "../../utils/format.js";

function Thread({ item, isSupervisor, currentUserId, onChanged, onError }) {
  const { t } = useI18n();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setBusy(true);
    try {
      await action();
      setAnswer("");
      onChanged();
    } catch (requestError) {
      onError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const canResolve =
    item.status === "answered" &&
    (isSupervisor || item.requestedBy?._id === currentUserId);

  return (
    <div className="thread">
      <div className="thread-meta">
        <ClarificationStatus status={item.status} />
        <span>{item.requestedBy?.name} · {formatDateTime(item.createdAt)}</span>
      </div>

      <p className="thread-question">{item.question}</p>

      {item.response && (
        <div className="thread-answer">
          {item.response}
          <span className="cell-sub">
            {item.respondedBy?.name} · {formatDateTime(item.respondedAt)}
          </span>
        </div>
      )}

      {isSupervisor && item.status !== "resolved" && (
        <div style={{ marginTop: 12 }}>
          <textarea className="input" rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={item.response ? t("clar.updatePlaceholder") : t("clar.answerPlaceholder")} maxLength={5000} disabled={busy} />
          <div className="form-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !answer.trim()} onClick={() => run(() => workflowService.respondToClarification(item._id, answer))}>
              {item.response ? t("clar.updateAnswer") : t("clar.sendAnswer")}
            </button>
          </div>
        </div>
      )}

      {canResolve && (
        <div className="form-actions" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => run(() => workflowService.resolveClarification(item._id))}>
            {t("clar.resolve")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Questions about one revision, kept next to the drawing they concern. */
function ClarificationPanel({ revision, clarifications, isSupervisor, currentUserId, onChanged }) {
  const { t } = useI18n();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAsk(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await workflowService.askClarification(revision._id, question.trim());
      setQuestion("");
      onChanged();
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
          <h2>{t("clar.title", { count: clarifications.length })}</h2>
          <p>{t("clar.desc")}</p>
        </div>
      </div>

      {error && <div style={{ padding: "16px 22px 0" }}><Alert kind="error">{error}</Alert></div>}

      {clarifications.map((item) => (
        <Thread key={item._id} item={item} isSupervisor={isSupervisor} currentUserId={currentUserId} onChanged={onChanged} onError={setError} />
      ))}

      {clarifications.length === 0 && (
        <p style={{ padding: "18px 22px", color: "var(--color-text-muted)", fontSize: 13.5 }}>{t("clar.none")}</p>
      )}

      {revision.status !== "draft" && (
        <form className="card-body" onSubmit={handleAsk} style={{ borderTop: "1px solid var(--color-border)" }}>
          <label className="field">
            {t("clar.ask")}
            <textarea rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("clar.askPlaceholder")} minLength={5} maxLength={5000} required disabled={saving} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving || question.trim().length < 5}>
              {saving ? t("common.sending") : t("clar.submit")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ClarificationPanel;
