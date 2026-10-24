"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Box, BranchFilter, DataTable, FilterPanel, LoadError, Pagination, SearchField, TabBar } from "@/components/ui";
import { ApprovalSummary } from "@/components/ApprovalSummary";
import { formatDateTime } from "@/lib/format";
import { APPROVAL_API, APPROVAL_STATUS, approvalStatusTone, optionLabel, useApprovalMaster, useBranchTabs } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { useListFilters } from "@/lib/useListFilters";

const PAGE_SIZE = 20;
const FILTERS = { branch: "all", search: "", approval_status: APPROVAL_STATUS.PENDING, type: "" };

// Approvals — requests waiting for Management / Owner (e.g. booking a lead
// without its full token). Opens on Pending; ?status= picks another tab
// (all = every status). Approvers see every request in their branches;
// others only their own (and their team's).
export default function ApprovalsPage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading…</div>}>
      <Approvals />
    </Suspense>
  );
}

function Approvals() {
  const params = useSearchParams();
  const status = params.get("status");
  const filters = useListFilters(FILTERS, status ? { approval_status: status === "all" ? "" : status } : undefined);
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(values.branch);
  const { master, error: masterError, reload: reloadMaster } = useApprovalMaster();
  const list = useApiData(
    APPROVAL_API.list,
    {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      approval_status: values.approval_status || undefined,
      type: values.type || undefined,
    },
    { branchId }
  );
  const items = list.data?.items || [];
  const statusTabs = [
    { value: APPROVAL_STATUS.PENDING, label: "Pending", tag: list.data ? list.data.pending : undefined },
    ...(master?.approval_statuses || []).filter((s) => s.value !== APPROVAL_STATUS.PENDING),
    { value: "", label: "All" },
  ];

  return (
    <div>
      <div className="wf-crumb">Overview</div>
      <h1 className="wf-h1">Approvals</h1>
      <p className="wf-sub">Requests that need Management or the Owner to approve before they take effect.</p>

      <LoadError error={masterError} onRetry={reloadMaster} />

      {branchTabs.show && (
        <BranchFilter
          branches={branchTabs.options}
          allLabel={branchTabs.allLabel}
          value={values.branch}
          onChange={(value) => filters.set("branch", value)}
        />
      )}

      <TabBar tabs={statusTabs} value={values.approval_status} onChange={(v) => filters.set("approval_status", v)} label="Approval status" />

      <FilterPanel filters={filters}>
        <SearchField id="approval-search" value={values.search} onChange={(v) => filters.set("search", v)} placeholder="Lead name or company" />
        <div className="wf-field">
          <label htmlFor="approval-filter-type">Request Type</label>
          <select id="approval-filter-type" className="wf-select" value={values.type} onChange={(e) => filters.set("type", e.target.value)}>
            <option value="">All Types</option>
            {(master?.types || []).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </FilterPanel>

      <Box title={`Approval Requests (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading approvals…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Request", "Branch", "Details", "Requested By", "Requested On", "Status", ""]}
              emptyLabel={values.approval_status === APPROVAL_STATUS.PENDING ? "Nothing waiting for approval." : "No requests match these filters."}
              rows={items.map((a) => [
                <strong key="t">{a.title}</strong>,
                a.branch_name || "—",
                <ApprovalSummary key="d" approval={a} />,
                a.requested_by_name || "—",
                formatDateTime(a.created_at),
                <Badge key="s" tone={approvalStatusTone(a.approval_status)}>
                  {optionLabel(master?.approval_statuses, a.approval_status)}
                </Badge>,
                <Link key="o" href={`/approvals/${a.id}`} className="wf-link-btn">
                  {a.can_decide ? "Review →" : "Open →"}
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
