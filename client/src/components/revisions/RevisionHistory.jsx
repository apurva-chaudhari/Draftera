import { Link } from "react-router-dom";
import { RevisionStatus } from "../ui/Badge.jsx";
import RevChip from "../ui/RevChip.jsx";
import { formatDate } from "../../utils/format.js";

/**
 * Every revision of one drawing, newest first, each with its change note.
 * Reading top to bottom shows how the drawing evolved and what each
 * revision changed.
 */
function RevisionHistory({ history, currentId }) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Revision history ({history.length})</h2>
          <p>What changed in each revision of this drawing.</p>
        </div>
      </div>

      {history.map((item) => {
        const here = item._id === currentId;
        const body = (
          <>
            <RevChip revision={item.revisionNumber} superseded={item.status === "superseded"} />
            <div>
              <RevisionStatus status={item.status} />
              <p>{item.changeSummary}</p>
            </div>
            <span className="due-text">
              {item.publishedAt ? formatDate(item.publishedAt) : "Draft"}
            </span>
          </>
        );

        return here ? (
          <div className="history-item here" key={item._id} aria-current="page">{body}</div>
        ) : (
          <Link className="history-item" to={`/revisions/${item._id}`} key={item._id}>{body}</Link>
        );
      })}
    </section>
  );
}

export default RevisionHistory;
