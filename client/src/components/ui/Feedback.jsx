import { useI18n } from "../../i18n/I18nProvider.jsx";

/** Inline message box. kind: error | success | warning | info */
export function Alert({ kind = "error", children, onRetry }) {
  const { t } = useI18n();

  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onRetry && (
        <button type="button" className="btn-link" onClick={onRetry}>
          {t("common.tryAgain")}
        </button>
      )}
    </div>
  );
}

export function Loading({ label }) {
  const { t } = useI18n();

  return (
    <div className="loading-block">
      <span className="spinner" /> {label || t("common.loading")}
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
