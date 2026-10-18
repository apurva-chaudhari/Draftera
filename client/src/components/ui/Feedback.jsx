/** Inline message box. kind: error | success | warning | info */
export function Alert({ kind = "error", children, onRetry }) {
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onRetry && (
        <button type="button" className="btn-link" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Loading({ label = "Loading…" }) {
  return (
    <div className="loading-block">
      <span className="spinner" /> {label}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
