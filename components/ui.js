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

export function DataTable({ columns, rows, emptyLabel = "No records yet." }) {
  if (!rows || rows.length === 0) {
    return <div className="wf-empty">{emptyLabel}</div>;
  }
  return (
    <div className="wf-table-wrap">
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

export function CheckboxGroup({ label, options, values = [], onChange, disabled = false }) {
  function toggle(option) {
    if (disabled) return;
    const next = values.includes(option) ? values.filter((v) => v !== option) : [...values, option];
    onChange?.(next);
  }
  return (
    <div className="wf-field">
      {label && <label>{label}</label>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px" }}>
        {options.map((o) => (
          <label key={o} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={values.includes(o)} onChange={() => toggle(o)} disabled={disabled} />
            {o}
          </label>
        ))}
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
