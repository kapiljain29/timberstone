"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Box, BranchFilter, DataTable, FilterPanel, LoadError, Pagination, SearchField, leadStatusTone } from "@/components/ui";
import LeadAssignForm from "@/components/LeadAssignForm";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useCan } from "@/lib/roles";
import { LEAD_API, optionLabel, useBranchTabs, useLeadMaster } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { useListFilters } from "@/lib/useListFilters";

const PAGE_SIZE = 20;
// assigned: "any" | "unassigned" (a lead manager's queue) | a team member id.
const FILTERS = {
  branch: "all",
  search: "",
  status: "",
  lead_source_id: "",
  assigned: "any",
  project_type: "",
  budget: "",
  planning_to_start: "",
  work_type: "",
};

// ?branch=<id> preselects the branch tab; ?assigned=unassigned opens the
// unassigned queue.
export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading…</div>}>
      <Leads />
    </Suspense>
  );
}

function Leads() {
  const params = useSearchParams();
  const filters = useListFilters(FILTERS, {
    ...(params.get("branch") && { branch: params.get("branch") }),
    ...(params.get("assigned") && { assigned: params.get("assigned") }),
  });
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const can = useCan();
  const canAssign = can("leads.assign");

  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(values.branch);
  const { master, error: masterError, reload: reloadMaster } = useLeadMaster(branchId);
  const list = useApiData(
    LEAD_API.list,
    {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      status: values.status || undefined,
      lead_source_id: values.lead_source_id || undefined,
      unassigned: values.assigned === "unassigned" || undefined,
      assigned_to: ["any", "unassigned"].includes(values.assigned) ? undefined : values.assigned,
      project_type: values.project_type || undefined,
      budget: values.budget || undefined,
      planning_to_start: values.planning_to_start || undefined,
      work_type: values.work_type || undefined,
    },
    { branchId }
  );

  const items = list.data?.items || [];
  // Ticked rows for "Assign to…" — only those still on the current page.
  const [ticked, setTicked] = useState([]);
  const selected = ticked.filter((id) => items.some((l) => l.id === id));
  const allTicked = items.length > 0 && selected.length === items.length;

  function toggle(id) {
    setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  }

  const addHref = branchId === values.branch ? `/leads/new?branch=${encodeURIComponent(branchId)}` : "/leads/new";

  return (
    <div>
      <div className="wf-crumb">Pre-Sales</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Leads</h1>
          <p className="wf-sub">
            Steps 1–3: Lead Creation, Initial Contact &amp; Rough Estimate, Measurement Booking &amp; Advance Payment.
          </p>
        </div>
        {can("leads.add") && (
          <Link href={addHref} className="wf-btn primary" style={{ marginBottom: 18 }}>
            + New Lead
          </Link>
        )}
      </div>

      <LoadError error={masterError} onRetry={reloadMaster} />

      {branchTabs.show && (
        <BranchFilter
          branches={branchTabs.options}
          allLabel={branchTabs.allLabel}
          value={values.branch}
          onChange={(value) => filters.set("branch", value)}
        />
      )}

      <FilterPanel filters={filters}>
        <SearchField
          id="lead-search"
          value={values.search}
          onChange={(v) => filters.set("search", v)}
          placeholder="Name, mobile, email or company"
        />
        <FilterSelect id="lead-filter-status" label="Status" value={values.status} onChange={(v) => filters.set("status", v)} allLabel="Any Status">
          {(master?.lead_statuses || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect
          id="lead-filter-source"
          label="Lead Source"
          value={values.lead_source_id}
          onChange={(v) => filters.set("lead_source_id", v)}
          allLabel="All Sources"
        >
          {(master?.lead_sources || []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.lead_source_name}
            </option>
          ))}
        </FilterSelect>
        <div className="wf-field">
          <label htmlFor="lead-filter-assigned">Assigned To</label>
          <select id="lead-filter-assigned" className="wf-select" value={values.assigned} onChange={(e) => filters.set("assigned", e.target.value)}>
            <option value="any">Anyone</option>
            {canAssign && <option value="unassigned">Unassigned</option>}
            {(master?.assignees || []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        {[
          ["project_type", "Project Type", master?.project_types],
          ["work_type", "Type of Property", master?.work_types],
          ["budget", "Budget", master?.budgets],
          ["planning_to_start", "Planning to Start", master?.planning_to_start],
        ].map(([key, label, options]) => (
          <FilterSelect key={key} id={`lead-filter-${key}`} label={label} value={values[key]} onChange={(v) => filters.set(key, v)} allLabel="Any">
            {(options || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </FilterSelect>
        ))}
      </FilterPanel>

      {canAssign && selected.length > 0 && (
        <LeadAssignForm
          leadIds={selected}
          branchId={branchId}
          master={master}
          onCancel={() => setTicked([])}
          onAssigned={() => {
            setTicked([]);
            list.reload();
          }}
        />
      )}

      <Box title={`${values.assigned === "unassigned" ? "Unassigned Leads" : "Leads"} (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading leads…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={[
                ...(canAssign
                  ? [
                      <input
                        key="all"
                        type="checkbox"
                        aria-label="Select all leads on this page"
                        checked={allTicked}
                        onChange={() => setTicked(allTicked ? [] : items.map((l) => l.id))}
                      />,
                    ]
                  : []),
                "Lead",
                "Mobile",
                "Branch",
                "Source",
                "Budget",
                "Assigned To",
                "Status",
                "Created",
                "",
              ]}
              emptyLabel="No leads match these filters."
              rows={items.map((l) => [
                ...(canAssign
                  ? [
                      <input
                        key="c"
                        type="checkbox"
                        aria-label={`Select ${l.full_name}`}
                        checked={selected.includes(l.id)}
                        onChange={() => toggle(l.id)}
                      />,
                    ]
                  : []),
                <div key="n">
                  <strong>{l.full_name}</strong>
                  {l.company_name && <div className="wf-sub">{l.company_name}</div>}
                </div>,
                formatPhone(l.country_code, l.mobile_number),
                l.branch_name || "—",
                [l.lead_source_name, l.lead_sub_source_name].filter(Boolean).join(" / ") || "—",
                optionLabel(master?.budgets, l.budget),
                l.assignees.map((a) => a.name).join(", ") || <Badge key="u">Unassigned</Badge>,
                l.status_name ? (
                  <Badge key="s" tone={leadStatusTone(l.status_name)}>
                    {l.status_name}
                  </Badge>
                ) : (
                  "—"
                ),
                formatDate(l.created_at),
                <Link key="o" href={`/leads/${l.id}`} className="wf-link-btn">
                  Open →
                </Link>,
              ])}
            />
          )
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
    </div>
  );
}

// Labelled select for the filter panel; "" = no filter (allLabel).
function FilterSelect({ id, label, value, onChange, allLabel, children }) {
  return (
    <div className="wf-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="wf-select" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {children}
      </select>
    </div>
  );
}
