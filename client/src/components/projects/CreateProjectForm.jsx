import { useState } from "react";
import projectService from "../../services/projectService.js";
import { Alert } from "../ui/Feedback.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]*$/;

function CreateProjectForm({ onCreated, onCancel }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
    };

    if (payload.name.length < 2 || payload.name.length > 150) {
      return setError(t("createProject.err.name"));
    }

    if (
      payload.code.length < 2 ||
      payload.code.length > 30 ||
      !CODE_PATTERN.test(payload.code)
    ) {
      return setError(t("createProject.err.code"));
    }

    setSaving(true);

    try {
      const response = await projectService.create(payload);
      onCreated(response.project);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
      <div className="card-header">
        <div>
          <h2>{t("projects.new")}</h2>
          <p>{t("createProject.desc")}</p>
        </div>
      </div>

      <div className="card-body">
        {error && <Alert kind="error">{error}</Alert>}

        <div className="form-grid">
          <label className="field">
            {t("project.name")}
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("createProject.namePlaceholder")} maxLength={150} required disabled={saving} />
          </label>

          <label className="field">
            {t("project.code")}
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="RCT-001" maxLength={30} required disabled={saving} />
            <small>{t("createProject.codeHint")}</small>
          </label>

          <label className="field full">
            {t("createProject.descriptionOptional")}
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} disabled={saving} />
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t("createProject.creating") : t("createProject.create")}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </form>
  );
}

export default CreateProjectForm;
