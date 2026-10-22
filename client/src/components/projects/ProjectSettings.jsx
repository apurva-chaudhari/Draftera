import { useState } from "react";
import projectService from "../../services/projectService.js";
import { projectStatusOptions } from "../../utils/format.js";
import { Alert } from "../ui/Feedback.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";

// Closing a project is easy to do by accident and awkward to notice, so it
// asks first. Everything else is reversible in one click.
const NEEDS_CONFIRMATION = ["completed", "archived"];

/**
 * Supervisor-only settings: the project's status (what the team can do right
 * now) and its name and description. The code is fixed: it is printed on
 * every drawing record and report.
 */
function ProjectSettings({ project, onChanged }) {
  const { t } = useI18n();
  const statusOptions = projectStatusOptions();
  const [status, setStatus] = useState(project.status);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [detailsMessage, setDetailsMessage] = useState(null);

  const statusChanged = status !== project.status;
  const detailsChanged = name.trim() !== project.name || description.trim() !== (project.description || "");

  async function saveStatus() {
    const target = statusOptions.find((option) => option.value === status);

    if (
      NEEDS_CONFIRMATION.includes(status) &&
      !window.confirm(t("settings.confirmStatus", { status: target.label, effect: target.effect }))
    ) {
      return;
    }

    setStatusMessage(null);
    setSavingStatus(true);

    try {
      const response = await projectService.update(project._id, { status });
      setStatusMessage({ kind: "success", text: response.message });
      onChanged();
    } catch (requestError) {
      setStatusMessage({ kind: "error", text: requestError.message });
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveDetails(event) {
    event.preventDefault();
    setDetailsMessage(null);
    setSavingDetails(true);

    try {
      const response = await projectService.update(project._id, { name, description });
      setDetailsMessage({ kind: "success", text: response.message });
      onChanged();
    } catch (requestError) {
      setDetailsMessage({ kind: "error", text: requestError.message });
    } finally {
      setSavingDetails(false);
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card-header">
          <div>
            <h2>{t("settings.status")}</h2>
            <p>{t("settings.status.desc")}</p>
          </div>
        </div>
        <div className="card-body">
          {statusMessage && <Alert kind={statusMessage.kind}>{statusMessage.text}</Alert>}

          <div className="status-options" role="radiogroup" aria-label={t("settings.status")}>
            {statusOptions.map((option) => (
              <label
                key={option.value}
                className={`status-option tone-${option.value} ${status === option.value ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="project-status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={() => setStatus(option.value)}
                  disabled={savingStatus}
                />
                <span className="status-option-body">
                  <strong>
                    {option.label}
                    {option.value === project.status && <em> · {t("settings.current")}</em>}
                  </strong>
                  <span>{option.effect}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="button" onClick={saveStatus} disabled={!statusChanged || savingStatus}>
              {savingStatus ? t("common.saving") : t("project.changeStatus")}
            </button>
          </div>
        </div>
      </section>

      <form className="card" onSubmit={saveDetails}>
        <div className="card-header">
          <div>
            <h2>{t("settings.details")}</h2>
            <p>{t("settings.codeFixed", { code: project.code })}</p>
          </div>
        </div>
        <div className="card-body">
          {detailsMessage && <Alert kind={detailsMessage.kind}>{detailsMessage.text}</Alert>}
          <div className="form-grid">
            <label className="field full">
              {t("project.name")}
              <input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={150} required disabled={savingDetails} />
            </label>
            <label className="field full">
              {t("settings.description")}
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} disabled={savingDetails} />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={!detailsChanged || savingDetails}>
              {savingDetails ? t("common.saving") : t("settings.saveDetails")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default ProjectSettings;
