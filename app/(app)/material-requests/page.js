"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Box, BranchFilter, DataTable, FilterPanel, LoadError, Pagination, SearchField, StatCard, TabBar } from "@/components/ui";
import { useMaterialRequestDecision } from "@/components/MaterialRequestDecision";
import { formatDateTime } from "@/lib/format";
import { MATERIAL_REQUEST_API, MATERIAL_REQUEST_STATUS, materialRequestTone, sqft } from "@/lib/materialRequests";
import { useBranchTabs } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { useListFilters } from "@/lib/useListFilters";

const PAGE_SIZE = 20;
const FILTERS = { branch: "all", request_status: MATERIAL_REQUEST_STATUS.PENDING, search: "" };

// Material Requests — extra material the sites' supervisors asked for from
// the Supervisor app (POST /api/admin/sites/material-requests/list, Sites
// → View; every site the user can see). The site's Operation Head (or a
// Super Admin — `can_decide`) approves or rejects pending ones here;
// approved quantities can then be ordered on Orders. Opens on Pending;
// ?status= picks another tab (all = every one).
export default function MaterialRequestsPage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading…</div>}>
      <MaterialRequests />
    </Suspense>
  );
}

function MaterialRequests() {
  const params = useSearchParams();
  const status = params.get("status");
  const filters = useListFilters(FILTERS, status ? { request_status: status === "all" ? "" : status } : undefined);
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const branchTabs = useBranchTabs();
  const list = useApiData(
    MATERIAL_REQUEST_API.list,
    { page, limit: PAGE_SIZE, search: search || undefined, request_status: values.request_status || undefined },
    { branchId: branchTabs.branchId(values.branch) }
  );
  const decision = useMaterialRequestDecision(() => list.reload());
  const items = list.data?.items || [];
  const counts = list.data?.counts;
  const tabs = [
    { value: MATERIAL_REQUEST_STATUS.PENDING, label: "Pending", tag: counts?.pending },
    { value: MATERIAL_REQUEST_STATUS.APPROVED, label: "Approved", tag: counts?.approved },
    { value: MATERIAL_REQUEST_STATUS.REJECTED, label: "Rejected", tag: counts?.rejected },
    { value: "", label: "All" },
  ];

  return (
    <div>
      <div className="wf-crumb">Site Execution</div>
      <h1 className="wf-h1">Material Requests</h1>
      <p className="wf-sub">
        Extra material the site supervisors asked for — more of the items quoted to the client. The site&rsquo;s Operation Head approves it, then
        Accounts can order it.
      </p>

      {counts && (
        <div className="wf-cards">
          <StatCard value={counts.to_decide} label="Waiting for your decision" color="var(--pending-text)" />
          <StatCard value={counts.pending} label="Pending in all" />
          <StatCard value={counts.approved} label="Approved" color="var(--done-text)" />
        </div>
      )}

      {branchTabs.show && (
        <BranchFilter branches={branchTabs.options} allLabel={branchTabs.allLabel} value={values.branch} onChange={(value) => filters.set("branch", value)} />
      )}

      <TabBar tabs={tabs} value={values.request_status} onChange={(v) => filters.set("request_status", v)} label="Request status" />

      <FilterPanel filters={filters}>
        <SearchField id="mr-search" value={values.search} onChange={(v) => filters.set("search", v)} placeholder="Site code or name, customer" />
      </FilterPanel>

      <Box title={`Requests (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading requests…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Site", "Items", "Why", "Requested", "Status", ""]}
              emptyLabel={
                filters.active ? "No requests match these filters." : values.request_status === MATERIAL_REQUEST_STATUS.PENDING ? "No requests waiting." : "No requests yet."
              }
              rows={items.map((r) => [
                <div key="s">
                  <Link href={`/sites/${r.site_id}`} className="wf-link-btn">
                    <strong>{`${r.site_code} — ${r.site_name}`}</strong>
                  </Link>
                  {r.customer_name && <div className="wf-sub">{r.customer_name}</div>}
                </div>,
                <div key="i">
                  {r.items.map((i) => (
                    <div key={i.id}>
                      {`${i.product_name} — ${sqft(i.quantity)}`}
                      <div className="wf-sub">{`${i.area_label} · ${i.colour_pattern}`}</div>
                    </div>
                  ))}
                </div>,
                r.reason,
                <div key="b">
                  {r.requested_by_name || "—"}
                  <div className="wf-sub">{formatDateTime(r.created_at)}</div>
                </div>,
                <div key="st">
                  <Badge tone={materialRequestTone(r.request_status)}>{r.status_label}</Badge>
                  {r.decided_at && <div className="wf-sub">{`${r.decided_by_name || "—"}, ${formatDateTime(r.decided_at)}`}</div>}
                  {r.decision_comment && <div className="wf-sub">“{r.decision_comment}”</div>}
                </div>,
                r.can_decide && r.request_status === MATERIAL_REQUEST_STATUS.PENDING ? (
                  <div key="x">
                    <div>
                      <button type="button" className="wf-link-btn" onClick={() => decision.approve(r)} disabled={decision.submitting}>
                        Approve
                      </button>
                    </div>
                    <div>
                      <button type="button" className="wf-link-btn" onClick={() => decision.reject(r)} disabled={decision.submitting}>
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  ""
                ),
              ])}
            />
          )
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
      {decision.dialogs}
    </div>
  );
}
