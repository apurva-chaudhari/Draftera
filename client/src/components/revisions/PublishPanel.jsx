import { useState } from "react";
import drawingService from "../../services/drawingService.js";
import { Alert } from "../ui/Feedback.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";
import { roleLabel } from "../../utils/format.js";

// `label` is a translation key.
const DEADLINES = [
  { value: "", label: "time.noDeadline" },
  { value: "24", label: "publish.within24h" },
  { value: "48", label: "publish.within48h" },
  { value: "72", label: "publish.within3d" },
  { value: "168", label: "publish.within7d" },
];

/**
 * Supervisor step: choose recipients and a deadline, then issue the draft.
 * Publishing is hard to undo (it supersedes the previous revision and asks
 * people to act), so it needs a second, explicit confirmation.
 */
function PublishPanel({ revision, members, currentUserId, supersedes, onPublished }) {
  const { t } = useI18n();
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
          <h2>{t("publish.title")}</h2>
          <p>{t("publish.desc")}</p>
        </div>
      </div>

      <div className="card-body">
        {error && <Alert kind="error">{error}</Alert>}

        {audience.length === 0 ? (
          <Alert kind="warning">
            {t("publish.noAudience")}
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
          {t("tb.ackBy")}
          <select value={deadline} onChange={(e) => { setDeadline(e.target.value); setConfirming(false); }} disabled={saving}>
            {DEADLINES.map((option) => (
              <option key={option.value} value={option.value}>{t(option.label)}</option>
            ))}
          </select>
          <small>{t("publish.deadlineHint")}</small>
        </label>

        {confirming && (
          <div className="confirm-box" role="alert">
            <strong>{t("publish.confirm")}</strong>
            <ul>
              <li>{t("publish.willSend", { rev: revision.revisionNumber, count: selected.size })}</li>
              {supersedes && (
                <li>{t("publish.willSupersede", { rev: supersedes.revisionNumber })}</li>
              )}
              {omitted.length > 0 && (
                <li>{t("publish.notSentTo", { names: omitted.map((m) => m.user.name).join(", ") })}</li>
              )}
            </ul>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: 0 }}>
          {confirming ? (
            <>
              <button type="button" className="btn btn-accent" onClick={handlePublish} disabled={saving}>
                {saving ? t("publish.publishing") : t("publish.yes")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={saving}>
                {t("publish.goBack")}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-accent" onClick={() => setConfirming(true)} disabled={selected.size === 0}>
              {t("publish.review")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PublishPanel;
