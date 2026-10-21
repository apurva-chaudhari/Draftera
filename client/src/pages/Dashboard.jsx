import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import useResource from "../hooks/useResource.js";
import workflowService from "../services/workflowService.js";
import ActivityTimeline from "../components/activity/ActivityTimeline.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import RevChip from "../components/ui/RevChip.jsx";
import { greeting, timeAgo } from "../utils/format.js";

// The overview adapts to the role: a supervisor watches the whole project,
// everyone else sees their own work. Current revisions and revision risks are
// the supervisor's view, so members never see them.
function statsFor(supervises) {
  return [
    { key: "activeProjects", label: "Active projects", detail: "Projects in progress" },
    ...(supervises
      ? [{ key: "currentDrawings", label: "Current revisions", detail: "Published and in force" }]
      : []),
    { key: "pendingAcknowledgments", label: "Waiting on you", detail: "Revisions to acknowledge" },
    {
      key: "openClarifications",
      label: "Open questions",
      detail: supervises ? "Waiting for an answer" : "Yours, not yet answered",
    },
  ];
}

function Dashboard() {
  const { user } = useAuth();
  const { data, error, reload } = useResource("dashboard", () =>
    workflowService.getDashboard()
  );

  const firstName = user.name.split(" ")[0];

  if (error) return <Alert kind="error" onRetry={reload}>{error}</Alert>;
  if (!data) return <Loading label="Loading your overview…" />;

  const { summary, pendingItems, atRisk, recentActivity } = data;
  const supervises = summary.supervisedProjects > 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          supervises
            ? "Who is working from which revision, and what needs your attention."
            : "The drawings issued to you and what you still need to confirm."
        }
      />

      <div className="grid-4">
        {statsFor(supervises).map((stat) => (
          <div className="card stat-card" key={stat.key}>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{summary[stat.key]}</div>
            <div className="stat-detail">{stat.detail}</div>
          </div>
        ))}
        {summary.overdueAcknowledgments > 0 && (
          <div className="card stat-card attention">
            <div className="stat-label">Your overdue acknowledgments</div>
            <div className="stat-value">{summary.overdueAcknowledgments}</div>
            <div className="stat-detail">Deadline has passed</div>
          </div>
        )}
        {supervises && summary.overduePeople > 0 && (
          <div className="card stat-card attention">
            <div className="stat-label">Team members overdue</div>
            <div className="stat-value">{summary.overduePeople}</div>
            <div className="stat-detail">Past the acknowledgment deadline</div>
          </div>
        )}
        {supervises && summary.atRiskRecipients > 0 && (
          <div className="card stat-card attention">
            <div className="stat-label">People possibly on an old revision</div>
            <div className="stat-value">{summary.atRiskRecipients}</div>
            <div className="stat-detail">Acknowledged an earlier revision only</div>
          </div>
        )}
      </div>

      <div className={supervises ? "grid-2" : "stack"}>
        <section className="card">
          <div className="card-header">
            <h2>Waiting on you</h2>
            <Link to="/tasks" style={{ fontSize: 13 }}>View all</Link>
          </div>
          {pendingItems.length === 0 ? (
            <EmptyState title="You're up to date">No revisions are waiting for your acknowledgment.</EmptyState>
          ) : (
            pendingItems.map((item) => (
              <Link className="list-item" to={`/revisions/${item.revision._id}`} key={item._id}>
                <div>
                  <span className="cell-title"><span className="mono">{item.revision.drawing?.drawingNumber}</span> · {item.revision.drawing?.title}</span>
                  <span className="cell-sub">{item.project?.code} · issued {timeAgo(item.revision.publishedAt)}</span>
                </div>
                <RevChip revision={item.revision.revisionNumber} />
              </Link>
            ))
          )}
        </section>

        {supervises && (
        <section className="card">
          <div className="card-header">
            <div>
              <h2>Revision risks</h2>
              <p>People who confirmed an older revision but not the latest.</p>
            </div>
          </div>
          {atRisk.length === 0 ? (
            <EmptyState title="No known risks">
              Everyone you supervise is current, or you have no published revisions yet.
            </EmptyState>
          ) : (
            atRisk.map((risk, index) => (
              <Link className="list-item" to={`/projects/${risk.projectId}?tab=currency`} key={`${risk.drawingNumber}-${risk.person._id}-${index}`}>
                <div>
                  <span className="cell-title">{risk.person.name}</span>
                  <span className="cell-sub">
                    {risk.drawingNumber}: last confirmed Rev {risk.lastAckedRevision}, current is Rev {risk.currentRevision.revisionNumber}
                  </span>
                </div>
                <span className="badge badge-danger">{risk.state === "not_issued" ? "Not issued" : "Unconfirmed"}</span>
              </Link>
            ))
          )}
        </section>
        )}
      </div>

      <section className="card">
        <div className="card-header">
          <h2>Recent activity</h2>
        </div>
        <ActivityTimeline items={recentActivity} />
      </section>
    </>
  );
}

export default Dashboard;
