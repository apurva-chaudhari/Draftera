import { dueLabel, formatDate, formatDateTime, isOverdue, roleLabel } from "../../utils/format.js";

function stateOf(ack) {
  if (ack.status === "acknowledged") return "Acknowledged";
  return ack.viewedAt ? "Opened, not acknowledged" : "Not opened";
}

/**
 * The printable issue record (a "transmittal"): who a revision was issued to,
 * when they opened it and when they confirmed. Hidden on screen; the print
 * stylesheet shows only this sheet. Site offices keep these on file as proof
 * of who was told what.
 */
function Transmittal({ revision, project, drawing, acknowledgments, history }) {
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
          <span className="tr-kicker">Drawing issue record</span>
          <h1 className="mono">{drawing.drawingNumber} Rev {revision.revisionNumber}</h1>
          <p>{drawing.title}</p>
        </div>
        <div className="tr-project">
          <strong>{project.code}</strong>
          <span>{project.name}</span>
        </div>
      </header>

      <dl className="tr-grid">
        <div><dt>Issue date</dt><dd>{formatDate(revision.issueDate)}</dd></div>
        <div><dt>Issued by</dt><dd>{revision.publishedByName || "—"}</dd></div>
        <div><dt>Published</dt><dd>{formatDateTime(revision.publishedAt)}</dd></div>
        <div><dt>Acknowledge by</dt><dd>{revision.status === "published" ? dueLabel(revision.ackDueAt) : "—"}</dd></div>
        <div><dt>Status</dt><dd>{revision.status === "superseded" ? "Superseded" : "Current"}</dd></div>
        <div><dt>Replaces</dt><dd>{replaced.length ? `Rev ${replaced.join(", ")}` : "—"}</dd></div>
      </dl>

      <h2>What changed</h2>
      <p className="tr-summary">{revision.changeSummary}</p>

      <h2>Distribution ({acknowledgments.length})</h2>
      <table className="tr-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Opened</th>
            <th>Acknowledged</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {acknowledgments.map((ack) => (
            <tr key={ack._id}>
              <td>{ack.recipient?.name}</td>
              <td>{roleLabel(ack.recipientRole)}</td>
              <td>{formatDateTime(ack.viewedAt)}</td>
              <td>{formatDateTime(ack.acknowledgedAt)}</td>
              <td>{stateOf(ack)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {overdueCount > 0 && (
        <p className="tr-warning">{overdueCount} {overdueCount === 1 ? "person has" : "people have"} not acknowledged by the deadline.</p>
      )}

      <footer className="tr-foot">
        Printed {formatDateTime(new Date())} from Draftera. This record reflects what the system knew at that moment.
      </footer>
    </section>
  );
}

export default Transmittal;
