/**
 * Decide who should get an automatic overdue reminder. Pure function, so it
 * is unit tested without a database.
 *
 * A reminder is due when ALL of these hold:
 *  - the revision is the current published one and its deadline has passed
 *  - the person has not acknowledged it
 *  - the person is still on the project team (removed people are never nagged)
 *  - they were not reminded within `cooldownMs` (so a daily job cannot spam)
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function pickOverdueReminders({ revisions, acknowledgments, projects, now = new Date(), cooldownMs = DAY_MS }) {
  const overdueRevisions = new Map(
    revisions
      .filter((r) => r.status === "published" && r.ackDueAt && new Date(r.ackDueAt) < now)
      .map((r) => [String(r._id), r])
  );

  const projectsById = new Map(projects.map((p) => [String(p._id), p]));

  return acknowledgments.filter((ack) => {
    const revision = overdueRevisions.get(String(ack.revision));
    if (!revision || ack.status !== "pending") return false;

    if (ack.lastRemindedAt && now - new Date(ack.lastRemindedAt) < cooldownMs) return false;

    const project = projectsById.get(String(ack.project));
    if (!project) return false;

    const userId = String(ack.recipient);
    return (
      String(project.supervisor) === userId ||
      project.members.some((m) => String(m.user) === userId)
    );
  });
}

module.exports = { pickOverdueReminders, DAY_MS };
