import Icon from "./Icon.jsx";

export function PageHeader({ eyebrow, title, description, action, className = "" }) {
  return (
    <header className={`bc-page-head bc-shared-page-head ${className}`.trim()}>
      <div>
        {eyebrow && <span className="bc-module-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p className="bc-page-description">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function FormField({ id, label, required = false, hint, error, className = "", children }) {
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`bc-field ${className}`.trim()}>
      <label htmlFor={id}>
        {label}{required && <> <span className="bc-required-mark" aria-hidden="true">*</span></>}
      </label>
      {typeof children === "function" ? children({ describedBy, error: Boolean(error) }) : children}
      {hint && <p id={`${id}-hint`} className="bc-field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="bc-field-error">{error}</p>}
    </div>
  );
}

export function StatCard({ icon, label, value, description, unit, tone = "" }) {
  return (
    <article className={`bc-shared-stat ${tone ? `bc-shared-stat--${tone}` : ""}`.trim()}>
      {icon && <span className="bc-shared-stat__icon"><Icon name={icon} size={21} /></span>}
      <div className="bc-shared-stat__body">
        <span>{label}</span>
        <strong>{value ?? "—"}{unit && value != null && value !== "—" && <small>{unit}</small>}</strong>
        {description && <small>{description}</small>}
      </div>
    </article>
  );
}

export function AlertMessage({ type = "error", children, className = "", ...props }) {
  const roles = { error: "alert", success: "status", warning: "status", info: "status" };
  return (
    <div
      className={`bc-alert bc-alert--${type} ${className}`.trim()}
      role={roles[type] ?? "status"}
      {...props}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, description, action, icon = "home", className = "" }) {
  return (
    <section className={`bc-card bc-shared-empty ${className}`.trim()}>
      {icon && <span className="bc-shared-empty__icon"><Icon name={icon} size={23} /></span>}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}

export function LoadingState({ children = "Cargando...", className = "" }) {
  return (
    <div className={`bc-shared-loading ${className}`.trim()} role="status" aria-live="polite">
      <span className="bc-shared-loading__indicator" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function SearchField({ label, placeholder, value, onChange, className = "" }) {
  return (
    <label className={`bc-shared-search ${className}`.trim()}>
      <Icon name="search" size={18} />
      <span className="visually-hidden">{label}</span>
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function FilterSelect({
  label, value, onChange, options, defaultLabel = "Todos", className = "",
}) {
  return (
    <label className={`bc-shared-filter ${className}`.trim()}>
      <span className="visually-hidden">{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{defaultLabel}</option>
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TableContainer({ children, className = "", label }) {
  return (
    <div className={`bc-table-wrap ${className}`.trim()}>
      {label && <span className="visually-hidden">{label}</span>}
      {children}
    </div>
  );
}

export function ActionButton({ variant = "primary", size, className = "", children, ...props }) {
  const sizeClass = size === "small" ? "bc-btn-sm" : "";
  return (
    <button className={`bc-btn bc-btn-${variant} ${sizeClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
