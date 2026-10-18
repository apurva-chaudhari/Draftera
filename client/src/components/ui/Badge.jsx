/** Small coloured status pill. Tone maps to a colour in components.css. */
function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// One place that decides how each domain status looks, so the same status
// never appears in two different colours on different screens.
const REVISION = {
  draft: ["neutral", "Draft"],
  published: ["success", "Current"],
  superseded: ["neutral", "Superseded"],
};

const RECIPIENT = {
  current: ["success", "Acknowledged"],
  acknowledged: ["success", "Acknowledged"],
  opened: ["info", "Opened, not acknowledged"],
  pending: ["warning", "Not opened"],
  not_issued: ["danger", "Not issued"],
};

const CLARIFICATION = {
  open: ["warning", "Open"],
  answered: ["info", "Answered"],
  resolved: ["success", "Resolved"],
};

const PROJECT = {
  active: ["success", "Active"],
  on_hold: ["warning", "On hold"],
  completed: ["info", "Completed"],
  archived: ["neutral", "Archived"],
};

function StatusBadge({ map, status }) {
  const [tone, label] = map[status] || ["neutral", status || "Unknown"];
  return <Badge tone={tone}>{label}</Badge>;
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
