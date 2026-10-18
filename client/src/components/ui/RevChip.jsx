/** "Rev B" label; superseded revisions are struck through. */
function RevChip({ revision, superseded = false }) {
  return (
    <span className={`rev-chip ${superseded ? "old" : ""}`}>{revision}</span>
  );
}

export default RevChip;
