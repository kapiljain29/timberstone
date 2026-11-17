"use client";

import Link from "next/link";
import { Badge, Box, BranchFilter, DataTable, FilterPanel, LoadError, Pagination, SearchField, TabBar } from "@/components/ui";
import { formatAmount, formatDate } from "@/lib/format";
import { ORDER_API, orderStageTone, useOrderMaster } from "@/lib/orders";
import { optionLabel, useBranchTabs } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { useListFilters } from "@/lib/useListFilters";

const PAGE_SIZE = 20;
const FILTERS = { branch: "all", tab: "pending", search: "" };
const TABS = [
  { value: "pending", label: "Awaiting Order" },
  { value: "ordered", label: "Orders" },
];

// Orders — leads whose client approved the Final Quotation (POST
// /api/admin/orders/list, Orders & Payments → View): "Awaiting Order" =
// collecting the advance / ready for the order (Accounts creates it);
// "Orders" = created, collecting the payment before dispatch / ready to
// dispatch. A row opens the lead's Order & Payments (/orders/[leadId]).
export default function OrdersPage() {
  const filters = useListFilters(FILTERS);
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(values.branch);
  const { master } = useOrderMaster();
  const ordered = values.tab === "ordered";
  const list = useApiData(ORDER_API.list, { page, limit: PAGE_SIZE, ordered, search: search || undefined }, { branchId });
  const items = list.data?.items || [];

  return (
    <div>
      <div className="wf-crumb">Site Execution</div>
      <h1 className="wf-h1">Orders</h1>
      <p className="wf-sub">Approved Final Quotations: the advance, the order, and the payment before dispatch.</p>

      {branchTabs.show && (
        <BranchFilter branches={branchTabs.options} allLabel={branchTabs.allLabel} value={values.branch} onChange={(value) => filters.set("branch", value)} />
      )}
      <TabBar tabs={TABS} value={values.tab} onChange={(value) => filters.set("tab", value)} label="Orders" />

      <FilterPanel filters={filters}>
        <SearchField
          id="order-search"
          value={values.search}
          onChange={(v) => filters.set("search", v)}
          placeholder="Customer, mobile, quotation or order no."
        />
      </FilterPanel>

      <Box title={`${ordered ? "Orders" : "Awaiting Order"} (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading orders…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={[
                "Customer",
                ordered ? "Order" : "Quotation",
                "Branch",
                "Grand Total",
                "Received",
                ordered ? "Due Before Dispatch" : "Advance Due",
                "Stage",
                "",
              ]}
              emptyLabel={
                filters.active ? "No orders match these filters." : ordered ? "No orders yet." : "No approved Final Quotations waiting for an order."
              }
              rows={items.map((o) => [
                <div key="c">
                  <strong>{o.company_name || o.full_name}</strong>
                  <div className="wf-sub">{[o.company_name && o.full_name, o.site_code].filter(Boolean).join(" · ")}</div>
                </div>,
                <div key="q">
                  {ordered ? o.order.order_no : o.revision_ref_no}
                  <div className="wf-sub">{ordered ? `Created ${formatDate(o.order.created_at)}` : `Approved ${formatDate(o.approved_at)}`}</div>
                </div>,
                o.branch_name || "—",
                formatAmount(o.plan.grand_total),
                formatAmount(o.plan.paid),
                formatAmount(ordered ? o.plan.dispatch_remaining : o.plan.advance_remaining),
                <Badge key="s" tone={orderStageTone(o.plan.stage)}>
                  {optionLabel(master?.order_stages, o.plan.stage) || o.plan.stage}
                </Badge>,
                <Link key="o" href={`/orders/${o.lead_id}`} className="wf-link-btn">
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
