"use client";

import Link from "next/link";
import { Box, BranchFilter, DataTable, FilterPanel, LoadError, Pagination, SearchField } from "@/components/ui";
import { formatAmount, formatDate } from "@/lib/format";
import { SITE_API, useBranchTabs, useSiteMaster } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { useListFilters } from "@/lib/useListFilters";

const PAGE_SIZE = 20;
const FILTERS = { branch: "all", search: "", operation_head_id: "" };

// Sites — booked leads moved to Site (Move to Site on the lead page), from
// POST /api/admin/sites/list: the user's branches and data scope (sites
// they head or moved, and those of leads they can see).
export default function SitesPage() {
  const filters = useListFilters(FILTERS);
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(values.branch);
  const { master } = useSiteMaster(branchId);
  const list = useApiData(
    SITE_API.list,
    { page, limit: PAGE_SIZE, search: search || undefined, operation_head_id: values.operation_head_id || undefined },
    { branchId }
  );
  const items = list.data?.items || [];

  return (
    <div>
      <div className="wf-crumb">Site Execution</div>
      <h1 className="wf-h1">Sites</h1>
      <p className="wf-sub">Booked leads moved to Site, with their Operation Head.</p>

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
          id="site-search"
          value={values.search}
          onChange={(v) => filters.set("search", v)}
          placeholder="Site code / name, customer or company"
        />
        <div className="wf-field">
          <label htmlFor="site-filter-head">Operation Head</label>
          <select
            id="site-filter-head"
            className="wf-select"
            value={values.operation_head_id}
            onChange={(e) => filters.set("operation_head_id", e.target.value)}
          >
            <option value="">Anyone</option>
            {(master?.operation_heads || []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      </FilterPanel>

      <Box title={`Sites (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading sites…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Site", "Customer", "Branch", "Operation Head", "Tentative Quotation", "Expected Start", "Moved to Site", ""]}
              emptyLabel={filters.active ? "No sites match these filters." : "No sites yet — a Booked lead is moved to Site from its lead page."}
              rows={items.map((s) => [
                <div key="s">
                  <strong>{s.site_code}</strong>
                  <div className="wf-sub">{s.site_name}</div>
                </div>,
                <div key="c">
                  {s.lead?.full_name || "—"}
                  {s.lead?.company_name && <div className="wf-sub">{s.lead.company_name}</div>}
                </div>,
                s.branch_name || "—",
                s.operation_head_name || "—",
                s.lead?.tentative_quotation_amount ? formatAmount(s.lead.tentative_quotation_amount) : "—",
                formatDate(s.expected_start_date),
                formatDate(s.created_at),
                <Link key="o" href={`/sites/${s.id}`} className="wf-link-btn">
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
