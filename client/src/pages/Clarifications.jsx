import { useState } from "react";
import { Link } from "react-router-dom";
import useResource from "../hooks/useResource.js";
import workflowService from "../services/workflowService.js";
import { ClarificationStatus } from "../components/ui/Badge.jsx";
import { Alert, EmptyState, Loading, PageHeader } from "../components/ui/Feedback.jsx";
import RevChip from "../components/ui/RevChip.jsx";
import { useI18n } from "../i18n/I18nProvider.jsx";
import { formatDateTime } from "../utils/format.js";

function Clarifications() {
  const { t } = useI18n();
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
        title={t("nav.clarifications")}
        description={t("clar.page.desc")}
      />

      <div className="toolbar">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("common.filterStatus")}>
          <option value="all">{t("common.allStatuses")}</option>
          <option value="open">{t("clarification.open")}</option>
          <option value="answered">{t("clarification.answered")}</option>
          <option value="resolved">{t("clarification.resolved")}</option>
        </select>
      </div>

      <div className="card">
        {visible.length === 0 ? (
          <EmptyState title={t("clar.page.empty")}>{t("clar.page.empty.body")}</EmptyState>
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
