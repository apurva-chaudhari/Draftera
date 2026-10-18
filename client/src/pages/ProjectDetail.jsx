import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import useResource from "../hooks/useResource.js";
import projectService from "../services/projectService.js";
import drawingService from "../services/drawingService.js";
import ActivityTimeline from "../components/activity/ActivityTimeline.jsx";
import CurrencyMatrix from "../components/currency/CurrencyMatrix.jsx";
import TeamPanel from "../components/projects/TeamPanel.jsx";
import RevisionTable from "../components/revisions/RevisionTable.jsx";
import UploadRevisionForm from "../components/revisions/UploadRevisionForm.jsx";
import { ProjectStatus } from "../components/ui/Badge.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";

function ProjectDetail() {
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
  if (!data) return <Loading label="Loading project…" />;

  const { project, access, activity, currency } = data;

  const tabs = [
    { id: "drawings", label: `Drawings (${revisions.length})` },
    ...(access.isSupervisor ? [{ id: "currency", label: "Revision currency" }] : []),
    { id: "team", label: `Team (${project.members.length})` },
    { id: "activity", label: "Activity" },
  ];

  return (
    <>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link> / <span>{project.code}</span>
      </div>

      <PageHeader
        title={project.name}
        description={project.description}
        actions={
          <>
            <ProjectStatus status={project.status} />
            {access.isSupervisor && (
              <button type="button" className="btn btn-secondary" onClick={handleDownloadReport} disabled={downloading}>
                {downloading ? "Preparing…" : "Download report (CSV)"}
              </button>
            )}
            {access.isSupervisor && project.status === "active" && (
              <button type="button" className="btn btn-primary" onClick={() => setShowUpload((v) => !v)}>
                {showUpload ? "Close" : "Upload revision"}
              </button>
            )}
          </>
        }
      />

      {downloadError && <Alert kind="error">{downloadError}</Alert>}

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

      <div className="tabs" role="tablist">
        {tabs.map((item) => (
          <button key={item.id} role="tab" aria-selected={tab === item.id} className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setSearchParams({ tab: item.id })}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "drawings" && (
        <div className="card">
          {revisions.length === 0 ? (
            <EmptyState title="No drawings yet">
              {access.isSupervisor
                ? "Upload the first drawing revision to get started."
                : "Drawings appear here once the supervisor publishes them to you."}
            </EmptyState>
          ) : (
            <>
              <div className="card-header">
                <input className="input" style={{ maxWidth: 320 }} type="search" placeholder="Search drawings…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search drawings" />
              </div>
              <RevisionTable revisions={filteredRevisions} />
            </>
          )}
        </div>
      )}

      {tab === "currency" && access.isSupervisor && currency && (
        <CurrencyMatrix data={currency} onChanged={load} />
      )}

      {tab === "team" && (
        <TeamPanel project={project} isSupervisor={access.isSupervisor} onChanged={load} />
      )}

      {tab === "activity" && (
        <div className="card">
          <ActivityTimeline items={activity} />
        </div>
      )}
    </>
  );
}

export default ProjectDetail;
