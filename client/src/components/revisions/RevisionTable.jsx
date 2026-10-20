import { Link } from "react-router-dom";
import Badge, { RecipientStatus, RevisionStatus } from "../ui/Badge.jsx";
import RevChip from "../ui/RevChip.jsx";
import { dueLabel, formatDate, isOverdue } from "../../utils/format.js";

/**
 * What a team member sees instead of the team's progress: only their own
 * standing on this revision. (Only the supervisor sees who else has or has
 * not acknowledged.)
 */
function MyStatus({ revision }) {
  const { myStatus } = revision;

  if (myStatus === "not_issued") {
    return <Badge tone="neutral">Not issued to you</Badge>;
  }

  const waiting = myStatus !== "acknowledged" && revision.status === "published";

  return (
    <>
      <RecipientStatus status={myStatus} />
      {waiting && revision.ackDueAt && (
        <span className={`cell-sub due-text ${isOverdue(revision.ackDueAt) ? "late" : ""}`}>
          {dueLabel(revision.ackDueAt)}
        </span>
      )}
    </>
  );
}

function AckProgress({ summary, status }) {
  if (status === "draft") return <span className="cell-sub">Not issued yet</span>;
  if (!summary.total) return <span className="cell-sub">—</span>;

  const percent = Math.round((summary.acknowledged / summary.total) * 100);

  return (
    <div className="progress" title={`${summary.opened} opened, ${summary.acknowledged} acknowledged of ${summary.total}`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <span>{summary.acknowledged}/{summary.total}</span>
    </div>
  );
}

function RevisionTable({ revisions }) {
  // Members get a personal status column; the supervisor gets team progress.
  const personal = revisions.some((revision) => revision.myStatus);

  return (
    <div className="table-wrap">
      <table className="table table-cards">
        <thead>
          <tr>
            <th>Drawing</th>
            <th>Rev</th>
            <th>Status</th>
            <th>Issued</th>
            <th>{personal ? "Your status" : "Acknowledged"}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {revisions.map((revision) => (
            <tr key={revision._id} className={revision.status === "superseded" ? "dim" : ""}>
              <td data-label="Drawing">
                <span className="cell-title mono">{revision.drawing?.drawingNumber}</span>
                <span className="cell-sub">{revision.drawing?.title}</span>
              </td>
              <td data-label="Rev"><RevChip revision={revision.revisionNumber} superseded={revision.status === "superseded"} /></td>
              <td data-label="Status"><RevisionStatus status={revision.status} /></td>
              <td data-label="Issued">{formatDate(revision.issueDate)}</td>
              <td data-label={personal ? "Your status" : "Acknowledged"}>
                {personal ? <MyStatus revision={revision} /> : <AckProgress summary={revision.ackSummary} status={revision.status} />}
              </td>
              <td data-label="" style={{ textAlign: "right" }}>
                <Link to={`/revisions/${revision._id}`}>
                  {revision.status === "draft" ? "Review & publish" : "Open"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default RevisionTable;
