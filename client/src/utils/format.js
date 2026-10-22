import { getLocale, translate } from "../i18n/core.js";

// Intl formatters are cached per language so switching is cheap.
const formatters = new Map();

function formatter(kind, options) {
  const locale = getLocale();
  const cacheKey = `${kind}:${locale}`;

  if (!formatters.has(cacheKey)) {
    formatters.set(cacheKey, new Intl.DateTimeFormat(locale, options));
  }

  return formatters.get(cacheKey);
}

const DATE = { day: "numeric", month: "short", year: "numeric" };
const DATE_TIME = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };

export function formatDate(value) {
  return value ? formatter("date", DATE).format(new Date(value)) : "—";
}

export function formatDateTime(value) {
  return value ? formatter("datetime", DATE_TIME).format(new Date(value)) : "—";
}

/** "3 days ago", "just now": used where recency matters more than a date. */
export function timeAgo(value) {
  if (!value) return "—";

  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);

  if (seconds < 60) return translate("time.justNow");
  if (seconds < 3600) return translate("time.minAgo", { n: Math.floor(seconds / 60) });
  if (seconds < 86400) return translate("time.hourAgo", { n: Math.floor(seconds / 3600) });
  if (seconds < 86400 * 30) return translate("time.dayAgo", { n: Math.floor(seconds / 86400) });

  return formatDate(value);
}

const ROLES = ["admin", "project_supervisor", "site_engineer", "subcontractor"];

export function roleLabel(role) {
  return translate(ROLES.includes(role) ? `role.${role}` : "role.member");
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
  if (hour < 12) return translate("greeting.morning");
  if (hour < 17) return translate("greeting.afternoon");
  return translate("greeting.evening");
}

/** True when a deadline exists and has passed. */
export function isOverdue(dueAt, now = Date.now()) {
  return Boolean(dueAt) && new Date(dueAt).getTime() < now;
}

/** "Due 3 Nov, 5:30 pm" or "Overdue since 3 Nov". */
export function dueLabel(dueAt, now = Date.now()) {
  if (!dueAt) return translate("time.noDeadline");

  const when = formatter("datetime", DATE_TIME).format(new Date(dueAt));

  return isOverdue(dueAt, now)
    ? translate("time.overdueSince", { date: when })
    : translate("time.due", { date: when });
}

const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"];

/**
 * What each project status means, in words the whole team can read.
 * Built on each call so the labels follow the current language.
 */
export function projectStatusOptions() {
  return PROJECT_STATUSES.map((value) => ({
    value,
    label: translate(`projectStatus.${value}`),
    effect: translate(`projectStatus.${value}.effect`),
  }));
}

/** Projects with live work: these show up in tasks, risks and the overview. */
export function isOpenProject(status) {
  return status === "active" || status === "on_hold";
}

/** The banner shown on a project that is not Active, or null when none is needed. */
export function statusNotice(status) {
  if (status === "on_hold") return translate("notice.onHold");
  if (status === "completed") return translate("notice.completed");
  if (status === "archived") return translate("notice.archived");
  return null;
}
