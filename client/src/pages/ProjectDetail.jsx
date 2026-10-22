import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import useResource from "../hooks/useResource.js";
import projectService from "../services/projectService.js";
import drawingService from "../services/drawingService.js";
import ActivityTimeline from "../components/activity/ActivityTimeline.jsx";
import CurrencyMatrix from "../components/currency/CurrencyMatrix.jsx";
import ProjectSettings from "../components/projects/ProjectSettings.jsx";
import TeamPanel from "../components/projects/TeamPanel.jsx";
import RevisionTable from "../components/revisions/RevisionTable.jsx";
import UploadRevisionForm from "../components/revisions/UploadRevisionForm.jsx";
import { ProjectStatus } from "../components/ui/Badge.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { statusNotice } from "../utils/format.js";

function ProjectDetail() {
  const { t } = useI18n();
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const tab = searchParams.get("tab") || "drawings";

  async function handleDownloadReport() {
    setDownloadError("");
    setDownloading(true);

    try {
      await projectService.downloadReport(projectId);
    } catch (requestError) {
      setDownloadError(requestError.message);
    } finally {
      setDownloading(false);
    }
  }

  const { data, error, reload: load } = useResource(projectId, async () => {
    const [projectResponse, revisionResponse, activityResponse] = await Promise.all([
      projectService.get(projectId),
      drawingService.listProjectRevisions(projectId),
      projectService.getActivity(projectId),
    ]);
    
    // The currency matrix is a supervisor-only monitoring view.
    const currency = projectResponse.access.isSupervisor
      ? await projectService.getCurrency(projectId)
      : null;

    return {
      project: projectResponse.project,
      access: projectResponse.access,
      revisions: revisionResponse.revisions,
      activity: activityResponse.activity,
      currency,
    };
  });

  const revisions = useMemo(() => data?.revisions || [], [data]);

  const existingDrawings = useMemo(() => {
    const seen = new Map();
    revisions.forEach((r) => r.drawing && seen.set(r.drawing._id, r.drawing));
    return [...seen.values()];
  }, [revisions]);

  const filteredRevisions = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return revisions;
    return revisions.filter(
      (r) =>
        r.drawing?.drawingNumber.toLowerCase().includes(text) ||
        r.drawing?.title.toLowerCase().includes(text)
    );
  }, [revisions, search]);

  if (error) return <Alert kind="error" onRetry={load}>{error}</Alert>;
  if (!data) return <Loading label={t("project.loading")} />;

  const { project, access, activity, currency } = data;

  const tabs = [
    { id: "drawings", label: t("project.tab.drawings", { count: revisions.length }) },
    ...(access.isSupervisor ? [{ id: "currency", label: t("project.tab.currency") }] : []),
    { id: "team", label: t("project.tab.team", { count: project.members.length }) },
    { id: "activity", label: t("project.tab.activity") },
    ...(access.isSupervisor ? [{ id: "settings", label: t("project.tab.settings") }] : []),
  ];

  const notice = statusNotice(project.status);
  // A link to a tab this person cannot see (for example Settings) falls back to Drawings.
  const current = tabs.some((item) => item.id === tab) ? tab : "drawings";

  return (
    <>
      <div className="breadcrumb">
        <Link to="/projects">{t("nav.projects")}</Link> / <span>{project.code}</span>
      </div>

      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <>
            <ProjectStatus status={project.status} />
            {access.isSupervisor && (
              <button type="button" className="btn btn-secondary" onClick={handleDownloadReport} disabled={downloading}>
                {downloading ? t("project.preparing") : t("project.downloadReport")}
              </button>
            )}
            {access.isSupervisor && project.status === "active" && (
              <button type="button" className="btn btn-primary" onClick={() => setShowUpload((v) => !v)}>
                {showUpload ? t("common.close") : t("project.upload")}
              </button>
            )}
          </>
        }
      />

      {downloadError && <Alert kind="error">{downloadError}</Alert>}

      {notice && (
        <Alert kind="warning">
          {notice}{" "}
          {access.isSupervisor && (
            <button type="button" className="btn-link" onClick={() => setSearchParams({ tab: "settings" })}>
              {t("project.changeStatus")}
            </button>
          )}
        </Alert>
      )}

      {showUpload && (
        <UploadRevisionForm
          projectId={project._id}
          existingDrawings={existingDrawings}
          onCancel={() => setShowUpload(false)}
          // A new draft is useless until published, so go straight to the
          // page where the supervisor chooses recipients.
          onUploaded={(revision) => navigate(`/revisions/${revision._id}`)}
        />
      )}

      <div className="tabs" role="tablist" aria-label={t("project.tabsLabel")}>
        {tabs.map((item) => (
          <button key={item.id} role="tab" aria-selected={current === item.id} className={`tab ${current === item.id ? "active" : ""}`} onClick={() => setSearchParams({ tab: item.id })}>
            {item.label}
          </button>
        ))}
      </div>

      {current === "drawings" && (
        <div className="card">
          {revisions.length === 0 ? (
            <EmptyState title={t("project.drawings.empty")}>
              {access.isSupervisor
                ? t("project.drawings.empty.supervisor")
                : t("project.drawings.empty.member")}
            </EmptyState>
          ) : (
            <>
              <div className="card-header">
                <input className="input" style={{ maxWidth: 320 }} type="search" placeholder={t("project.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("project.searchLabel")} />
              </div>
              <RevisionTable revisions={filteredRevisions} />
            </>
          )}
        </div>
      )}

      {current === "currency" && access.isSupervisor && currency && (
        <CurrencyMatrix data={currency} onChanged={load} />
      )}

      {current === "team" && (
        <TeamPanel project={project} isSupervisor={access.isSupervisor} onChanged={load} />
      )}

      {current === "settings" && access.isSupervisor && (
        <ProjectSettings
          key={`${project.status}|${project.name}|${project.description}`}
          project={project}
          onChanged={load}
        />
      )}

      {current === "activity" && (
        <div className="card">
          <ActivityTimeline items={activity} />
        </div>
      )}
    </>
  );
}

export default ProjectDetail;
