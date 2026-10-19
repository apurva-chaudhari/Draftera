/**
 * Turns Draftera events into emails.
 *
 * Rules:
 *  - Best-effort. A notification problem never fails the request that
 *    triggered it; errors are logged and swallowed.
 *  - Nobody is emailed about their own action.
 *  - The deployed web address comes from APP_URL (or the first public
 *    CLIENT_URL), so links in emails open the real app.
 *
 * `deps` exists so tests can replace sending and database lookups.
 */
const templates = require("../utils/emailTemplates");
const defaultMailer = require("./mailer");

function appUrl(env = process.env) {
  const explicit = (env.APP_URL || "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const publicOrigin = (env.CLIENT_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .find((o) => o && !/localhost|127\.0\.0\.1/.test(o));

  return publicOrigin || (env.CLIENT_URL || "http://localhost:5173").split(",")[0].trim().replace(/\/$/, "");
}

const roleText = (role) => String(role).replace("_", " ");

function makeNotifier({ mailer = defaultMailer, loadUsers, env = process.env } = {}) {
  const base = () => appUrl(env);

  async function deliver(user, content) {
    try {
      return await mailer.sendMail({
        to: user.email,
        toName: user.name,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
    } catch (error) {
      console.error("Notification failed:", error.message);
      return { sent: false, reason: "error" };
    }
  }

  /** Email every recipient of a newly issued revision. Never throws. */
  async function notifyRevisionPublished({ project, revision, drawingNumber, recipientIds, actor, supersededNumbers = [] }) {
    try {
      const users = await loadUsers(recipientIds);
      const results = await Promise.all(
        users
          .filter((u) => String(u._id) !== String(actor._id))
          .map((user) =>
            deliver(
              user,
              templates.revisionIssued({
                recipientName: user.name,
                projectCode: project.code,
                projectName: project.name,
                drawingNumber,
                revisionNumber: revision.revisionNumber,
                issuedBy: actor.name,
                dueAt: revision.ackDueAt,
                supersededNumbers,
                link: `${base()}/revisions/${revision._id}`,
              })
            )
          )
      );
      return { attempted: results.length, sent: results.filter((r) => r.sent).length };
    } catch (error) {
      console.error("Notification failed:", error.message);
      return { attempted: 0, sent: 0 };
    }
  }

  /** Email one person a reminder. Returns { sent, reason? } for the UI. */
  async function notifyReminder({ project, revision, drawingNumber, user, actor, overdue = false }) {
    return deliver(
      user,
      templates.reminder({
        recipientName: user.name,
        projectCode: project.code,
        drawingNumber,
        revisionNumber: revision.revisionNumber,
        remindedBy: actor.name,
        dueAt: revision.ackDueAt,
        overdue,
        link: `${base()}/revisions/${revision._id}`,
      })
    );
  }

  async function notifyAddedToProject({ project, user, role, actor }) {
    if (String(user._id) === String(actor._id)) return { sent: false, reason: "self" };
    return deliver(
      user,
      templates.addedToProject({
        recipientName: user.name,
        projectCode: project.code,
        projectName: project.name,
        role: roleText(role),
        addedBy: actor.name,
        link: `${base()}/projects/${project._id}`,
      })
    );
  }

  async function notifyRemovedFromProject({ project, user, actor }) {
    if (String(user._id) === String(actor._id)) return { sent: false, reason: "self" };
    return deliver(
      user,
      templates.removedFromProject({
        recipientName: user.name,
        projectCode: project.code,
        projectName: project.name,
        removedBy: actor.name,
      })
    );
  }

  return { notifyRevisionPublished, notifyReminder, notifyAddedToProject, notifyRemovedFromProject };
}

// Production instance. The model is required lazily so this file stays
// loadable (and testable) without a database.
const live = makeNotifier({
  loadUsers: (ids) => require("../models/User").find({ _id: { $in: ids }, isActive: true }).select("name email").lean(),
});

module.exports = { ...live, makeNotifier, appUrl };
