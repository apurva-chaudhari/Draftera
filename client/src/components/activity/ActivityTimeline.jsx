import { formatDateTime } from "../../utils/format.js";

const TONES = {
  revision_published: "",
  revision_acknowledged: "tone-success",
  clarification_resolved: "tone-success",
  reminder_sent: "tone-warning",
  clarification_requested: "tone-warning",
  revision_opened: "tone-neutral",
  member_added: "tone-neutral",
  project_created: "tone-neutral",
};

/** Chronological list of recorded actions (newest first). */
function ActivityTimeline({ items, emptyText = "No activity recorded yet." }) {
  if (!items || items.length === 0) {
    return <p style={{ padding: 22, color: "var(--color-text-muted)", fontSize: 13.5 }}>{emptyText}</p>;
  }

  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item._id} className={TONES[item.action] || ""}>
          <p>{item.message}</p>
          <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
        </li>
      ))}
    </ol>
  );
}

export default ActivityTimeline;
