"use client";

// Add / edit form for a role — used by the Add Role page
// (/role-master/new) and the Edit Role page (/role-master/edit/[id]). Saves
// through the API and calls onSaved(role); onCancel() runs after the user
// confirms discarding unsaved changes.

import { useState } from "react";
import { Box, FieldError, LoadError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { ROLE_API, useRoleMaster } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

// data_scope "" = the API default for new roles (own).
const EMPTY = { role_name: "", description: "", data_scope: "", permissions: [] };
const VIEW = "view";
const DEFAULT_SCOPE = "own";

function fromRole(r) {
  return {
    role_name: r.role_name,
    description: r.description || "",
    data_scope: r.data_scope,
    permissions: [...r.permissions],
  };
}

// Toggles one "module.action" permission. Granting any action also grants
// View; removing View removes the module's other actions (the API applies
// the same rule).
function togglePermission(permissions, module, action) {
  const key = `${module.key}.${action}`;
  const set = new Set(permissions);
  if (set.has(key)) {
    set.delete(key);
    if (action === VIEW) module.actions.forEach((a) => set.delete(`${module.key}.${a.key}`));
  } else {
    set.add(key);
    set.add(`${module.key}.${VIEW}`);
  }
  return [...set];
}

// Every action of a module on / off.
function toggleModule(permissions, module, on) {
  const keys = module.actions.map((a) => `${module.key}.${a.key}`);
  const set = new Set(permissions);
  keys.forEach((k) => (on ? set.add(k) : set.delete(k)));
  return [...set];
}

/**
 * Module × action checkbox grid. modules = the API's role master
 * ([{ key, label, group, actions: [{ key, label }] }]); permissions =
 * granted "module.action" keys.
 */
function PermissionMatrix({ modules, permissions, onChange, disabled = false }) {
  const columns = [];
  modules.forEach((m) => m.actions.forEach((a) => !columns.some((c) => c.key === a.key) && columns.push(a)));
  const granted = new Set(permissions);
  const groups = [...new Set(modules.map((m) => m.group))];

  return (
    <div className="wf-table-wrap">
      <table className="wf-table wf-perm-matrix">
        <thead>
          <tr>
            <th>Module</th>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            <th>All</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => [
            <tr key={group} className="wf-perm-group">
              <td colSpan={columns.length + 2}>{group}</td>
            </tr>,
            ...modules
              .filter((m) => m.group === group)
              .map((m) => {
                const all = m.actions.every((a) => granted.has(`${m.key}.${a.key}`));
                return (
                  <tr key={m.key}>
                    <td>
                      <strong>{m.label}</strong>
                    </td>
                    {columns.map((c) =>
                      m.actions.some((a) => a.key === c.key) ? (
                        <td key={c.key}>
                          <input
                            type="checkbox"
                            aria-label={`${m.label}: ${c.label}`}
                            checked={granted.has(`${m.key}.${c.key}`)}
                            onChange={() => onChange(togglePermission(permissions, m, c.key))}
                            disabled={disabled}
                          />
                        </td>
                      ) : (
                        <td key={c.key} className="wf-perm-na">
                          —
                        </td>
                      )
                    )}
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`${m.label}: all`}
                        checked={all}
                        onChange={() => onChange(toggleModule(permissions, m, !all))}
                        disabled={disabled}
                      />
                    </td>
                  </tr>
                );
              }),
          ])}
        </tbody>
      </table>
    </div>
  );
}

/**
 * role — the role to edit (/roles/details), or null to add one.
 */
export default function RoleForm({ role = null, onSaved, onCancel }) {
  const [initial] = useState(() => (role ? fromRole(role) : EMPTY));
  const [values, setValues] = useState(initial);
  const { master, error: masterError, reload: reloadMaster } = useRoleMaster();
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  const modules = master?.modules || [];
  const dataScopes = master?.data_scopes || [];
  const scope = values.data_scope || DEFAULT_SCOPE;
  const sortedKeys = (v) => JSON.stringify({ ...v, permissions: [...v.permissions].sort() });
  const dirty = sortedKeys(values) !== sortedKeys(initial);

  function set(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleCancel() {
    if (
      dirty &&
      !(await confirm({
        title: role ? "Discard your changes?" : "Discard this new role?",
        message: "What you've entered will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      }))
    ) {
      return;
    }
    onCancel();
  }

  async function handleSave(e) {
    e.preventDefault();
    if (
      role &&
      role.user_count > 0 &&
      !(await confirm({
        title: `Update access for ${role.role_name}?`,
        message: `The new permissions apply right away to the ${role.user_count} team member${role.user_count === 1 ? "" : "s"} with this role.`,
        confirmLabel: "Save and apply",
        tone: "primary",
      }))
    ) {
      return;
    }
    const body = { ...values, data_scope: values.data_scope || undefined };
    const saved = await save.post(role ? ROLE_API.update : ROLE_API.create, role ? { id: role.id, ...body } : body);
    if (saved) onSaved(saved);
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <LoadError error={masterError} onRetry={reloadMaster} />

      <Box title="Role Details">
        <div className="wf-grid wf-grid-2">
          <div className="wf-field">
            <label htmlFor="role-name">Role Name</label>
            <input
              id="role-name"
              className="wf-input"
              required
              autoFocus
              value={values.role_name}
              onChange={(e) => set("role_name", e.target.value)}
              placeholder="e.g. Senior Sales"
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.role_name}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="role-description">Description</label>
            <input
              id="role-description"
              className="wf-input"
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What this role is for"
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.description}</FieldError>
          </div>
        </div>
        <div className="wf-field">
          <label>Records they see</label>
          <div className="wf-scope-options" role="radiogroup" aria-label="Records they see">
            {dataScopes.map((d) => (
              <label key={d.value} className={`wf-scope-option${scope === d.value ? " active" : ""}`}>
                <input
                  type="radio"
                  name="data_scope"
                  value={d.value}
                  checked={scope === d.value}
                  onChange={() => set("data_scope", d.value)}
                  disabled={save.submitting}
                />
                <span>
                  <strong>{d.label}</strong>
                  <small>{d.description}</small>
                </span>
              </label>
            ))}
          </div>
          <FieldError>{save.fieldErrors.data_scope}</FieldError>
        </div>
      </Box>

      <Box title="Permissions">
        <div className="wf-field">
          {modules.length ? (
            <PermissionMatrix
              modules={modules}
              permissions={values.permissions}
              onChange={(permissions) => set("permissions", permissions)}
              disabled={save.submitting}
            />
          ) : (
            !masterError && <div className="wf-empty">Loading modules…</div>
          )}
          <FieldError>{save.fieldErrors.permissions}</FieldError>
        </div>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={handleCancel} disabled={save.submitting}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : role ? "Save Changes" : "Add Role"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
