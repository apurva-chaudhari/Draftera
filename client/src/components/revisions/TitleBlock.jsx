import { RevisionStatus } from "../ui/Badge.jsx";
import { dueLabel, formatDate, isOverdue } from "../../utils/format.js";

/**
 * Header styled like the title block in the corner of a drawing sheet:
 * the facts a site team looks for first (drawing number, revision, status,
 * dates) in a fixed, scannable grid.
 */
function Cell({ label, children, big = false }) {
  return (
    <div>
      <span className="tb-label">{label}</span>
      <span className={`tb-value ${big ? "big" : ""}`}>{children}</span>
    </div>
  );
}

function TitleBlock({ revision, project, drawing }) {
  const superseded = revision.status === "superseded";

  return (
    <div className={`title-block ${superseded ? "superseded" : ""}`}>
      <Cell label="Drawing title">{drawing.title}</Cell>
      <Cell label="Drawing no." big>{drawing.drawingNumber}</Cell>
      <Cell label="Revision" big>{revision.revisionNumber}</Cell>
      <Cell label="Status"><RevisionStatus status={revision.status} /></Cell>

      <Cell label="Project">{project.code}</Cell>
      <Cell label="Issue date">{formatDate(revision.issueDate)}</Cell>
      <Cell label="Issued by">{revision.publishedByName || "Not yet published"}</Cell>
      <Cell label="Acknowledge by">
        {revision.status === "published" ? (
          <span className={isOverdue(revision.ackDueAt) ? "due-text late" : ""}>
            {dueLabel(revision.ackDueAt)}
          </span>
        ) : (
          "—"
        )}
      </Cell>
    </div>
  );
}

export default TitleBlock;
