import { Link } from "react-router-dom";
import useResource from "../hooks/useResource.js";
import workflowService from "../services/workflowService.js";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import RevChip from "../components/ui/RevChip.jsx";
import { RecipientStatus } from "../components/ui/Badge.jsx";
import { dueLabel, formatDateTime, isOverdue } from "../utils/format.js";

function Row({ ack }) {
  const state =
    ack.status === "acknowledged" ? "acknowledged" : ack.viewedAt ? "opened" : "pending";

  return (
    <Link className="list-item" to={`/revisions/${ack.revision._id}`}>
      <div>
        <span className="cell-title">
          <span className="mono">{ack.revision.drawing?.drawingNumber}</span> · {ack.revision.drawing?.title}
        </span>
        <span className="cell-sub">
          {ack.project?.code} · {ack.status === "acknowledged"
            ? `acknowledged ${formatDateTime(ack.acknowledgedAt)}`
            : `issued ${formatDateTime(ack.revision.publishedAt)}`}
          {ack.status === "pending" && ack.revision.status === "published" && ack.revision.ackDueAt && (
            <span className={`due-text ${isOverdue(ack.revision.ackDueAt) ? "late" : ""}`}> · {dueLabel(ack.revision.ackDueAt)}</span>
          )}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <RevChip revision={ack.revision.revisionNumber} superseded={ack.revision.status === "superseded"} />
        <RecipientStatus status={state} />
      </div>
    </Link>
  );
}

function Section({ title, description, items, empty }) {
  return (
    <section className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <div>
          <h2>{title} ({items.length})</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {items.length === 0 ? <EmptyState title={empty} /> : items.map((ack) => <Row key={ack._id} ack={ack} />)}
    </section>
  );
}

function MyTasks() {
  const { data: items, error, reload } = useResource("my-tasks", async () =>
    (await workflowService.listMyAcknowledgments()).acknowledgments
  );

  if (error) return <Alert kind="error" onRetry={reload}>{error}</Alert>;
  if (!items) return <Loading />;

  // Pending records on superseded revisions need no action: the newer
  // revision has its own record, so they are shown separately.
  const todo = items.filter((a) => a.status === "pending" && a.revision?.status === "published");
  const done = items.filter((a) => a.status === "acknowledged");
  const moot = items.filter((a) => a.status === "pending" && a.revision?.status === "superseded");

  return (
    <>
      <PageHeader title="My tasks" description="Revisions issued to you and what you have confirmed." />
      <Section title="To acknowledge" description="Open the drawing, then confirm you have received it." items={todo} empty="Nothing waiting for you." />
      <Section title="Acknowledged" items={done} empty="You haven't acknowledged any revisions yet." />
      {moot.length > 0 && (
        <Section title="Superseded before you acknowledged" description="A newer revision replaced these. Use the newer one." items={moot} empty="" />
      )}
    </>
  );
}

export default MyTasks;
