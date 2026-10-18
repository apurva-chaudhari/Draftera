/**
 * Demo data for Draftera.
 *
 *   npm run seed            create the demo project (refuses to run twice)
 *   npm run seed -- --reset delete the demo project first, then recreate it
 *
 * The story it sets up is exactly the problem in the assessment brief:
 *   - STR-101 Rev A was acknowledged by everyone.
 *   - Rev B then replaced it. Only the site engineer acknowledged Rev B.
 *     The subcontractor acknowledged Rev A, opened nothing since, and is
 *     therefore still "on the old drawing" without anyone noticing.
 *   - ARC-204 Rev A was issued but the electrical subcontractor was left
 *     off the distribution list.
 */
require("dotenv").config();

const mongoose = require("mongoose");

const connectDB = require("../config/db");
const supabase = require("../config/storage");
const { hashPassword } = require("../utils/auth");
const { buildPdf } = require("../utils/samplePdf");

const User = require("../models/User");
const Project = require("../models/Project");
const Drawing = require("../models/Drawing");
const DrawingRevision = require("../models/DrawingRevision");
const Acknowledgment = require("../models/Acknowledgment");
const Clarification = require("../models/Clarification");
const ActivityLog = require("../models/ActivityLog");

const DEMO_PASSWORD = "Draftera#2026";
const PROJECT_CODE = "DEMO-TOWER";

async function uploadPdf(projectId, name, lines) {
  const buffer = buildPdf(lines);
  const key = `${projectId}/seed-${name}`;

  const { error } = await supabase.storage
    .from("drawing-revisions")
    .upload(key, buffer, { contentType: "application/pdf", upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return { storageKey: key, originalName: name, mimeType: "application/pdf", sizeBytes: buffer.length };
}

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function createUser(name, email, role) {
  await User.deleteOne({ email });
  return User.create({ name, email, role, passwordHash: await hashPassword(DEMO_PASSWORD) });
}

async function removeExistingDemo() {
  const existing = await Project.findOne({ code: PROJECT_CODE });
  if (!existing) return;

  await Promise.all([
    Acknowledgment.deleteMany({ project: existing._id }),
    Clarification.deleteMany({ project: existing._id }),
    ActivityLog.deleteMany({ project: existing._id }),
    DrawingRevision.deleteMany({ project: existing._id }),
    Drawing.deleteMany({ project: existing._id }),
  ]);
  await existing.deleteOne();
}

async function main() {
  await connectDB();

  const existing = await Project.findOne({ code: PROJECT_CODE });
  if (existing && !process.argv.includes("--reset")) {
    console.log("Demo project already exists. Run `npm run seed -- --reset` to rebuild it.");
    return;
  }
  await removeExistingDemo();

  const supervisor = await createUser("Rahul Deshmukh", "supervisor@draftera.demo", "site_engineer");
  const engineer = await createUser("Neha Kulkarni", "engineer@draftera.demo", "site_engineer");
  const steel = await createUser("Imran Shaikh (Steel)", "steel@draftera.demo", "subcontractor");
  const electrical = await createUser("Priya Nair (Electrical)", "electrical@draftera.demo", "subcontractor");

  const project = await Project.create({
    name: "Riverside Commercial Tower",
    code: PROJECT_CODE,
    description: "G+12 commercial building. Demo project showing revision tracking.",
    supervisor: supervisor._id,
    createdBy: supervisor._id,
    members: [
      { user: supervisor._id, role: "project_supervisor", addedBy: supervisor._id },
      { user: engineer._id, role: "site_engineer", addedBy: supervisor._id },
      { user: steel._id, role: "subcontractor", addedBy: supervisor._id },
      { user: electrical._id, role: "subcontractor", addedBy: supervisor._id },
    ],
  });

  const log = (actor, action, message, revision = null, when = new Date()) =>
    ActivityLog.create({ project: project._id, revision, actor: actor._id, action, message, createdAt: when });

  await log(supervisor, "project_created", `${supervisor.name} created project ${PROJECT_CODE}.`, null, daysAgo(12));

  // ---- Drawing 1: STR-101, Rev A superseded by Rev B ----------------------
  const str = await Drawing.create({
    project: project._id,
    drawingNumber: "STR-101",
    title: "Level 3 slab reinforcement",
    createdBy: supervisor._id,
  });

  const revA = await DrawingRevision.create({
    project: project._id,
    drawing: str._id,
    revisionNumber: "A",
    issueDate: daysAgo(10),
    changeSummary: "Initial issue. 12 mm bars at 150 mm c/c both ways.",
    file: await uploadPdf(project._id, "STR-101-A.pdf", ["STR-101 Rev A", "Level 3 slab reinforcement", "12 mm @ 150 c/c (SUPERSEDED)"]),
    status: "superseded",
    publishedBy: supervisor._id,
    publishedAt: daysAgo(10),
    recipients: [engineer._id, steel._id],
    createdBy: supervisor._id,
  });

  const revB = await DrawingRevision.create({
    project: project._id,
    drawing: str._id,
    revisionNumber: "B",
    issueDate: daysAgo(2),
    changeSummary: "Bar spacing reduced to 100 mm c/c near the lift core following structural review. Do not use Rev A.",
    file: await uploadPdf(project._id, "STR-101-B.pdf", ["STR-101 Rev B", "Level 3 slab reinforcement", "12 mm @ 100 c/c near lift core"]),
    status: "published",
    publishedBy: supervisor._id,
    publishedAt: daysAgo(2),
    // Deadline was yesterday, so the steel subcontractor shows as overdue.
    ackDueAt: daysAgo(1),
    recipients: [engineer._id, steel._id],
    createdBy: supervisor._id,
  });

  await Acknowledgment.insertMany([
    { project: project._id, revision: revA._id, recipient: engineer._id, status: "acknowledged", viewedAt: daysAgo(10), acknowledgedAt: daysAgo(10) },
    { project: project._id, revision: revA._id, recipient: steel._id, status: "acknowledged", viewedAt: daysAgo(9), acknowledgedAt: daysAgo(9) },
    { project: project._id, revision: revB._id, recipient: engineer._id, status: "acknowledged", viewedAt: daysAgo(2), acknowledgedAt: daysAgo(2) },
    // The subcontractor has not even opened Rev B: classic "still on Rev A".
    { project: project._id, revision: revB._id, recipient: steel._id, status: "pending", viewedAt: null, lastRemindedAt: daysAgo(1), reminderCount: 1 },
  ]);

  await Clarification.create({
    project: project._id,
    revision: revB._id,
    requestedBy: engineer._id,
    question: "Does the 100 mm spacing also apply to the balcony slab at gridline D?",
    response: "No. The balcony slab stays at 150 mm c/c. Only the lift-core zone changes.",
    respondedBy: supervisor._id,
    respondedAt: daysAgo(1),
    status: "answered",
  });

  await log(supervisor, "revision_published", `${supervisor.name} published STR-101 Rev A to 2 recipient(s).`, revA._id, daysAgo(10));
  await log(engineer, "revision_acknowledged", `${engineer.name} acknowledged STR-101 Rev A.`, revA._id, daysAgo(10));
  await log(steel, "revision_acknowledged", `${steel.name} acknowledged STR-101 Rev A.`, revA._id, daysAgo(9));
  await log(supervisor, "revision_published", `${supervisor.name} published STR-101 Rev B to 2 recipient(s). It supersedes Rev A.`, revB._id, daysAgo(2));
  await log(engineer, "revision_acknowledged", `${engineer.name} acknowledged STR-101 Rev B.`, revB._id, daysAgo(2));
  await log(supervisor, "reminder_sent", `${supervisor.name} sent a reminder to ${steel.name} for STR-101 Rev B.`, revB._id, daysAgo(1));
  await log(engineer, "clarification_requested", `${engineer.name} asked a question about STR-101 Rev B.`, revB._id, daysAgo(2));
  await log(supervisor, "clarification_answered", `${supervisor.name} answered a clarification.`, revB._id, daysAgo(1));

  // ---- Drawing 2: ARC-204, electrical sub left off the distribution -------
  const arc = await Drawing.create({
    project: project._id,
    drawingNumber: "ARC-204",
    title: "Level 5 ceiling and services layout",
    createdBy: supervisor._id,
  });

  const arcA = await DrawingRevision.create({
    project: project._id,
    drawing: arc._id,
    revisionNumber: "A",
    issueDate: daysAgo(1),
    changeSummary: "Ceiling void lowered by 100 mm; light fittings relocated.",
    file: await uploadPdf(project._id, "ARC-204-A.pdf", ["ARC-204 Rev A", "Level 5 ceiling and services layout"]),
    status: "published",
    publishedBy: supervisor._id,
    publishedAt: daysAgo(1),
    ackDueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    recipients: [engineer._id],
    createdBy: supervisor._id,
  });

  await Acknowledgment.create({ project: project._id, revision: arcA._id, recipient: engineer._id, status: "pending" });
  await log(supervisor, "revision_published", `${supervisor.name} published ARC-204 Rev A to 1 recipient(s).`, arcA._id, daysAgo(1));

  console.log("\nDemo data created.\n");
  console.log("Sign in with any of these (password for all: " + DEMO_PASSWORD + ")");
  console.log("  supervisor@draftera.demo   project supervisor view");
  console.log("  engineer@draftera.demo     site engineer");
  console.log("  steel@draftera.demo        subcontractor still on STR-101 Rev A");
  console.log("  electrical@draftera.demo   subcontractor missing from ARC-204 distribution\n");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
