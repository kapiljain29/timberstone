// Reusable low-fidelity "wireframe" UI primitives.
// Plain presentational components — no hooks, so they can be safely
// imported from both server and client components.

export function Box({ title, right, children }) {
  return (
    <div className="wf-box">
      {title && (
        <div className="wf-box-title">
          <span>{title}</span>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Badge({ children, tone = "idle" }) {
  return <span className={`wf-badge ${tone}`}>{children}</span>;
}

export function Placeholder({ label = "[ image / drawing preview ]" }) {
  return <div className="wf-placeholder">{label}</div>;
}

export function UploadBox({ label }) {
  return (
    <div className="wf-upload">
      <div>[ drag file here or click to browse ]</div>
      <div style={{ marginTop: 6 }}>{label}</div>
      <button type="button" className="wf-btn ghost" style={{ marginTop: 10 }}>
        + Choose File
      </button>
    </div>
  );
}

// busy: rows are being reloaded (filters changed or after a save) — they
// are dimmed and can't be clicked until the new rows arrive.
export function DataTable({ columns, rows, emptyLabel = "No records yet.", busy = false }) {
  if (!rows || rows.length === 0) {
    return <div className="wf-empty">{busy ? "Loading…" : emptyLabel}</div>;
  }
  return (
    <div className={`wf-table-wrap${busy ? " busy" : ""}`} aria-busy={busy || undefined}>
      <table className="wf-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Field({ field, value, onChange }) {
  const common = {
    value: value ?? "",
    onChange: (e) => onChange?.(e.target.value),
  };
  return (
    <div className="wf-field">
      <label>{field.label}</label>
      {field.type === "textarea" ? (
        <textarea className="wf-textarea" placeholder={field.placeholder} {...common} />
      ) : field.type === "select" ? (
        <select className="wf-select" {...common}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input className="wf-input" type="text" placeholder={field.placeholder} {...common} />
      )}
    </div>
  );
}

// options: strings, or { value, label } objects (values then holds the
// selected `value`s). error: message shown under the group. required: marks
// the label with *.
export function CheckboxGroup({ label, options, values = [], onChange, disabled = false, error, required = false }) {
  const items = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  function toggle(value) {
    if (disabled) return;
    const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
    onChange?.(next);
  }
  return (
    <div className="wf-field">
      {label && <label className={required ? "wf-required" : undefined}>{label}</label>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px" }}>
        {items.map((o) => (
          <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={values.includes(o.value)} onChange={() => toggle(o.value)} disabled={disabled} />
            {o.label}
          </label>
        ))}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

// Phone input: country code select + national number (digits only).
// countryCodes = the API's country_codes; code "" shows the default code.
// Errors: codeError / numberError from ApiError.fieldErrors.
export function PhoneField({
  id,
  label,
  required = false,
  countryCodes = [],
  code,
  number,
  onCodeChange,
  onNumberChange,
  codeError,
  numberError,
  placeholder,
  disabled = false,
}) {
  return (
    <div className="wf-field">
      <label htmlFor={id} className={required ? "wf-required" : undefined}>
        {label}
      </label>
      <div className="wf-phone-input">
        <select
          className="wf-select"
          aria-label={`${label} country code`}
          value={code}
          onChange={(e) => onCodeChange?.(e.target.value)}
          disabled={disabled || !countryCodes.length}
        >
          {!countryCodes.length && <option value="">…</option>}
          {countryCodes.map((c) => (
            <option key={c.value} value={c.value} title={c.label}>
              {c.iso} {c.value}
            </option>
          ))}
        </select>
        <input
          id={id}
          className="wf-input"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          aria-required={required || undefined}
          value={number}
          placeholder={placeholder}
          onChange={(e) => onNumberChange?.(e.target.value.replace(/\D/g, ""))}
          disabled={disabled}
        />
      </div>
      <FieldError>{codeError || numberError}</FieldError>
    </div>
  );
}

// Validation message under a form field (e.g. ApiError.fieldErrors.email).
export function FieldError({ children }) {
  return children ? <p className="wf-field-error">{children}</p> : null;
}

// Banner message. tone: "error" | "info".
export function Alert({ children, tone = "error" }) {
  return children ? (
    <div className={`wf-alert ${tone}`} role="alert">
      {children}
    </div>
  ) : null;
}

// Load failure for a list / screen: no-access for 403, otherwise the
// ApiError message with a retry button.
export function LoadError({ error, onRetry }) {
  if (!error) return null;
  if (error.status === 403) {
    return <Alert>You don&apos;t have access to this section.</Alert>;
  }
  return (
    <Alert>
      {error.message}{" "}
      {onRetry && (
        <button type="button" className="wf-link-btn" onClick={onRetry}>
          Try again
        </button>
      )}
    </Alert>
  );
}

// Collapsible "Search & Filters" box above a list's table; the header
// toggles it. filters = useListFilters() (lib/useListFilters.js): it starts
// collapsed unless the screen opened with a filter set (e.g. ?department=),
// the header shows how many filters are set, and Reset clears them.
// children = the filter fields (SearchField, StatusFilterField, or a
// select in a .wf-field).
export function FilterPanel({ filters, children }) {
  const { active, reset, openAtStart } = filters;
  return (
    <details className="wf-box wf-filter-panel" open={openAtStart}>
      <summary className="wf-filter-summary">
        <span>Search &amp; Filters</span>
        {active > 0 && <span className="wf-filter-count">{active} active</span>}
      </summary>
      <div className="wf-filter-grid">{children}</div>
      <div className="wf-actions-end">
        <button type="button" className="wf-btn" onClick={reset} disabled={!active}>
          Reset
        </button>
      </div>
    </details>
  );
}

// Labelled text search for a FilterPanel. Extra props go to the <input>.
export function SearchField({ id, label = "Search", value, onChange, ...props }) {
  return (
    <div className="wf-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="wf-input" type="search" value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </div>
  );
}

// Active / Inactive select for a FilterPanel. value: "all" | "1" | "0"
// (the API's record status) — statusParam() in lib/useListFilters.js turns
// it into the list API's `status`.
export function StatusFilterField({ id, value, onChange }) {
  return (
    <div className="wf-field">
      <label htmlFor={id}>Status</label>
      <select id={id} className="wf-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="all">Any Status</option>
        <option value="1">Active</option>
        <option value="0">Inactive</option>
      </select>
    </div>
  );
}

// Active / Inactive badge for records with status 1 / 0.
export function StatusBadge({ active }) {
  return <Badge tone={active ? "done" : "idle"}>{active ? "Active" : "Inactive"}</Badge>;
}

// Prev / next pager for API lists. pagination = the API's pagination meta
// ({ total, page, totalPages, hasPrevPage, hasNextPage }).
export function Pagination({ pagination, onPage, disabled = false }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total, hasPrevPage, hasNextPage } = pagination;
  return (
    <div className="wf-pager">
      <span>
        Page {page} of {totalPages} · {total} records
      </span>
      <div className="wf-btn-row">
        <button type="button" className="wf-btn" disabled={disabled || !hasPrevPage} onClick={() => onPage(page - 1)}>
          ← Prev
        </button>
        <button type="button" className="wf-btn" disabled={disabled || !hasNextPage} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

// Segmented pill control for switching between branch-wise and all-branches
// views within the same panel (Owner/Management can see everything, or
// scope down to one branch, without leaving the page). Controlled component
// — parent owns the selected value so pages can filter their own data.
export function BranchFilter({ branches, value, onChange, allLabel = "All Branches" }) {
  return (
    <div className="wf-branch-filter" role="tablist" aria-label="Filter by branch">
      <button
        type="button"
        role="tab"
        aria-selected={value === "all"}
        className={`wf-branch-filter-btn${value === "all" ? " active" : ""}`}
        onClick={() => onChange?.("all")}
      >
        {allLabel}
      </button>
      {branches.map((b) => (
        <button
          key={b.id}
          type="button"
          role="tab"
          aria-selected={value === b.id}
          className={`wf-branch-filter-btn${value === b.id ? " active" : ""}`}
          onClick={() => onChange?.(b.id)}
        >
          {b.name}
          <span className="wf-branch-filter-tag">{b.tag}</span>
        </button>
      ))}
    </div>
  );
}

export function leadStatusTone(status) {
  if (status === "Booked" || status === "Conducted") return "done";
  if (["Prospect", "Followup", "Contact in Future"].includes(status)) return "pending";
  return "idle";
}

export function Annotation({ children }) {
  return <div className="wf-annot">NOTE (wireframe): {children}</div>;
}

export function ProgressBar({ percent }) {
  return (
    <div className="wf-progress-track">
      <div className="wf-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
