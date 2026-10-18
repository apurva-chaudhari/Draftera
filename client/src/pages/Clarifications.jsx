import { useState } from "react";
import { Link } from "react-router-dom";
import useResource from "../hooks/useResource.js";
import workflowService from "../services/workflowService.js";
import { ClarificationStatus } from "../components/ui/Badge.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import RevChip from "../components/ui/RevChip.jsx";
import { formatDateTime } from "../utils/format.js";

function Clarifications() {
  const { data: items, error, reload } = useResource("my-clarifications", async () =>
    (await workflowService.listMyClarifications()).clarifications
  );
  const [status, setStatus] = useState("all");

  if (error) return <Alert kind="error" onRetry={reload}>{error}</Alert>;
  if (!items) return <Loading />;

  const visible = items.filter((c) => status === "all" || c.status === status);

  return (
    <>
      <PageHeader
        title="Clarifications"
        description="Questions about drawing revisions. Supervisors see every question in their projects; everyone else sees the ones they asked."
      />

      <div className="toolbar">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="answered">Answered</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="card">
        {visible.length === 0 ? (
          <EmptyState title="No clarifications">Questions raised on a revision will appear here.</EmptyState>
        ) : (
          visible.map((item) => (
            <Link className="list-item" to={`/revisions/${item.revision._id}`} key={item._id}>
              <div style={{ minWidth: 0 }}>
                <span className="cell-title">{item.question}</span>
                <span className="cell-sub">
                  {item.revision.drawing?.drawingNumber} · {item.project?.code} · {item.requestedBy?.name} · {formatDateTime(item.createdAt)}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <RevChip revision={item.revision.revisionNumber} superseded={item.revision.status === "superseded"} />
                <ClarificationStatus status={item.status} />
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}

export default Clarifications;
