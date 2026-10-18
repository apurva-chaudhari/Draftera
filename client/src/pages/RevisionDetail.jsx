import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import useResource from "../hooks/useResource.js";
import drawingService from "../services/drawingService.js";
import projectService from "../services/projectService.js";
import ActivityTimeline from "../components/activity/ActivityTimeline.jsx";
import AcknowledgePanel from "../components/revisions/AcknowledgePanel.jsx";
import ClarificationPanel from "../components/revisions/ClarificationPanel.jsx";
import PublishPanel from "../components/revisions/PublishPanel.jsx";
import RecipientStatusTable from "../components/revisions/RecipientStatusTable.jsx";
import { RevisionStatus } from "../components/ui/Badge.jsx";
import { Alert, Loading } from "../components/ui/Feedback.jsx";
import RevChip from "../components/ui/RevChip.jsx";
import { formatDate, formatDateTime } from "../utils/format.js";

function RevisionDetail() {
  const { revisionId } = useParams();
  const { user } = useAuth();

  const [fileError, setFileError] = useState("");
  const [opening, setOpening] = useState(false);

  const { data, error, reload: load } = useResource(revisionId, async () => {
    const response = await drawingService.getRevision(revisionId);

    // Members are needed only to choose recipients for a draft.
    let members = [];
    if (response.access.isSupervisor && response.revision.status === "draft") {
      const projectResponse = await projectService.get(response.project._id);
      members = projectResponse.project.members.filter(
        (m) => m.role !== "project_supervisor"
      );
    }

    return { ...response, members };
  });

  /**
   * Opens the PDF through a short-lived signed link. The blank tab is opened
   * synchronously inside the click so popup blockers allow it; the URL is
   * filled in once the server has responded and recorded the view.
   */
  async function handleOpenDrawing() {
    setFileError("");
    setOpening(true);
    const tab = window.open("", "_blank");

    try {
      const response = await drawingService.openRevisionFile(revisionId);
      if (tab) {
        tab.opener = null;
        tab.location.href = response.url;
      } else {
        window.location.href = response.url;
      }
      load();
    } catch (requestError) {
      if (tab) tab.close();
      setFileError(requestError.message);
    } finally {
      setOpening(false);
    }
  }

  if (error) return <Alert kind="error" onRetry={load}>{error}</Alert>;
  if (!data) return <Loading label="Loading revision…" />;

  const { revision, project, access, myAcknowledgment, acknowledgments, clarifications, activity, supersededBy, members } = data;
  const drawing = revision.drawing;
  const isSuperseded = revision.status === "superseded";

  return (
    <>
      <div className="breadcrumb">
        <Link to="/projects">Projects</Link> /{" "}
        <Link to={`/projects/${project._id}`}>{project.code}</Link> /{" "}
        <span>{drawing.drawingNumber}</span>
      </div>

      <header className="page-header">
        <div>
          <h1>{drawing.drawingNumber} · {drawing.title}</h1>
          <div className="meta-row">
            <RevChip revision={revision.revisionNumber} superseded={isSuperseded} />
            <RevisionStatus status={revision.status} />
            <span>Issued {formatDate(revision.issueDate)}</span>
            {revision.publishedAt && (
              <span>Published {formatDateTime(revision.publishedAt)} by {revision.publishedByName}</span>
            )}
          </div>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={handleOpenDrawing} disabled={opening}>
            {opening ? "Opening…" : "View drawing (PDF)"}
          </button>
        </div>
      </header>

      {fileError && <Alert kind="error">{fileError}</Alert>}

      {isSuperseded && (
        <Alert kind="warning">
          <span>
            <strong>Superseded. Do not build from this revision.</strong>{" "}
            {supersededBy && (
              <>The current revision is <Link to={`/revisions/${supersededBy._id}`}>Rev {supersededBy.revisionNumber}</Link>.</>
            )}
          </span>
        </Alert>
      )}

      {revision.status === "draft" && (
        <Alert kind="info">This revision is a draft. Only you can see it until you publish it.</Alert>
      )}

      <div className="stack">
        <section className="card">
          <div className="card-header">
            <h2>What changed</h2>
          </div>
          <div className="card-body" style={{ whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: 14.5 }}>
            {revision.changeSummary}
          </div>
        </section>

        {revision.status === "draft" && access.isSupervisor && (
          <PublishPanel revisionId={revision._id} members={members} currentUserId={user.id} onPublished={load} />
        )}

        {myAcknowledgment && (
          <AcknowledgePanel
            revision={revision}
            acknowledgment={myAcknowledgment}
            supersededBy={supersededBy}
            onOpen={handleOpenDrawing}
            onAcknowledged={load}
          />
        )}

        {access.isSupervisor && revision.status !== "draft" && (
          <RecipientStatusTable revision={revision} acknowledgments={acknowledgments} onChanged={load} />
        )}

        {revision.status !== "draft" && (
          <ClarificationPanel
            revision={revision}
            clarifications={clarifications}
            isSupervisor={access.isSupervisor}
            currentUserId={user.id}
            onChanged={load}
          />
        )}

        <section className="card">
          <div className="card-header">
            <h2>History of this revision</h2>
          </div>
          <ActivityTimeline items={activity} />
        </section>
      </div>
    </>
  );
}

export default RevisionDetail;
