/**
 * Distribution report: a CSV a supervisor can open in Excel and share
 * outside the app. Built from the same data as the revision-currency view, so
 * the two can never disagree.
 */
const STATE_LABELS = {
  current: "Acknowledged",
  opened: "Opened, not acknowledged",
  pending: "Not opened",
  not_issued: "Not issued",
};

const HEADERS = [
  "Project",
  "Drawing number",
  "Drawing title",
  "Current revision",
  "Issued",
  "Acknowledge by",
  "Person",
  "Email",
  "Role",
  "Status",
  "Opened at",
  "Acknowledged at",
  "Last acknowledged revision",
  "At risk (older revision)",
  "Overdue",
  "Reminders sent",
  "Open questions on revision",
];

/**
 * Spreadsheet programs run cells that start with = + - @ as formulas. Names
 * and drawing titles are user-entered, so they are neutralised to stop CSV
 * injection when the file is opened.
 */
function escapeCell(value) {
  let text = value === null || value === undefined ? "" : String(value);

  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const iso = (value) => (value ? new Date(value).toISOString() : "");

function buildDistributionCsv({ project, currency, openQuestionsByRevision = {} }) {
  const rows = [HEADERS];

  for (const entry of currency.drawings) {
    const revisionId = String(entry.currentRevision._id);

    for (const person of entry.people) {
      rows.push([
        `${project.code} ${project.name}`,
        entry.drawing.drawingNumber,
        entry.drawing.title,
        entry.currentRevision.revisionNumber,
        iso(entry.currentRevision.publishedAt),
        iso(entry.currentRevision.ackDueAt),
        person.user?.name,
        person.user?.email,
        person.role,
        STATE_LABELS[person.state] || person.state,
        iso(person.viewedAt),
        iso(person.acknowledgedAt),
        person.lastAckedRevision || "",
        person.atRisk ? "Yes" : "No",
        person.overdue ? "Yes" : "No",
        person.reminderCount || 0,
        openQuestionsByRevision[revisionId] || 0,
      ]);
    }
  }

  // BOM so Excel reads the file as UTF-8; CRLF is the CSV standard.
  return "\uFEFF" + rows.map((row) => row.map(escapeCell).join(",")).join("\r\n") + "\r\n";
}

module.exports = { buildDistributionCsv, escapeCell, HEADERS };
