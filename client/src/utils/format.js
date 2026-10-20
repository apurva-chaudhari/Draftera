const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value) {
  return value ? dateFormatter.format(new Date(value)) : "—";
}

export function formatDateTime(value) {
  return value ? dateTimeFormatter.format(new Date(value)) : "—";
}

/** "3 days ago", "just now": used where recency matters more than a date. */
export function timeAgo(value) {
  if (!value) return "—";

  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)} d ago`;

  return formatDate(value);
}

const ROLE_LABELS = {
  admin: "Administrator",
  project_supervisor: "Project supervisor",
  site_engineer: "Site engineer",
  subcontractor: "Subcontractor",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || "Team member";
}

export function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "?"
  );
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** True when a deadline exists and has passed. */
export function isOverdue(dueAt, now = Date.now()) {
  return Boolean(dueAt) && new Date(dueAt).getTime() < now;
}

/** "Due 3 Nov, 5:30 pm" or "Overdue since 3 Nov". */
export function dueLabel(dueAt, now = Date.now()) {
  if (!dueAt) return "No deadline";
  return isOverdue(dueAt, now)
    ? `Overdue since ${dateTimeFormatter.format(new Date(dueAt))}`
    : `Due ${dateTimeFormatter.format(new Date(dueAt))}`;
}

/** What each project status means, in words the whole team can read. */
export const PROJECT_STATUS_OPTIONS = [
  {
    value: "active",
    label: "Active",
    effect: "Normal work. Drawings can be uploaded, issued, acknowledged and discussed.",
  },
  {
    value: "on_hold",
    label: "On hold",
    effect:
      "Paused. Nothing new can be issued, but the team can still acknowledge and ask questions about what they already hold.",
  },
  {
    value: "completed",
    label: "Completed",
    effect: "Finished. Everything becomes read-only; drawings and history stay available.",
  },
  {
    value: "archived",
    label: "Archived",
    effect: "Closed and moved out of the way. Read-only, and hidden from the default project list.",
  },
];

/** Projects with live work: these show up in tasks, risks and the overview. */
export function isOpenProject(status) {
  return status === "active" || status === "on_hold";
}

/** The banner shown on a project that is not Active, or null when none is needed. */
export function statusNotice(status) {
  if (status === "on_hold") return "This project is on hold. Nothing new can be issued until it is set back to Active.";
  if (status === "completed") return "This project is completed and read-only.";
  if (status === "archived") return "This project is archived and read-only.";
  return null;
}
