"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, DataTable, FieldError, FilterPanel, LoadError, Pagination, SearchField, StatusBadge, StatusFilterField } from "@/components/ui";
import { DEPARTMENT_API, STATUS, useTeamMaster } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { statusParam, useListFilters } from "@/lib/useListFilters";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const FILTERS = { search: "", status: "all" };
const emptyForm = { id: null, department_name: "", head_id: "", description: "" };

export default function DepartmentsPage() {
  const filters = useListFilters(FILTERS);
  const { page, setPage } = filters;
  const [form, setForm] = useState(null); // null = closed; { id: null, ... } = add; { id, ... } = edit
  const debouncedSearch = useDebouncedValue(filters.values.search.trim());

  const list = useApiData(DEPARTMENT_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusParam(filters.values.status),
  });
  const { master, error: masterError } = useTeamMaster();
  const save = useSubmit();
  const statusToggle = useStatusToggle(DEPARTMENT_API.status, list);
  const can = useCan();

  const items = list.data?.items || [];

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openForm(department) {
    save.reset();
    setForm(
      department
        ? {
            id: department.id,
            department_name: department.department_name,
            head_id: department.head_id || "",
            description: department.description || "",
          }
        : emptyForm
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    const { id, ...fields } = form;
    const body = { ...fields, head_id: fields.head_id || null };
    const saved = await save.post(id ? DEPARTMENT_API.update : DEPARTMENT_API.create, id ? { id, ...body } : body);
    if (saved) {
      setForm(null);
      list.reload();
    }
  }

  function toggleDepartment(d) {
    statusToggle.run(d, {
      name: d.department_name,
      deactivate: `It will be hidden from Department dropdowns, so no new members can be added to it. Its ${d.member_count} active member(s) keep this department. You can activate it again later.`,
      activate: "It will appear in Department dropdowns again, so members can be added to it.",
    });
  }


  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Departments</h1>
          <p className="wf-sub">Set up the departments your team members belong to, and who heads each one.</p>
        </div>
        {can("departments.add") && (
          <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
            + Add Department
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.id ? "Edit Department" : "New Department"}>
            <div className="wf-grid wf-grid-3">
              <div className="wf-field">
                <label htmlFor="dept-name">Department Name</label>
                <input
                  id="dept-name"
                  required
                  className="wf-input"
                  value={form.department_name}
                  onChange={(e) => set("department_name", e.target.value)}
                  placeholder="e.g. Procurement"
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.department_name}</FieldError>
              </div>
              <div className="wf-field">
                <label htmlFor="dept-head">Department Head</label>
                <select
                  id="dept-head"
                  className="wf-select"
                  value={form.head_id}
                  onChange={(e) => set("head_id", e.target.value)}
                  disabled={save.submitting || !master}
                >
                  <option value="">{master ? "Not assigned yet" : "Loading…"}</option>
                  {(master?.users || []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <FieldError>{save.fieldErrors.head_id || (masterError && masterError.message)}</FieldError>
              </div>
              <div className="wf-field">
                <label htmlFor="dept-desc">Responsibilities</label>
                <input
                  id="dept-desc"
                  className="wf-input"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="What this team owns"
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.description}</FieldError>
              </div>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setForm(null)} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Saving…" : "Save Department"}
              </button>
            </div>
          </Box>
        </form>
      )}

      <FilterPanel filters={filters}>
        <SearchField id="dept-search" value={filters.values.search} onChange={(v) => filters.set("search", v)} placeholder="Search departments" />
        <StatusFilterField id="dept-status" value={filters.values.status} onChange={(v) => filters.set("status", v)} />
      </FilterPanel>

      <Box title={`Departments (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading departments…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Department", "Head", "Members", "Responsibilities", "Status", ""]}
              emptyLabel={filters.active ? "No departments match these filters." : "No departments yet. Add the first one."}
              rows={items.map((d) => [
                <strong key="n">{d.department_name}</strong>,
                d.head_name || "—",
                can("team.view") ? (
                  <Link key="m" href={`/team?department=${d.id}`} className="wf-link-btn">
                    {d.member_count} active
                  </Link>
                ) : (
                  `${d.member_count} active`
                ),
                d.description || "—",
                <StatusBadge key="s" active={d.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  {can("departments.edit") && (
                    <button type="button" className="wf-link-btn" onClick={() => openForm(d)}>
                      Edit
                    </button>
                  )}
                  {d.status === STATUS.ACTIVE && can("team.add") && (
                    <Link href={`/team/new?department=${d.id}`} className="wf-link-btn">
                      + Add member
                    </Link>
                  )}
                  {can("departments.status") && (
                    <button type="button" className="wf-link-btn" onClick={() => toggleDepartment(d)} disabled={statusToggle.submitting}>
                      {d.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>,
              ])}
            />
          )
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
      {statusToggle.confirmDialog}
    </div>
  );
}
