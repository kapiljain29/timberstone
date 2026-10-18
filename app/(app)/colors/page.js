"use client";

import { useState } from "react";
import { Box, DataTable, FieldError, FilterPanel, LoadError, Pagination, SearchField, StatusBadge, StatusFilterField } from "@/components/ui";
import { COLOR_API, STATUS } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { statusParam, useListFilters } from "@/lib/useListFilters";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const FILTERS = { search: "", status: "all" };
const emptyForm = { id: null, name: "", code: "" };

export default function ColorsPage() {
  const filters = useListFilters(FILTERS);
  const { page, setPage } = filters;
  const [form, setForm] = useState(null); // null = closed; { id: null, ... } = add; { id, ... } = edit
  const debouncedSearch = useDebouncedValue(filters.values.search.trim());

  const list = useApiData(COLOR_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusParam(filters.values.status),
  });
  const save = useSubmit();
  const statusToggle = useStatusToggle(COLOR_API.status, list);
  const can = useCan();

  const items = list.data?.items || [];

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openForm(color) {
    save.reset();
    setForm(color ? { id: color.id, name: color.name, code: color.code || "" } : emptyForm);
  }

  async function handleSave(e) {
    e.preventDefault();
    const { id, name, code } = form;
    const saved = await save.post(id ? COLOR_API.update : COLOR_API.create, id ? { id, name, code } : { name, code });
    if (saved) {
      setForm(null);
      list.reload();
    }
  }

  function toggleColor(c) {
    statusToggle.run(c, {
      name: c.name,
      deactivate: "It will be hidden from Color dropdowns, so it can't be picked for new records. Records already using it keep it. You can activate it again later.",
      activate: "It will appear in Color dropdowns again.",
    });
  }

  return (
    <div>
      <div className="wf-crumb">Masters</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Colors</h1>
          <p className="wf-sub">Finish colors offered on products, with an optional code (hex, RAL or shade number).</p>
        </div>
        {can("colors.add") && (
          <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
            + Add Color
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.id ? "Edit Color" : "New Color"}>
            <div className="wf-grid wf-grid-3">
              <div className="wf-field">
                <label htmlFor="color-name">Color Name</label>
                <input
                  id="color-name"
                  required
                  autoFocus
                  className="wf-input"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Royal Blue"
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.name}</FieldError>
              </div>
              <div className="wf-field">
                <label htmlFor="color-code">Color Code</label>
                <input
                  id="color-code"
                  className="wf-input"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value)}
                  placeholder="Optional, e.g. #4169E1 or RAL 5002"
                  maxLength={50}
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.code}</FieldError>
              </div>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setForm(null)} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Saving…" : form.id ? "Save Changes" : "Add Color"}
              </button>
            </div>
          </Box>
        </form>
      )}

      <FilterPanel filters={filters}>
        <SearchField id="color-search" value={filters.values.search} onChange={(v) => filters.set("search", v)} placeholder="Search name or code" />
        <StatusFilterField id="color-status" value={filters.values.status} onChange={(v) => filters.set("status", v)} />
      </FilterPanel>

      <Box title={`Colors (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading colors…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Color", "Code", "Updated By", "Status", ""]}
              emptyLabel={filters.active ? "No colors match these filters." : "No colors yet. Add the first one."}
              rows={items.map((c) => [
                <strong key="n">{c.name}</strong>,
                c.code || "—",
                c.updated_by_name || "—",
                <StatusBadge key="s" active={c.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  {can("colors.edit") && (
                    <button type="button" className="wf-link-btn" onClick={() => openForm(c)}>
                      Edit
                    </button>
                  )}
                  {can("colors.status") && (
                    <button type="button" className="wf-link-btn" onClick={() => toggleColor(c)} disabled={statusToggle.submitting}>
                      {c.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
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
