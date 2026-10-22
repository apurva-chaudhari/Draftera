import { RevisionStatus } from "../ui/Badge.jsx";
import { useI18n } from "../../i18n/I18nProvider.jsx";
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
  const { t } = useI18n();
  const superseded = revision.status === "superseded";

  return (
    <div className={`title-block ${superseded ? "superseded" : ""}`}>
      <Cell label={t("tb.title")}>{drawing.title}</Cell>
      <Cell label={t("tb.number")} big>{drawing.drawingNumber}</Cell>
      <Cell label={t("tb.revision")} big>{revision.revisionNumber}</Cell>
      <Cell label={t("tb.status")}><RevisionStatus status={revision.status} /></Cell>

      <Cell label={t("tb.project")}>{project.code}</Cell>
      <Cell label={t("tb.issueDate")}>{formatDate(revision.issueDate)}</Cell>
      <Cell label={t("tb.issuedBy")}>{revision.publishedByName || t("tb.notPublished")}</Cell>
      <Cell label={t("tb.ackBy")}>
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
