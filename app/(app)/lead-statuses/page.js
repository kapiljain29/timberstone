"use client";

import { useState } from "react";
import { Box, DataTable, FieldError, LoadError, Pagination, StatusBadge } from "@/components/ui";
import { LEAD_STATUS_API, STATUS } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const STATUS_FILTERS = { all: undefined, active: STATUS.ACTIVE, inactive: STATUS.INACTIVE };

export default function LeadStatusesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null = closed; { id: null, name } = add; { id, name } = edit
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiData(LEAD_STATUS_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: STATUS_FILTERS[statusFilter],
  });
  const save = useSubmit();
  const statusToggle = useStatusToggle(LEAD_STATUS_API.status, list);
  const can = useCan();

  const items = list.data?.items || [];

  function openForm(leadStatus) {
    save.reset();
    setForm(leadStatus ? { id: leadStatus.id, name: leadStatus.name } : { id: null, name: "" });
  }

  async function handleSave(e) {
    e.preventDefault();
    const { id, name } = form;
    const saved = await save.post(id ? LEAD_STATUS_API.update : LEAD_STATUS_API.create, id ? { id, name } : { name });
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

  // Any filter change goes back to page 1.
  function filter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
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

      <Box
        title={`Lead Statuses (${listTotal(list)})`}
        right={
          <div className="wf-btn-row">
            <input
              className="wf-input"
              style={{ width: 220 }}
              type="search"
              placeholder="Search lead statuses"
              value={search}
              onChange={(e) => filter(setSearch)(e.target.value)}
            />
            <select className="wf-select" style={{ width: "auto" }} value={statusFilter} onChange={(e) => filter(setStatusFilter)(e.target.value)}>
              <option value="all">Any Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        }
      >
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading lead statuses…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Lead Status", "Updated By", "Status", ""]}
              emptyLabel={
                debouncedSearch || statusFilter !== "all" ? "No lead statuses match these filters." : "No lead statuses yet. Add the first one."
              }
              rows={items.map((s) => [
                <strong key="n">{s.name}</strong>,
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
