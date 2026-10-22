import { useState } from "react";
import projectService from "../../services/projectService.js";
import { roleLabel, initials, formatDate } from "../../utils/format.js";
import { Alert } from "../ui/Feedback.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";

function TeamPanel({ project, isSupervisor, onChanged }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("subcontractor");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  async function handleRemove(member) {
    const ok = window.confirm(t("team.removeConfirm", { name: member.user.name }));
    if (!ok) return;

    setMessage(null);
    setRemovingId(member.user._id);

    try {
      const response = await projectService.removeMember(project._id, member.user._id);
      setMessage({ kind: "success", text: response.message });
      onChanged();
    } catch (requestError) {
      setMessage({ kind: "error", text: requestError.message });
    } finally {
      setRemovingId(null);
    }
  }

  async function handleAdd(event) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const response = await projectService.addMember(project._id, { email, role });
      setMessage({ kind: "success", text: response.message });
      setEmail("");
      onChanged();
    } catch (requestError) {
      setMessage({ kind: "error", text: requestError.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      {isSupervisor && (
        <form className="card" onSubmit={handleAdd}>
          <div className="card-header">
            <div>
              <h2>{t("team.add")}</h2>
              <p>{t("team.add.desc")}</p>
            </div>
          </div>
          <div className="card-body">
            {message && <Alert kind={message.kind}>{message.text}</Alert>}
            <div className="form-grid">
              <label className="field">
                {t("team.email")}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("team.emailPlaceholder")} required disabled={saving} />
              </label>
              <label className="field">
                {t("team.role")}
                <select value={role} onChange={(e) => setRole(e.target.value)} disabled={saving}>
                  <option value="subcontractor">{t("role.subcontractor")}</option>
                  <option value="site_engineer">{t("role.site_engineer")}</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t("team.adding") : t("team.addButton")}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="card">
        <div className="card-header">
          <h2>{t("team.title", { count: project.members.length })}</h2>
        </div>
        {!isSupervisor && message && <Alert kind={message.kind}>{message.text}</Alert>}
        {project.members.map((member) => (
          <div className="list-item" key={member.user._id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="user-avatar">{initials(member.user.name)}</span>
              <div>
                <span className="cell-title">{member.user.name}</span>
                <span className="cell-sub">{member.user.email}</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <span className="cell-title">{roleLabel(member.role)}</span>
                <span className="cell-sub">{t("team.added", { date: formatDate(member.addedAt) })}</span>
              </div>
              {isSupervisor && member.role !== "project_supervisor" && (
                <button
                  className="btn btn-secondary btn-sm btn-danger-outline"
                  type="button"
                  onClick={() => handleRemove(member)}
                  disabled={removingId === member.user._id}
                  aria-label={t("team.removeLabel", { name: member.user.name })}
                >
                  {removingId === member.user._id ? t("team.removing") : t("team.remove")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamPanel;
