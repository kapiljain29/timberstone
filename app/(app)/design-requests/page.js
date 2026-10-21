"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Box, BranchFilter, DataTable, FilterPanel, LoadError, Pagination, SearchField } from "@/components/ui";
import { DesignStatusBadge } from "@/components/DesignRequestView";
import { formatDateTime } from "@/lib/format";
import { DESIGN_API, useBranchTabs, useDesignMaster } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { useListFilters } from "@/lib/useListFilters";

const PAGE_SIZE = 20;
const FILTERS = { branch: "all", search: "", design_status: "" };

// Design Requests — leads Sales sent to the design team. A designer sees the
// ones assigned to them (plus whatever their data scope allows).
// ?status=<design_status> preselects the status filter.
export default function DesignRequestsPage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading…</div>}>
      <DesignRequests />
    </Suspense>
  );
}

function DesignRequests() {
  const params = useSearchParams();
  const filters = useListFilters(FILTERS, params.get("status") ? { design_status: params.get("status") } : undefined);
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(values.branch);
  const { master, error: masterError, reload: reloadMaster } = useDesignMaster(branchId);
  const list = useApiData(
    DESIGN_API.list,
    { page, limit: PAGE_SIZE, search: search || undefined, design_status: values.design_status || undefined },
    { branchId }
  );
  const items = list.data?.items || [];

  return (
    <div>
      <div className="wf-crumb">Pre-Sales</div>
      <h1 className="wf-h1">Design Requests</h1>
      <p className="wf-sub">Leads sent to the design team. Open one to read the brief and upload the JPEG / DWG design files.</p>

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
        <SearchField id="design-search" value={values.search} onChange={(v) => filters.set("search", v)} placeholder="Lead name or company" />
        <div className="wf-field">
          <label htmlFor="design-filter-status">Status</label>
          <select
            id="design-filter-status"
            className="wf-select"
            value={values.design_status}
            onChange={(e) => filters.set("design_status", e.target.value)}
          >
            <option value="">Any Status</option>
            {(master?.design_statuses || []).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </FilterPanel>

      <Box title={`Design Requests (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading design requests…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Lead", "Branch", "Designer", "Sent By", "Uploads", "Status", "Last Update", ""]}
              emptyLabel="No design requests match these filters."
              rows={items.map((r) => [
                <div key="n">
                  <strong>{r.lead_name}</strong>
                  {r.lead_company_name && <div className="wf-sub">{r.lead_company_name}</div>}
                </div>,
                r.branch_name || "—",
                r.designer_name,
                r.requested_by_name || "—",
                r.round || "—",
                <DesignStatusBadge key="s" master={master} status={r.design_status} />,
                formatDateTime(r.updated_at),
                <Link key="o" href={`/design-requests/${r.id}`} className="wf-link-btn">
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
