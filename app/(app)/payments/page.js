"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Box, BranchFilter, DataTable, FieldError, FilterPanel, LoadError, Pagination, SearchField, StatCard, TabBar } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import PaymentStatusBadge from "@/components/PaymentStatusBadge";
import { formatAmount, formatDate, formatDateTime } from "@/lib/format";
import { PAYMENT_API, PAYMENT_STATUS, usePaymentMaster } from "@/lib/payments";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, optionLabel, useBranchTabs } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { useListFilters } from "@/lib/useListFilters";

const PAGE_SIZE = 20;
const FILTERS = { branch: "all", payment_status: PAYMENT_STATUS.PENDING, search: "", payment_type: "", from_date: "", to_date: "" };

// Payments — every customer payment (POST /api/admin/payments/list,
// Payments → View): the token given when a lead is Booked and the order's
// payments. Each one is recorded pending; Accounts (Payments → Confirm)
// marks it received — only then does it count and what waits for it runs
// (the lead is booked, the order moves on) — or rejects it with the
// reason. Opens on Pending; ?status= picks another tab (all = every one).
export default function PaymentsPage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading…</div>}>
      <Payments />
    </Suspense>
  );
}

function Payments() {
  const params = useSearchParams();
  const status = params.get("status");
  const filters = useListFilters(FILTERS, status ? { payment_status: status === "all" ? "" : status } : undefined);
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(values.branch);
  const { master, error: masterError, reload: reloadMaster } = usePaymentMaster();
  const can = useCan();
  const review = useSubmit({ fieldErrorsInToast: true });
  const [confirm, confirmDialog] = useConfirm();
  const [rejecting, setRejecting] = useState(null);

  const list = useApiData(
    PAYMENT_API.list,
    {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      payment_status: values.payment_status || undefined,
      payment_type: values.payment_type || undefined,
      from_date: values.from_date || undefined,
      to_date: values.to_date || undefined,
    },
    { branchId }
  );
  const items = list.data?.items || [];
  const counts = list.data?.counts;
  const amounts = list.data?.amounts;
  const tabs = [
    { value: PAYMENT_STATUS.PENDING, label: "Pending", tag: counts?.pending },
    { value: PAYMENT_STATUS.RECEIVED, label: "Received", tag: counts?.received },
    { value: PAYMENT_STATUS.REJECTED, label: "Rejected", tag: counts?.rejected },
    { value: "", label: "All" },
  ];
  const customer = (p) => p.company_name || p.full_name;
  const typeLabel = (p) => optionLabel(master?.payment_types, p.payment_type) || p.payment_type;

  async function markReceived(p) {
    const ok = await confirm({
      title: `Mark ${formatAmount(p.amount)} from ${customer(p)} received?`,
      message:
        `Only confirm once the money is in the account (${p.reference_no ? `ref. ${p.reference_no}, ` : ""}received on ${formatDate(p.paid_on)}). ` +
        `It then counts toward the ${typeLabel(p).toLowerCase()}${p.on_received_label ? ` and the lead is booked (${p.on_received_label.toLowerCase()})` : ""}, and ${p.created_by_name || "whoever recorded it"} is notified. This can't be undone.`,
      confirmLabel: "Mark Received",
      tone: "primary",
    });
    if (!ok) return;
    const updated = await review.post(PAYMENT_API.review, { id: p.id, decision: PAYMENT_STATUS.RECEIVED }, { branchId: ALL_BRANCHES });
    if (updated) list.reload();
  }

  return (
    <div>
      <div className="wf-crumb">Site Execution</div>
      <h1 className="wf-h1">Payments</h1>
      <p className="wf-sub">Every customer payment. A payment counts — and the lead is booked or the order moves on — only once Accounts marks it received.</p>

      <LoadError error={masterError} onRetry={reloadMaster} />

      {amounts && (
        <div className="wf-cards">
          <StatCard value={counts.pending} label="Waiting for confirmation" color="var(--pending-text)" />
          <StatCard value={formatAmount(amounts.pending)} label="Pending amount" />
          <StatCard value={formatAmount(amounts.received)} label="Received" color="var(--done-text)" />
        </div>
      )}

      {branchTabs.show && (
        <BranchFilter branches={branchTabs.options} allLabel={branchTabs.allLabel} value={values.branch} onChange={(value) => filters.set("branch", value)} />
      )}

      <TabBar tabs={tabs} value={values.payment_status} onChange={(v) => filters.set("payment_status", v)} label="Payment status" />

      <FilterPanel filters={filters}>
        <SearchField
          id="payment-search"
          value={values.search}
          onChange={(v) => filters.set("search", v)}
          placeholder="Customer, mobile, reference, site or order no."
        />
        <div className="wf-grid wf-grid-3">
          <div className="wf-field">
            <label htmlFor="payment-filter-type">Payment For</label>
            <select id="payment-filter-type" className="wf-select" value={values.payment_type} onChange={(e) => filters.set("payment_type", e.target.value)}>
              <option value="">All</option>
              {(master?.payment_types || []).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="wf-field">
            <label htmlFor="payment-filter-from">Received From</label>
            <input id="payment-filter-from" type="date" className="wf-input" value={values.from_date} onChange={(e) => filters.set("from_date", e.target.value)} />
          </div>
          <div className="wf-field">
            <label htmlFor="payment-filter-to">Received To</label>
            <input id="payment-filter-to" type="date" className="wf-input" value={values.to_date} onChange={(e) => filters.set("to_date", e.target.value)} />
          </div>
        </div>
      </FilterPanel>

      <Box title={`Payments (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading payments…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Customer", "For", "Amount", "Reference", "Received On", "Recorded By", "Status", ""]}
              align={[null, null, "right", null, null, null, null, null]}
              emptyLabel={filters.active ? "No payments match these filters." : values.payment_status === PAYMENT_STATUS.PENDING ? "No payments waiting for confirmation." : "No payments yet."}
              rows={items.map((p) => [
                <div key="c">
                  <Link href={p.order_no ? `/orders/${p.lead_id}` : `/leads/${p.lead_id}`} className="wf-link-btn">
                    <strong>{customer(p)}</strong>
                  </Link>
                  <div className="wf-sub">{[p.company_name && p.full_name, p.branch_name, p.site_code, p.order_no].filter(Boolean).join(" · ")}</div>
                </div>,
                <div key="t">
                  {typeLabel(p)}
                  {p.on_received_label && p.payment_status === PAYMENT_STATUS.PENDING && <div className="wf-sub">On receipt: {p.on_received_label}</div>}
                </div>,
                <strong key="a">{formatAmount(p.amount)}</strong>,
                <div key="m">
                  {p.reference_no || "—"}
                  {p.receipt_url && (
                    <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="wf-link-btn">
                      Receipt ↗
                    </a>
                  )}
                </div>,
                formatDate(p.paid_on),
                <div key="b">
                  {p.created_by_name || "—"}
                  <div className="wf-sub">{formatDateTime(p.created_at)}</div>
                </div>,
                <div key="s">
                  <PaymentStatusBadge payment={p} statuses={master?.payment_statuses} />
                  {p.reviewed_at && <div className="wf-sub">{`${p.reviewed_by_name || "—"}, ${formatDateTime(p.reviewed_at)}`}</div>}
                  {p.review_remark && <div className="wf-sub">“{p.review_remark}”</div>}
                </div>,
                p.can_review && can("payments.confirm") ? (
                  <div key="x">
                    <div>
                      <button type="button" className="wf-link-btn" onClick={() => markReceived(p)} disabled={review.submitting}>
                        Mark Received
                      </button>
                    </div>
                    <div>
                      <button type="button" className="wf-link-btn" onClick={() => setRejecting(p)} disabled={review.submitting}>
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
        {rejecting && (
          <RejectForm
            key={rejecting.id}
            payment={rejecting}
            customer={customer(rejecting)}
            onCancel={() => setRejecting(null)}
            onDone={() => {
              setRejecting(null);
              list.reload();
            }}
          />
        )}
      </Box>
      {confirmDialog}
    </div>
  );
}

// Reject a pending payment, with the reason (required — whoever recorded it
// is told why). Confirmed first.
function RejectForm({ payment, customer, onCancel, onDone }) {
  const [remark, setRemark] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await confirm({
      title: `Reject ${formatAmount(payment.amount)} from ${customer}?`,
      message: `It won't count toward anything${payment.on_received_label ? " and the lead is not booked" : ""}. ${payment.created_by_name || "Whoever recorded it"} is told why. This can't be undone — a correct payment has to be recorded again.`,
      confirmLabel: "Reject",
    });
    if (!ok) return;
    const updated = await save.post(PAYMENT_API.review, { id: payment.id, decision: PAYMENT_STATUS.REJECTED, remark: remark.trim() || null }, { branchId: ALL_BRANCHES });
    if (updated) onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="wf-subform">
      <div className="wf-field">
        <label htmlFor="payment-reject-remark">{`Reason for rejecting ${formatAmount(payment.amount)} from ${customer}`}</label>
        <textarea
          id="payment-reject-remark"
          className="wf-textarea"
          rows={3}
          required
          maxLength={1000}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="e.g. Not credited — cheque bounced"
          disabled={save.submitting}
        />
        <FieldError>{save.fieldErrors.remark}</FieldError>
        <FieldError>{save.fieldErrors.id}</FieldError>
      </div>
      <div className="wf-actions-end">
        <button type="button" className="wf-btn" onClick={onCancel} disabled={save.submitting}>
          Cancel
        </button>
        <button type="submit" className="wf-btn danger" disabled={save.submitting}>
          Reject Payment
        </button>
      </div>
      {confirmDialog}
    </form>
  );
}
