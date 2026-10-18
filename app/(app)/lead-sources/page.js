"use client";

import { useState } from "react";
import { Box, DataTable, FieldError, LoadError, Pagination, StatusBadge } from "@/components/ui";
import { LEAD_SOURCE_API, STATUS, useLeadSourceOptions } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const emptyForm = { id: null, lead_source_name: "", parent_id: "", short_code: "" };

export default function LeadSourcesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null = closed; { id: null, ... } = add; { id, ... } = edit
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiData(LEAD_SOURCE_API.list, { page, limit: PAGE_SIZE, search: debouncedSearch || undefined });
  const parents = useLeadSourceOptions();
  const save = useSubmit();
  const statusToggle = useStatusToggle(LEAD_SOURCE_API.status, list, parents.reload);
  const can = useCan();

  const items = list.data?.items || [];
  // A lead source can't be its own parent; the API also refuses its own sub-lead sources.
  const parentOptions = (parents.options || []).filter((s) => s.id !== form?.id);
  const parentMissing = form?.parent_id && !parentOptions.some((s) => s.id === form.parent_id);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openForm(source) {
    save.reset();
    setForm(
      source
        ? {
            id: source.id,
            lead_source_name: source.lead_source_name,
            parent_id: source.parent_id || "",
            short_code: source.short_code || "",
            // Shown in the dropdown when the parent isn't in /master (inactive, or itself a sub-lead source).
            parent_name: source.parent_name,
          }
        : emptyForm
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    const { id, lead_source_name, parent_id, short_code } = form;
    const body = { lead_source_name, parent_id: parent_id || null, short_code };
    const saved = await save.post(id ? LEAD_SOURCE_API.update : LEAD_SOURCE_API.create, id ? { id, ...body } : body);
    if (saved) {
      setForm(null);
      list.reload();
      parents.reload();
    }
  }

  function toggleLeadSource(s) {
    statusToggle.run(s, {
      name: s.lead_source_name,
      deactivate: `It will be hidden from Lead Source dropdowns, so new leads can't be given this source. Leads already from it keep it${
        s.sub_lead_source_count ? `, and its ${s.sub_lead_source_count} sub-source(s) keep their own status` : ""
      }. You can activate it again later.`,
      activate: "It will appear in Lead Source dropdowns again.",
    });
  }

  return (
    <div>
      <div className="wf-crumb">Masters</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Lead Sources</h1>
          <p className="wf-sub">Where leads come from — main sources (e.g. Meta) and their sub-sources (e.g. Instagram).</p>
        </div>
        {can("lead_sources.add") && (
          <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
            + Add Lead Source
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.id ? "Edit Lead Source" : "New Lead Source"}>
            <div className="wf-grid wf-grid-3">
              <div className="wf-field">
                <label htmlFor="ls-name">Lead Source Name</label>
                <input
                  id="ls-name"
                  required
                  className="wf-input"
                  value={form.lead_source_name}
                  onChange={(e) => set("lead_source_name", e.target.value)}
                  placeholder="e.g. Instagram"
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.lead_source_name}</FieldError>
              </div>
              <div className="wf-field">
                <label htmlFor="ls-parent">Parent Lead Source</label>
                <select
                  id="ls-parent"
                  className="wf-select"
                  value={form.parent_id}
                  onChange={(e) => set("parent_id", e.target.value)}
                  disabled={save.submitting || !parents.options}
                >
                  <option value="">{parents.options ? "None — main lead source" : "Loading…"}</option>
                  {parentMissing && <option value={form.parent_id}>{form.parent_name || "Current parent"}</option>}
                  {parentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.lead_source_name}
                    </option>
                  ))}
                </select>
                <FieldError>{save.fieldErrors.parent_id || (parents.error && parents.error.message)}</FieldError>
              </div>
              <div className="wf-field">
                <label htmlFor="ls-code">Short Code</label>
                <input
                  id="ls-code"
                  className="wf-input"
                  value={form.short_code}
                  onChange={(e) => set("short_code", e.target.value)}
                  placeholder="Optional, e.g. ig"
                  maxLength={20}
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.short_code}</FieldError>
              </div>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setForm(null)} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Saving…" : form.id ? "Save Changes" : "Add Lead Source"}
              </button>
            </div>
          </Box>
        </form>
      )}

      <Box
        title={`Lead Sources (${listTotal(list)})`}
        right={
          <input
            className="wf-input"
            style={{ width: 220 }}
            type="search"
            placeholder="Search lead sources"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        }
      >
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading lead sources…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Lead Source", "Parent", "Short Code", "Sub-sources", "Status", ""]}
              emptyLabel={debouncedSearch ? "No lead sources match this search." : "No lead sources yet. Add the first one."}
              rows={items.map((s) => [
                <strong key="n">{s.lead_source_name}</strong>,
                s.parent_name || "— Main —",
                s.short_code || "—",
                s.sub_lead_source_count,
                <StatusBadge key="s" active={s.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  {can("lead_sources.edit") && (
                    <button type="button" className="wf-link-btn" onClick={() => openForm(s)}>
                      Edit
                    </button>
                  )}
                  {can("lead_sources.status") && (
                    <button type="button" className="wf-link-btn" onClick={() => toggleLeadSource(s)} disabled={statusToggle.submitting}>
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
