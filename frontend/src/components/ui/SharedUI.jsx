import { Link } from "react-router-dom";
import Icon from "./Icon.jsx";

// Ruta de navegación: [{ texto, ruta? }]; el último elemento es la página actual.
export function Migas({ items }) {
  return (
    <nav className="migas" aria-label="Ruta de navegación">
      {items.map((item, i) => (
        <span key={`${item.texto}-${i}`} style={{ display: "contents" }}>
          {i > 0 && <span aria-hidden="true">/</span>}
          {item.ruta ? <Link to={item.ruta}>{item.texto}</Link> : <span aria-current="page">{item.texto}</span>}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({ title, description, action, migas }) {
  return (
    <header>
      {migas && <Migas items={migas} />}
      <div className="cab-vista">
        <div>
          <h1 className="titulo-vista">{title}</h1>
          {description && <p className="bajada">{description}</p>}
        </div>
        {action && <div className="acciones">{action}</div>}
      </div>
    </header>
  );
}

export function FormField({ id, label, required = false, hint, error, className = "", children }) {
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`campo ${className}`.trim()}>
      <label htmlFor={id}>
        {label}{required && <span className="req" aria-hidden="true">*</span>}
      </label>
      {typeof children === "function" ? children({ describedBy, error: Boolean(error) }) : children}
      {hint && <p id={`${id}-hint`} className="pista">{hint}</p>}
      {error && <p id={`${id}-error`} className="err-campo">{error}</p>}
    </div>
  );
}

export function SelectField({ id, value, onChange, children, ...props }) {
  return (
    <div className="sel">
      <select id={id} className="ctl" value={value} onChange={onChange} {...props}>{children}</select>
      <Icon name="chevronDown" />
    </div>
  );
}

export function StatCard({ label, value, description, unit }) {
  // Los valores de texto ("No calculable", "3.1 s") van en un tamaño menor que las cifras
  const texto = typeof value === "string" && /[a-záéíóú]/i.test(value) && !unit;
  return (
    <dl className="cifra">
      <dt>{label}</dt>
      <dd className={texto ? "texto" : undefined}>
        {value ?? "—"}
        {unit && value != null && value !== "—" && <small>{unit}</small>}
      </dd>
      {description && <p>{description}</p>}
    </dl>
  );
}

export function AlertMessage({ type = "error", children, className = "", ...props }) {
  const clases = { error: "alerta-error", success: "alerta-ok", warning: "alerta-aviso", info: "alerta-aviso" };
  return (
    <div className={`alerta ${clases[type] ?? "alerta-aviso"} ${className}`.trim()} role={type === "error" ? "alert" : "status"} {...props}>
      {children}
    </div>
  );
}

export function EmptyState({ title, description, action, className = "" }) {
  return (
    <div className={`vacio-bloque ${className}`.trim()}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function LoadingState({ children = "Cargando..." }) {
  return (
    <div className="cargando" role="status" aria-live="polite">
      <i aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function SearchField({ label, placeholder, value, onChange, id = "buscar" }) {
  return (
    <div className="buscar">
      <Icon name="search" />
      <label className="sr" htmlFor={id}>{label}</label>
      <input id={id} className="ctl" type="search" placeholder={placeholder} value={value}
        onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

export function FilterSelect({ label, value, onChange, options, defaultLabel = "Todos", id }) {
  return (
    <div className="sel">
      <label className="sr" htmlFor={id}>{label}</label>
      <select id={id} className="ctl" aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{defaultLabel}</option>
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>{option.label ?? option}</option>
        ))}
      </select>
      <Icon name="chevronDown" />
    </div>
  );
}

export function TableContainer({ children, className = "", label }) {
  return (
    <div className={`tabla-caja ${className}`.trim()} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

const VARIANTES = { primary: "btn-brote", outline: "btn-oscuro", light: "btn-claro", danger: "btn-peligro" };

export function ActionButton({ variant = "primary", size, className = "", children, ...props }) {
  return (
    <button className={`btn ${VARIANTES[variant] ?? "btn-oscuro"} ${size === "small" ? "btn-sm" : ""} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

// Enlace con aspecto de botón
export function ButtonLink({ to, variant = "primary", size, className = "", children, ...props }) {
  return (
    <Link to={to} className={`btn ${VARIANTES[variant] ?? "btn-oscuro"} ${size === "small" ? "btn-sm" : ""} ${className}`.trim()} {...props}>
      {children}
    </Link>
  );
}
