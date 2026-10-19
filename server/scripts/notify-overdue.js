/**
 * Email everyone whose acknowledgment is overdue.
 *
 *   npm run notify:overdue
 *
 * Safe to run as often as you like: each person is reminded at most once per
 * 24 hours. Run it once a day (see docs/notifications.md for how). Needs the
 * same server/.env as the API, including BREVO_API_KEY and MAIL_FROM.
 */
require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const Acknowledgment = require("../models/Acknowledgment");
const DrawingRevision = require("../models/DrawingRevision");
const Project = require("../models/Project");
const User = require("../models/User");
const { logActivity } = require("../utils/activity");
const { pickOverdueReminders } = require("../utils/overdue");
const { isMailConfigured } = require("../services/mailer");
const notifications = require("../services/notifications");

async function main() {
  if (!isMailConfigured()) {
    console.error("Email is not configured (BREVO_API_KEY and MAIL_FROM). Nothing to do.");
    process.exitCode = 1;
    return;
  }

  await connectDB();

  const now = new Date();
  const revisions = await DrawingRevision.find({
    status: "published",
    ackDueAt: { $lt: now },
  })
    .populate("drawing", "drawingNumber")
    .lean();

  const acknowledgments = await Acknowledgment.find({
    revision: { $in: revisions.map((r) => r._id) },
    status: "pending",
  }).lean();

  const projects = await Project.find({
    _id: { $in: [...new Set(revisions.map((r) => String(r.project)))] },
  }).lean();

  const due = pickOverdueReminders({ revisions, acknowledgments, projects, now });
  const revisionsById = new Map(revisions.map((r) => [String(r._id), r]));
  const projectsById = new Map(projects.map((p) => [String(p._id), p]));

  let sent = 0;

  for (const ack of due) {
    const revision = revisionsById.get(String(ack.revision));
    const project = projectsById.get(String(ack.project));
    const [user, supervisor] = await Promise.all([
      User.findById(ack.recipient).select("name email isActive"),
      User.findById(project.supervisor).select("name"),
    ]);

    if (!user || !user.isActive || !supervisor) continue;

    const result = await notifications.notifyReminder({
      project,
      revision,
      drawingNumber: revision.drawing?.drawingNumber,
      user,
      actor: supervisor,
      overdue: true,
    });

    if (!result.sent) continue;

    await Acknowledgment.updateOne(
      { _id: ack._id },
      { $set: { lastRemindedAt: new Date() }, $inc: { reminderCount: 1 } }
    );

    await logActivity({
      project: project._id,
      revision: revision._id,
      actor: supervisor._id,
      action: "reminder_sent",
      message: `Automatic overdue reminder emailed to ${user.name} for ${revision.drawing?.drawingNumber} Rev ${revision.revisionNumber}.`,
    });

    sent += 1;
  }

  console.log(`Overdue reminders: ${due.length} due, ${sent} emailed.`);
}

main()
  .catch((error) => {
    console.error("Overdue reminders failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
