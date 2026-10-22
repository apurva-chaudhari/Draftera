import { useI18n } from "../../i18n/I18nProvider.jsx";

/** Small coloured status pill. Tone maps to a colour in components.css. */
function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// One place that decides how each domain status looks, so the same status
// never appears in two different colours on different screens.
// Each entry is [tone, translation key].
const REVISION = {
  draft: ["neutral", "revision.draft"],
  published: ["success", "revision.current"],
  superseded: ["neutral", "revision.superseded"],
};

const RECIPIENT = {
  current: ["success", "recipient.acknowledged"],
  acknowledged: ["success", "recipient.acknowledged"],
  opened: ["info", "recipient.opened"],
  pending: ["warning", "recipient.pending"],
  not_issued: ["danger", "recipient.notIssued"],
};

const CLARIFICATION = {
  open: ["warning", "clarification.open"],
  answered: ["info", "clarification.answered"],
  resolved: ["success", "clarification.resolved"],
};

const PROJECT = {
  active: ["success", "projectStatus.active"],
  on_hold: ["warning", "projectStatus.on_hold"],
  completed: ["info", "projectStatus.completed"],
  archived: ["neutral", "projectStatus.archived"],
};

function StatusBadge({ map, status }) {
  const { t } = useI18n();
  const entry = map[status];

  return <Badge tone={entry ? entry[0] : "neutral"}>{entry ? t(entry[1]) : status || t("common.unknown")}</Badge>;
}

export function RevisionStatus({ status }) {
  return <StatusBadge map={REVISION} status={status} />;
}

export function RecipientStatus({ status }) {
  return <StatusBadge map={RECIPIENT} status={status} />;
}

export function ClarificationStatus({ status }) {
  return <StatusBadge map={CLARIFICATION} status={status} />;
}

export function ProjectStatus({ status }) {
  return <StatusBadge map={PROJECT} status={status} />;
}

export default Badge;
