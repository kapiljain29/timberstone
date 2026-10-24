"use client";

import { useState } from "react";
import { Box, DataTable, FieldError, FilterPanel, LoadError, Pagination, SearchField, StatusBadge, StatusFilterField } from "@/components/ui";
import { LEAD_STATUS_API, STATUS } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { statusParam, useListFilters } from "@/lib/useListFilters";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const FILTERS = { search: "", status: "all" };

export default function LeadStatusesPage() {
  const filters = useListFilters(FILTERS);
  const { page, setPage } = filters;
  // null = closed; { id: null, name, needs_follow_up } = add; with an id = edit.
  const [form, setForm] = useState(null);
  const debouncedSearch = useDebouncedValue(filters.values.search.trim());

  const list = useApiData(LEAD_STATUS_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusParam(filters.values.status),
  });
  const save = useSubmit();
  const statusToggle = useStatusToggle(LEAD_STATUS_API.status, list);
  const can = useCan();

  const items = list.data?.items || [];

  function openForm(leadStatus) {
    save.reset();
    setForm(
      leadStatus
        ? { id: leadStatus.id, name: leadStatus.name, needs_follow_up: leadStatus.needs_follow_up, needs_token: leadStatus.needs_token }
        : { id: null, name: "", needs_follow_up: false, needs_token: false }
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    const { id, name, needs_follow_up, needs_token } = form;
    const saved = await save.post(id ? LEAD_STATUS_API.update : LEAD_STATUS_API.create, {
      ...(id && { id }),
      name,
      needs_follow_up,
      needs_token,
    });
    if (saved) {
      setForm(null);
      list.reload();
    }
  }

  function toggleLeadStatus(s) {
    statusToggle.run(s, {
      name: s.name,
      deactivate: "It will be hidden from Lead Status dropdowns, so leads can't be moved to it. Leads already in it keep it. You can activate it again later.",
      activate: "It will appear in Lead Status dropdowns again.",
    });
  }

  return (
    <div>
      <div className="wf-crumb">Masters</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Lead Statuses</h1>
          <p className="wf-sub">The stages a lead moves through — e.g. New, Followup, Booked, Lost.</p>
        </div>
        {can("lead_statuses.add") && (
          <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
            + Add Lead Status
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.id ? "Edit Lead Status" : "New Lead Status"}>
            <div className="wf-grid wf-grid-3">
              <div className="wf-field">
                <label htmlFor="lst-name">Lead Status Name</label>
                <input
                  id="lst-name"
                  required
                  autoFocus
                  className="wf-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Followup"
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.name}</FieldError>
              </div>
            </div>
            <div className="wf-field">
              <label className="wf-check-option">
                <input
                  type="checkbox"
                  checked={form.needs_follow_up}
                  onChange={(e) => setForm((f) => ({ ...f, needs_follow_up: e.target.checked }))}
                  disabled={save.submitting}
                />
                <span>
                  <strong>Needs next follow-up date</strong> — moving a lead to this status asks when to call next, and the
                  lead comes back to its callers&apos; Call Queue then (e.g. Followup, Showroom Visit Fixed).
                </span>
              </label>
              <FieldError>{save.fieldErrors.needs_follow_up}</FieldError>
            </div>
            <div className="wf-field">
              <label className="wf-check-option">
                <input
                  type="checkbox"
                  checked={form.needs_token}
                  onChange={(e) => setForm((f) => ({ ...f, needs_token: e.target.checked }))}
                  disabled={save.submitting}
                />
                <span>
                  <strong>Needs token amount</strong> — moving a lead to this status asks for the token received (at least the
                  minimum in Site Settings → Sales &amp; Bookings), or Management&apos;s approval to go without it (e.g. Booked).
                </span>
              </label>
              <FieldError>{save.fieldErrors.needs_token}</FieldError>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setForm(null)} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Saving…" : form.id ? "Save Changes" : "Add Lead Status"}
              </button>
            </div>
          </Box>
        </form>
      )}

      <FilterPanel filters={filters}>
        <SearchField id="lst-search" value={filters.values.search} onChange={(v) => filters.set("search", v)} placeholder="Search lead statuses" />
        <StatusFilterField id="lst-status" value={filters.values.status} onChange={(v) => filters.set("status", v)} />
      </FilterPanel>

      <Box title={`Lead Statuses (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading lead statuses…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Lead Status", "Next Follow-up", "Token", "Updated By", "Status", ""]}
              emptyLabel={
                filters.active ? "No lead statuses match these filters." : "No lead statuses yet. Add the first one."
              }
              rows={items.map((s) => [
                <strong key="n">{s.name}</strong>,
                s.needs_follow_up ? "Asked" : "—",
                s.needs_token ? "Required" : "—",
                s.updated_by_name || "—",
                <StatusBadge key="s" active={s.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  {can("lead_statuses.edit") && (
                    <button type="button" className="wf-link-btn" onClick={() => openForm(s)}>
                      Edit
                    </button>
                  )}
                  {can("lead_statuses.status") && (
                    <button type="button" className="wf-link-btn" onClick={() => toggleLeadStatus(s)} disabled={statusToggle.submitting}>
                      {s.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
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
