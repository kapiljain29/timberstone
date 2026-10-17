"use client";

import { useState } from "react";
import { Alert, Badge, Box, DataTable, FieldError, LoadError, Pagination, StatusBadge } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { ROLE_API, STATUS } from "@/lib/team";
import { useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const EMPTY = { role_name: "", description: "", all_branches: false, permissions: [] };
const VIEW = "view";

function fromRole(r) {
  return { role_name: r.role_name, description: r.description || "", all_branches: r.all_branches, permissions: [...r.permissions] };
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

export default function RoleMasterPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null = closed; { role, initial, values }
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiData(ROLE_API.list, { page, limit: PAGE_SIZE, search: debouncedSearch || undefined });
  const master = useApiData(ROLE_API.master);
  const modules = master.data?.modules || [];
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const statusToggle = useStatusToggle(ROLE_API.status, list.reload);
  const can = useCan();

  const items = list.data?.items || [];
  const values = form?.values;
  const sortedKeys = (v) => JSON.stringify({ ...v, permissions: [...v.permissions].sort() });
  const dirty = form && sortedKeys(form.values) !== sortedKeys(form.initial);

  function set(key, value) {
    setForm((f) => ({ ...f, values: { ...f.values, [key]: value } }));
  }

  function openForm(role) {
    save.reset();
    const initial = role ? fromRole(role) : EMPTY;
    setForm({ role, initial, values: initial });
  }

  async function closeForm() {
    if (
      dirty &&
      !(await confirm({
        title: form.role ? "Discard your changes?" : "Discard this new role?",
        message: "What you've entered will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      }))
    ) {
      return;
    }
    setForm(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    const { role } = form;
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
    const saved = await save.submit(() =>
      role ? api.post(ROLE_API.update, { id: role.id, ...values }) : api.post(ROLE_API.create, values)
    );
    if (saved) {
      setForm(null);
      list.reload();
    }
  }

  function toggleRole(r) {
    statusToggle.run(r, {
      name: r.role_name,
      deactivate: "It can no longer be given to team members. You can activate it again later.",
      activate: "It can be given to team members again.",
    });
  }

  const accessSummary = (r) =>
    r.full_access ? (
      <Badge tone="done">Full access</Badge>
    ) : (
      `${new Set(r.permissions.map((p) => p.split(".")[0])).size} of ${modules.length || "…"} modules`
    );

  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Roles &amp; Permissions</h1>
          <p className="wf-sub">What each role can see and do. Changes apply to its team members right away.</p>
        </div>
        {can("roles.add") && (
          <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
            + Add Role
          </button>
        )}
      </div>

      <LoadError error={master.error} onRetry={master.reload} />

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.role ? `Edit Role — ${form.role.role_name}` : "New Role"}>
            <Alert>{save.error}</Alert>
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
            <label className="wf-perm-branches">
              <input
                type="checkbox"
                checked={values.all_branches}
                onChange={(e) => set("all_branches", e.target.checked)}
                disabled={save.submitting}
              />
              <span>
                <strong>All branches</strong> — members see every branch and need no branch assignment.
              </span>
            </label>
            <div className="wf-field">
              <label>Permissions</label>
              {modules.length ? (
                <PermissionMatrix
                  modules={modules}
                  permissions={values.permissions}
                  onChange={(permissions) => set("permissions", permissions)}
                  disabled={save.submitting}
                />
              ) : (
                <div className="wf-empty">Loading modules…</div>
              )}
              <FieldError>{save.fieldErrors.permissions}</FieldError>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={closeForm} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Saving…" : form.role ? "Save Changes" : "Add Role"}
              </button>
            </div>
          </Box>
        </form>
      )}

      <Box
        title={`Roles (${list.data?.pagination.total ?? "…"})`}
        right={
          <input
            className="wf-input"
            style={{ width: 220 }}
            type="search"
            placeholder="Search roles"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        }
      >
        <LoadError error={list.error} onRetry={list.reload} />
        <Alert>{statusToggle.error}</Alert>
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading roles…</div>
        ) : (
          !list.error && (
            <DataTable
              columns={["Role", "Description", "Branches", "Access", "Members", "Status", ""]}
              emptyLabel={debouncedSearch ? "No roles match this search." : "No roles yet."}
              rows={items.map((r) => [
                <span key="n">
                  <strong>{r.role_name}</strong>
                  {r.is_system && (
                    <>
                      {" "}
                      <Badge tone="idle">System</Badge>
                    </>
                  )}
                </span>,
                r.description || "—",
                r.all_branches ? "All branches" : "Assigned",
                <span key="p">{accessSummary(r)}</span>,
                r.user_count,
                <StatusBadge key="s" active={r.status === STATUS.ACTIVE} />,
                r.full_access ? (
                  <span key="x" className="wf-perm-na">
                    Always full access
                  </span>
                ) : (
                  <div key="x" className="wf-btn-row">
                    {can("roles.edit") && (
                      <button type="button" className="wf-link-btn" onClick={() => openForm(r)}>
                        Edit
                      </button>
                    )}
                    {can("roles.status") && (
                      <button type="button" className="wf-link-btn" onClick={() => toggleRole(r)} disabled={statusToggle.submitting}>
                        {r.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                ),
              ])}
            />
          )
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
      {confirmDialog}
      {statusToggle.confirmDialog}
    </div>
  );
}
