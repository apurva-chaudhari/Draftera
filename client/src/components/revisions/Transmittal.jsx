import { useI18n } from "../../i18n/I18nProvider.jsx";
import { dueLabel, formatDate, formatDateTime, isOverdue, roleLabel } from "../../utils/format.js";

function stateKey(ack) {
  if (ack.status === "acknowledged") return "recipient.acknowledged";
  return ack.viewedAt ? "recipient.opened" : "recipient.pending";
}

/**
 * The printable issue record (a "transmittal"): who a revision was issued to,
 * when they opened it and when they confirmed. Hidden on screen; the print
 * stylesheet shows only this sheet. Site offices keep these on file as proof
 * of who was told what.
 */
function Transmittal({ revision, project, drawing, acknowledgments, history }) {
  const { t } = useI18n();
  const replaced = history
    .filter((item) => item.status === "superseded" && item._id !== revision._id)
    .map((item) => item.revisionNumber);

  const overdueCount = acknowledgments.filter(
    (ack) => ack.status !== "acknowledged" && revision.status === "published" && isOverdue(revision.ackDueAt)
  ).length;

  return (
    <section className="transmittal-sheet" aria-hidden="true">
      <header className="tr-head">
        <div>
          <span className="tr-kicker">{t("tr.kicker")}</span>
          <h1 className="mono">{drawing.drawingNumber} {t("common.rev")} {revision.revisionNumber}</h1>
          <p>{drawing.title}</p>
        </div>
        <div className="tr-project">
          <strong>{project.code}</strong>
          <span>{project.name}</span>
        </div>
      </header>

      <dl className="tr-grid">
        <div><dt>{t("tb.issueDate")}</dt><dd>{formatDate(revision.issueDate)}</dd></div>
        <div><dt>{t("tb.issuedBy")}</dt><dd>{revision.publishedByName || "—"}</dd></div>
        <div><dt>{t("tr.published")}</dt><dd>{formatDateTime(revision.publishedAt)}</dd></div>
        <div><dt>{t("tb.ackBy")}</dt><dd>{revision.status === "published" ? dueLabel(revision.ackDueAt) : "—"}</dd></div>
        <div><dt>{t("tb.status")}</dt><dd>{revision.status === "superseded" ? t("revision.superseded") : t("revision.current")}</dd></div>
        <div><dt>{t("tr.replaces")}</dt><dd>{replaced.length ? `${t("common.rev")} ${replaced.join(", ")}` : "—"}</dd></div>
      </dl>

      <h2>{t("revision.whatChanged")}</h2>
      <p className="tr-summary">{revision.changeSummary}</p>

      <h2>{t("tr.distribution", { count: acknowledgments.length })}</h2>
      <table className="tr-table">
        <thead>
          <tr>
            <th>{t("col.name")}</th>
            <th>{t("col.role")}</th>
            <th>{t("col.opened")}</th>
            <th>{t("col.acknowledged")}</th>
            <th>{t("col.status")}</th>
          </tr>
        </thead>
        <tbody>
          {acknowledgments.map((ack) => (
            <tr key={ack._id}>
              <td>{ack.recipient?.name}</td>
              <td>{roleLabel(ack.recipientRole)}</td>
              <td>{formatDateTime(ack.viewedAt)}</td>
              <td>{formatDateTime(ack.acknowledgedAt)}</td>
              <td>{t(stateKey(ack))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {overdueCount > 0 && (
        <p className="tr-warning">{t("tr.overdueWarning", { count: overdueCount })}</p>
      )}

      <footer className="tr-foot">
        {t("tr.footer", { date: formatDateTime(new Date()) })}
      </footer>
    </section>
  );
}

export default Transmittal;
