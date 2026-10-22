import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import useResource from "../hooks/useResource.js";
import projectService from "../services/projectService.js";
import CreateProjectForm from "../components/projects/CreateProjectForm.jsx";
import { ProjectStatus } from "../components/ui/Badge.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { isOpenProject, roleLabel } from "../utils/format.js";

function Projects() {
  const { t } = useI18n();
  const { user } = useAuth();
  // Subcontractors are invited onto projects; they do not start them.
  const canCreate = user.role !== "subcontractor";
  const { data, error, loading, reload } = useResource("projects", async () =>
    (await projectService.list()).projects
  );
  const projects = useMemo(() => data || [], [data]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  // Finished and archived projects stay out of the way until asked for.
  const [status, setStatus] = useState("open");

  const visible = useMemo(() => {
    const text = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesText =
        !text ||
        project.name.toLowerCase().includes(text) ||
        project.code.toLowerCase().includes(text);
      const matchesStatus =
        status === "all" ||
        (status === "open" ? isOpenProject(project.status) : project.status === status);
      return matchesText && matchesStatus;
    });
  }, [projects, search, status]);

  return (
    <>
      <PageHeader
        title={t("nav.projects")}
        description={t("projects.desc")}
        actions={
          canCreate && !showForm && (
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              {t("projects.new")}
            </button>
          )
        }
      />

      {showForm && (
        <CreateProjectForm
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}

      {error && <Alert kind="error" onRetry={reload}>{error}</Alert>}

      <div className="toolbar">
        <input className="input" type="search" placeholder={t("projects.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("projects.searchLabel")} />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("common.filterStatus")}>
          <option value="open">{t("projects.filter.open")}</option>
          <option value="all">{t("common.allStatuses")}</option>
          <option value="active">{t("projectStatus.active")}</option>
          <option value="on_hold">{t("projectStatus.on_hold")}</option>
          <option value="completed">{t("projectStatus.completed")}</option>
          <option value="archived">{t("projectStatus.archived")}</option>
        </select>
      </div>

      {loading ? (
        <Loading label={t("projects.loading")} />
      ) : visible.length === 0 ? (
        <div className="card">
          <EmptyState title={projects.length === 0 ? t("projects.empty.none") : t("projects.empty.noMatch")}>
            {projects.length === 0
              ? canCreate
                ? t("projects.empty.create")
                : t("projects.empty.wait")
              : status === "open"
                ? t("projects.empty.hidden")
                : t("projects.empty.tryOther")}
          </EmptyState>
        </div>
      ) : (
        <div className="projects-grid">
          {visible.map((project) => (
            <Link className={`card project-card status-${project.status}`} to={`/projects/${project._id}`} key={project._id}>
              <div className="project-card-top">
                <span className="code-tag">{project.code}</span>
                <ProjectStatus status={project.status} />
              </div>
              <h3>{project.name}</h3>
              <p>{project.description || t("projects.noDescription")}</p>
              <div className="project-card-foot">
                <span>{t("projects.members", { count: project.memberCount })}</span>
                <strong>{roleLabel(project.myRole)}</strong>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export default Projects;
