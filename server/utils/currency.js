/**
 * Revision currency: for every drawing, which team member is working from
 * the latest published revision, and who might still be on an older one?
 *
 * This is a pure function (no database access) so it can be unit tested.
 *
 * States for each person on a drawing's current revision:
 *   current    - acknowledged the current revision
 *   opened     - opened the file but has not acknowledged yet
 *   pending    - sent, but no evidence they have seen it
 *   not_issued - was not on the distribution list for the current revision
 *
 * atRisk is true when the person is NOT current AND previously acknowledged
 * an older revision, i.e. they have a reason to believe they hold a valid
 * drawing that is no longer the latest.
 */
const AUDIENCE_ROLES = ["site_engineer", "subcontractor"];

function idOf(value) {
  return String(value && value._id ? value._id : value);
}

function buildCurrencyMatrix({ members, drawings, revisions, acknowledgments }) {
  const audience = members.filter((m) => AUDIENCE_ROLES.includes(m.role));

  const rows = [];

  for (const drawing of drawings) {
    const drawingRevisions = revisions.filter(
      (r) => idOf(r.drawing) === idOf(drawing)
    );

    const current = drawingRevisions
      .filter((r) => r.status === "published")
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];

    // A drawing with only drafts has nothing to track yet.
    if (!current) continue;

    const previousIds = new Set(
      drawingRevisions.filter((r) => idOf(r) !== idOf(current)).map(idOf)
    );
    const recipientIds = new Set((current.recipients || []).map(idOf));

    const people = audience.map((member) => {
      const userId = idOf(member.user);

      const currentAck = acknowledgments.find(
        (a) => idOf(a.revision) === idOf(current) && idOf(a.recipient) === userId
      );

      // Most recent acknowledged older revision, if any.
      const lastOlderAck = acknowledgments
        .filter(
          (a) =>
            previousIds.has(idOf(a.revision)) &&
            idOf(a.recipient) === userId &&
            a.status === "acknowledged"
        )
        .sort((a, b) => new Date(b.acknowledgedAt) - new Date(a.acknowledgedAt))[0];

      const lastAckedRevision = lastOlderAck
        ? drawingRevisions.find((r) => idOf(r) === idOf(lastOlderAck.revision))
            ?.revisionNumber || null
        : null;

      let state;
      if (!recipientIds.has(userId)) state = "not_issued";
      else if (currentAck && currentAck.status === "acknowledged") state = "current";
      else if (currentAck && currentAck.viewedAt) state = "opened";
      else state = "pending";

      return {
        user: member.user,
        role: member.role,
        state,
        lastAckedRevision,
        atRisk: state !== "current" && Boolean(lastAckedRevision),
        sentAt: current.publishedAt,
        viewedAt: currentAck?.viewedAt || null,
        acknowledgedAt: currentAck?.acknowledgedAt || null,
        lastRemindedAt: currentAck?.lastRemindedAt || null,
      };
    });

    rows.push({
      drawing,
      currentRevision: {
        _id: current._id,
        revisionNumber: current.revisionNumber,
        publishedAt: current.publishedAt,
      },
      people,
      summary: {
        current: people.filter((p) => p.state === "current").length,
        opened: people.filter((p) => p.state === "opened").length,
        pending: people.filter((p) => p.state === "pending").length,
        notIssued: people.filter((p) => p.state === "not_issued").length,
        atRisk: people.filter((p) => p.atRisk).length,
      },
    });
  }

  const totals = rows.reduce(
    (sum, row) => {
      for (const key of Object.keys(sum)) sum[key] += row.summary[key];
      return sum;
    },
    { current: 0, opened: 0, pending: 0, notIssued: 0, atRisk: 0 }
  );

  return { drawings: rows, totals };
}

module.exports = { buildCurrencyMatrix, AUDIENCE_ROLES };
