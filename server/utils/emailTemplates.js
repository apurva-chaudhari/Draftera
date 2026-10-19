/**
 * Email content. Pure functions: data in, { subject, text, html } out.
 * Every value that came from a user is HTML-escaped before it goes into the
 * HTML body, so a drawing title or name cannot inject markup.
 */
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

const formatWhen = (value) => `${dateFormat.format(new Date(value))} IST`;

/** Wrap paragraphs and a button in a simple, client-safe layout. */
function layout({ heading, paragraphs, buttonLabel, link }) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.5">${escapeHtml(p)}</p>`)
    .join("");

  const button = link
    ? `<p style="margin:22px 0"><a href="${escapeHtml(link)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:11px 20px;border-radius:6px;display:inline-block">${escapeHtml(buttonLabel)}</a></p>`
    : "";

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:560px;margin:0 auto;padding:20px">
<h2 style="margin:0 0 16px;font-size:18px">${escapeHtml(heading)}</h2>${body}${button}
<p style="margin:24px 0 0;font-size:12px;color:#6b7280">Sent by Draftera, drawing revision tracking.</p>
</div>`;

  const text = [
    heading,
    "",
    ...paragraphs,
    ...(link ? ["", `${buttonLabel}: ${link}`] : []),
    "",
    "Sent by Draftera, drawing revision tracking.",
  ].join("\n");

  return { html, text };
}

function revisionIssued({ recipientName, projectCode, projectName, drawingNumber, revisionNumber, issuedBy, dueAt, supersededNumbers = [], link }) {
  const paragraphs = [
    `Hi ${recipientName},`,
    `${issuedBy} has issued ${drawingNumber} Rev ${revisionNumber} on ${projectCode} (${projectName}) to you.`,
    ...(supersededNumbers.length
      ? [`It replaces Rev ${supersededNumbers.join(", ")}. Stop working from the older revision.`]
      : []),
    "Open the drawing, then acknowledge it in Draftera so the team knows you are working from the latest revision.",
    ...(dueAt ? [`Please acknowledge by ${formatWhen(dueAt)}.`] : []),
  ];

  return {
    subject: `New drawing revision: ${drawingNumber} Rev ${revisionNumber} (${projectCode})`,
    ...layout({ heading: `${drawingNumber} Rev ${revisionNumber} needs your acknowledgment`, paragraphs, buttonLabel: "Open the revision", link }),
  };
}

function reminder({ recipientName, projectCode, drawingNumber, revisionNumber, remindedBy, dueAt, overdue = false, link }) {
  const paragraphs = [
    `Hi ${recipientName},`,
    `${remindedBy} is waiting for your acknowledgment of ${drawingNumber} Rev ${revisionNumber} on ${projectCode}.`,
    ...(dueAt
      ? [overdue ? `It was due ${formatWhen(dueAt)} and is now overdue.` : `It is due ${formatWhen(dueAt)}.`]
      : []),
    "Open the drawing and acknowledge it as soon as you can.",
  ];

  return {
    subject: `${overdue ? "Overdue" : "Reminder"}: acknowledge ${drawingNumber} Rev ${revisionNumber} (${projectCode})`,
    ...layout({ heading: `Reminder: ${drawingNumber} Rev ${revisionNumber}`, paragraphs, buttonLabel: "Open the revision", link }),
  };
}

function addedToProject({ recipientName, projectCode, projectName, role, addedBy, link }) {
  const paragraphs = [
    `Hi ${recipientName},`,
    `${addedBy} added you to ${projectCode} (${projectName}) as ${role}.`,
    "You will receive drawing revisions for this project in Draftera.",
  ];

  return {
    subject: `You were added to ${projectCode} on Draftera`,
    ...layout({ heading: `Welcome to ${projectCode}`, paragraphs, buttonLabel: "Open the project", link }),
  };
}

function removedFromProject({ recipientName, projectCode, projectName, removedBy }) {
  const paragraphs = [
    `Hi ${recipientName},`,
    `${removedBy} removed you from ${projectCode} (${projectName}).`,
    "You no longer have access to its drawings. If this looks wrong, contact the project supervisor.",
  ];

  return {
    subject: `You were removed from ${projectCode} on Draftera`,
    ...layout({ heading: `Removed from ${projectCode}`, paragraphs }),
  };
}

module.exports = { revisionIssued, reminder, addedToProject, removedFromProject, escapeHtml };
