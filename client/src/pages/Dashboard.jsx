import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import useResource from "../hooks/useResource.js";
import workflowService from "../services/workflowService.js";
import ActivityTimeline from "../components/activity/ActivityTimeline.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import RevChip from "../components/ui/RevChip.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { greeting, timeAgo } from "../utils/format.js";

// The overview adapts to the role: a supervisor watches the whole project,
// everyone else sees their own work. Current revisions and revision risks are
// the supervisor's view, so members never see them.
// `label` and `detail` are translation keys.
function statsFor(supervises) {
  return [
    { key: "activeProjects", label: "dash.stat.activeProjects", detail: "dash.stat.activeProjects.detail" },
    ...(supervises
      ? [{ key: "currentDrawings", label: "dash.stat.currentRevisions", detail: "dash.stat.currentRevisions.detail" }]
      : []),
    { key: "pendingAcknowledgments", label: "dash.stat.waiting", detail: "dash.stat.waiting.detail" },
    {
      key: "openClarifications",
      label: "dash.stat.openQuestions",
      detail: supervises ? "dash.stat.openQuestions.detailSupervisor" : "dash.stat.openQuestions.detailMember",
    },
  ];
}

function Dashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, error, reload } = useResource("dashboard", () =>
    workflowService.getDashboard()
  );

  const firstName = user.name.split(" ")[0];

  if (error) return <Alert kind="error" onRetry={reload}>{error}</Alert>;
  if (!data) return <Loading label={t("dash.loading")} />;

  const { summary, pendingItems, atRisk, recentActivity } = data;
  const supervises = summary.supervisedProjects > 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description={
          supervises
            ? t("dash.desc.supervisor")
            : t("dash.desc.member")
        }
      />

      <div className="grid-4">
        {statsFor(supervises).map((stat) => (
          <div className="card stat-card" key={stat.key}>
            <div className="stat-label">{t(stat.label)}</div>
            <div className="stat-value">{summary[stat.key]}</div>
            <div className="stat-detail">{t(stat.detail)}</div>
          </div>
        ))}
        {summary.overdueAcknowledgments > 0 && (
          <div className="card stat-card attention">
            <div className="stat-label">{t("dash.stat.yourOverdue")}</div>
            <div className="stat-value">{summary.overdueAcknowledgments}</div>
            <div className="stat-detail">{t("dash.stat.yourOverdue.detail")}</div>
          </div>
        )}
        {supervises && summary.overduePeople > 0 && (
          <div className="card stat-card attention">
            <div className="stat-label">{t("dash.stat.teamOverdue")}</div>
            <div className="stat-value">{summary.overduePeople}</div>
            <div className="stat-detail">{t("dash.stat.teamOverdue.detail")}</div>
          </div>
        )}
        {supervises && summary.atRiskRecipients > 0 && (
          <div className="card stat-card attention">
            <div className="stat-label">{t("dash.stat.atRisk")}</div>
            <div className="stat-value">{summary.atRiskRecipients}</div>
            <div className="stat-detail">{t("dash.stat.atRisk.detail")}</div>
          </div>
        )}
      </div>

      <div className={supervises ? "grid-2" : "stack"}>
        <section className="card">
          <div className="card-header">
            <h2>{t("dash.stat.waiting")}</h2>
            <Link to="/tasks" style={{ fontSize: 13 }}>{t("common.viewAll")}</Link>
          </div>
          {pendingItems.length === 0 ? (
            <EmptyState title={t("dash.upToDate")}>{t("dash.upToDate.body")}</EmptyState>
          ) : (
            pendingItems.map((item) => (
              <Link className="list-item" to={`/revisions/${item.revision._id}`} key={item._id}>
                <div>
                  <span className="cell-title"><span className="mono">{item.revision.drawing?.drawingNumber}</span> · {item.revision.drawing?.title}</span>
                  <span className="cell-sub">{item.project?.code} · {t("dash.issuedAgo", { when: timeAgo(item.revision.publishedAt) })}</span>
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
              <h2>{t("dash.risks")}</h2>
              <p>{t("dash.risks.desc")}</p>
            </div>
          </div>
          {atRisk.length === 0 ? (
            <EmptyState title={t("dash.noRisks")}>
              {t("dash.noRisks.body")}
            </EmptyState>
          ) : (
            atRisk.map((risk, index) => (
              <Link className="list-item" to={`/projects/${risk.projectId}?tab=currency`} key={`${risk.drawingNumber}-${risk.person._id}-${index}`}>
                <div>
                  <span className="cell-title">{risk.person.name}</span>
                  <span className="cell-sub">
                    {t("dash.riskLine", { drawing: risk.drawingNumber, last: risk.lastAckedRevision, current: risk.currentRevision.revisionNumber })}
                  </span>
                </div>
                <span className="badge badge-danger">{risk.state === "not_issued" ? t("recipient.notIssued") : t("dash.unconfirmed")}</span>
              </Link>
            ))
          )}
        </section>
        )}
      </div>

      <section className="card">
        <div className="card-header">
          <h2>{t("dash.recentActivity")}</h2>
        </div>
        <ActivityTimeline items={recentActivity} />
      </section>
    </>
  );
}

export default Dashboard;
