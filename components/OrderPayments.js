"use client";

// A lead's Order & Payments card (POST /api/admin/orders/summary, Orders &
// Payments → View) — on the lead page, the site page and the Orders screen.
// Once the client approved the Final Quotation it shows the quotation's
// lines and the order parts placed from them (components/OrderParts.js —
// samples, Place Order) and the lead's payment plan (all amounts from the
// API):
//   1. Advance — advance_pct of the total before GST, the booking token
//      included → then the first order part can be placed;
//   2. Before dispatch — dispatch_pct more plus all the GST → the parts
//      can be dispatched.
// Record Payment (Payments → Add) adds the customer's
// payments; the list shows every payment, token included. A payment counts
// only once Accounts marks it received (Payments screen, /payments).

import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, Badge, Box, DataTable, Detail, DetailGroup, FieldError, LoadError, ProgressBar } from "@/components/ui";
import OrderParts from "@/components/OrderParts";
import PaymentStatusBadge from "@/components/PaymentStatusBadge";
import { formatAmount, formatDate, formatDateTime, todayDate } from "@/lib/format";
import { ORDER_API, ORDER_PAYMENT_TYPE, ORDER_STAGE, orderStageTone, useOrderMaster } from "@/lib/orders";
import { PAYMENT_STATUS } from "@/lib/payments";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, optionLabel } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

/**
 * leadId — the lead; refreshKey — change it to reload (e.g. after the
 * Final Quotation was approved on the same page); onChanged() — after a
 * payment, a sample or an order part (e.g. to reload the Delivery Challans).
 */
export default function OrderPayments({ leadId, refreshKey = 0, onChanged }) {
  const can = useCan();
  const summary = useApiData(can("orders.view") ? ORDER_API.summary : null, { lead_id: leadId }, { branchId: ALL_BRANCHES });
  const { master } = useOrderMaster();
  const [paying, setPaying] = useState(false);
  const { reload } = summary;

  useEffect(() => {
    if (refreshKey) reload();
  }, [refreshKey, reload]);

  if (!can("orders.view")) return null;
  const s = summary.data;
  const plan = s?.plan;
  const stageLabel = plan ? optionLabel(master?.order_stages, plan.stage) || plan.stage : null;
  // Recorded but not yet confirmed by Accounts — not in the plan yet.
  const pending = (s?.payments || []).filter((p) => p.payment_status === PAYMENT_STATUS.PENDING);
  const pendingTotal = pending.reduce((sum, p) => sum + p.amount, 0);

  const changed = (updated) => {
    summary.patch(() => updated);
    onChanged?.();
  };

  return (
    <Box title="Order & Payments" right={plan && <Badge tone={orderStageTone(plan.stage)}>{stageLabel}</Badge>}>
      <LoadError error={summary.error} onRetry={summary.reload} />
      {!s ? (
        !summary.error && <div className="wf-empty">Loading order…</div>
      ) : !plan ? (
        <div className="wf-empty">Payments start once the client approves the Final Quotation.</div>
      ) : (
        <>
          <StageNote plan={plan} orders={s.orders} canCreate={can("orders.add")} />
          {pending.length > 0 && (
            <Alert tone="info">
              {`${formatAmount(pendingTotal)} recorded (${pending.length} ${pending.length === 1 ? "payment" : "payments"}) is waiting for Accounts to confirm it is received — it counts toward the plan once confirmed. `}
              {can("payments.view") && (
                <Link href="/payments" className="wf-link-btn">
                  Open Payments →
                </Link>
              )}
            </Alert>
          )}

          <DetailGroup title="Approved Final Quotation">
            <Detail label="Quotation">
              {s.quotation.pdf_url ? (
                <a href={s.quotation.pdf_url} target="_blank" rel="noopener noreferrer" className="wf-link-btn">
                  {s.quotation.revision_ref_no} ↗
                </a>
              ) : (
                s.quotation.revision_ref_no
              )}
            </Detail>
            <Detail label="Approved">{formatDateTime(s.quotation.approved_at)}</Detail>
            <Detail label="Total (before GST)">{formatAmount(plan.order_amount)}</Detail>
            <Detail label="GST">{formatAmount(plan.gst_amount)}</Detail>
            <Detail label="Grand Total">
              <strong>{formatAmount(plan.grand_total)}</strong>
            </Detail>
          </DetailGroup>

          <OrderParts leadId={leadId} summary={s} onChanged={changed} />

          <PaymentSchedule plan={plan} />

          {!paying && can("payments.add") && (
            <div className="wf-actions-end">
              <button type="button" className="wf-btn primary" onClick={() => setPaying(true)}>
                Record Payment
              </button>
            </div>
          )}

          {paying && (
            <PaymentForm
              leadId={leadId}
              master={master}
              plan={plan}
              hasOrder={s.orders.length > 0}
              onCancel={() => setPaying(false)}
              onSaved={(updated) => {
                setPaying(false);
                changed(updated);
              }}
            />
          )}
        </>
      )}

      {s && s.payments.length > 0 && (
        <div className="wf-field">
          <label>Payments ({s.payments.length})</label>
          <DataTable
            columns={["Received On", "For", "Amount", "Reference No.", "Recorded By", "Status"]}
            rows={s.payments.map((p) => [
              formatDate(p.paid_on),
              optionLabel(master?.payment_types, p.payment_type) || p.payment_type,
              <strong key="a">{formatAmount(p.amount)}</strong>,
              p.reference_no || "—",
              p.created_by_name || "—",
              <PaymentStatusBadge key="st" payment={p} />,
            ])}
          />
        </div>
      )}
    </Box>
  );
}

// How each instalment is described (the amounts come from the API).
const INSTALLMENTS = {
  advance: { title: "Advance", when: "Before the order is placed — the booking token counts" },
  dispatch: { title: "Before dispatch", when: "Before the material leaves" },
  progress: { title: "On progress", when: "When 50% of the work is done" },
  handover: { title: "On handover", when: "Before the final coat" },
  remaining: { title: "Remaining", when: "During and after the work" },
};

// The payment plan as a schedule: each instalment's own amount, what is
// received against it (payments fill them in order), the balance and its
// status; plus the overall progress.
function PaymentSchedule({ plan }) {
  const percent = plan.grand_total ? Math.min(Math.round((plan.paid / plan.grand_total) * 100), 100) : 0;
  // The first instalment not fully paid is the one due now.
  const dueIndex = plan.installments.findIndex((i) => i.balance > 0);
  const status = (inst, index) => {
    if (inst.balance <= 0) return <Badge tone="done">Received</Badge>;
    if (index === dueIndex) return <Badge tone="pending">{inst.received > 0 ? "Part paid — due next" : "Due next"}</Badge>;
    return <Badge tone="idle">Upcoming</Badge>;
  };

  return (
    <div className="wf-field">
      <label>Payment Schedule</label>
      <div className="wf-pay-progress">
        <span>
          <strong>{formatAmount(plan.paid)}</strong> received of {formatAmount(plan.grand_total)} · <strong>{formatAmount(plan.balance)}</strong> balance
        </span>
        <span>{percent}%</span>
      </div>
      <ProgressBar percent={percent} />
      <DataTable
        columns={["Instalment", "When", "Amount", "Received", "Balance", "Status"]}
        align={[null, null, "right", "right", "right", null]}
        rows={plan.installments.map((inst, index) => [
          <div key="t">
            <strong>{`${INSTALLMENTS[inst.key]?.title || inst.key} — ${inst.percent}%${inst.gst ? " + GST" : ""}`}</strong>
            <div className="wf-sub">
              {inst.gst ? `${formatAmount(inst.amount - inst.gst)} + GST ${formatAmount(inst.gst)}` : `${inst.percent}% of ${formatAmount(plan.order_amount)}`}
            </div>
          </div>,
          INSTALLMENTS[inst.key]?.when || "—",
          formatAmount(inst.amount),
          inst.received ? formatAmount(inst.received) : "—",
          inst.balance ? <strong key="b">{formatAmount(inst.balance)}</strong> : "—",
          <span key="s">{status(inst, index)}</span>,
        ])}
      />
    </div>
  );
}

// What happens next, for the current stage of the lead's order.
function StageNote({ plan, orders, canCreate }) {
  const parts = `${orders.length} order ${orders.length === 1 ? "part" : "parts"}`;
  const toOrder = plan.has_order && !plan.fully_ordered ? " Some lines are still to be ordered." : "";
  const challans = orders.reduce((sum, o) => sum + o.challan_count, 0);
  const delivered = orders.reduce((sum, o) => sum + o.delivered_count, 0);
  if (plan.stage === ORDER_STAGE.AWAITING_ADVANCE) {
    return (
      <Alert tone="info">{`Collect ${formatAmount(plan.advance_remaining)} more to complete the advance (${plan.advance_pct}% of the total before GST, token included). Then the order can be placed.`}</Alert>
    );
  }
  if (plan.stage === ORDER_STAGE.READY_FOR_ORDER) {
    return (
      <Alert tone="info">
        {canCreate ? "The advance is received — place the order (all lines at once, or in parts)." : "The advance is received — Accounts places the order next."}
      </Alert>
    );
  }
  if (plan.stage === ORDER_STAGE.AWAITING_DISPATCH_PAYMENT) {
    return (
      <Alert tone="info">{`${parts} placed. Collect ${formatAmount(plan.dispatch_remaining)} more (${plan.dispatch_pct}% + GST) before the material is dispatched.${toOrder}`}</Alert>
    );
  }
  if (plan.stage === ORDER_STAGE.READY_TO_DISPATCH) {
    return <Alert tone="info">{`Payment before dispatch received — ${parts} ready to dispatch. Accounts sends each with Delivery Challans.${toOrder}`}</Alert>;
  }
  if (plan.stage === ORDER_STAGE.PARTLY_DISPATCHED) {
    return (
      <Alert tone="info">{`Dispatch in progress — ${challans} ${challans === 1 ? "challan" : "challans"} sent across ${parts}, ${delivered} confirmed delivered.${toOrder}`}</Alert>
    );
  }
  if (plan.stage === ORDER_STAGE.DISPATCHED) {
    return <Alert tone="info">{`Every line is ordered and dispatched — ${delivered} of ${challans} challans confirmed delivered by the site's supervisor.`}</Alert>;
  }
  if (plan.stage === ORDER_STAGE.SHORT_DELIVERED) {
    return (
      <Alert tone="error">
        Every challan is confirmed on site, but some items arrived short. Accounts sends the missing items from Delivery Challans (Send Missing
        Items).
      </Alert>
    );
  }
  return <Alert tone="info">{`Every order part is delivered — all ${challans} challans confirmed on site.`}</Alert>;
}

// Records one customer payment toward the order.
function PaymentForm({ leadId, master, plan, hasOrder, onCancel, onSaved }) {
  const save = useSubmit();
  // The instalment due next (an older order's "remaining" part is paid as
  // progress); its balance is the suggested amount.
  const recordable = Object.values(ORDER_PAYMENT_TYPE);
  const balanceOf = (type) => plan.installments.find((i) => i.key === type)?.balance || 0;
  const next = plan.installments.find((i) => i.balance > 0);
  const firstType = next && recordable.includes(next.key) ? next.key : hasOrder ? ORDER_PAYMENT_TYPE.PROGRESS : ORDER_PAYMENT_TYPE.ADVANCE;
  const firstAmount = next ? next.balance : 0;
  const [form, setForm] = useState({
    payment_type: firstType,
    amount: firstAmount > 0 ? String(firstAmount) : "",
    paid_on: todayDate(),
    reference_no: "",
    remark: "",
  });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const types = (master?.payment_types || []).filter((t) => Object.values(ORDER_PAYMENT_TYPE).includes(t.value));

  async function handleSubmit(e) {
    e.preventDefault();
    const updated = await save.post(
      ORDER_API.recordPayment,
      {
        lead_id: leadId,
        payment_type: form.payment_type,
        amount: form.amount === "" ? undefined : Number(form.amount),
        paid_on: form.paid_on || undefined,
        reference_no: form.reference_no.trim() || undefined,
        remark: form.remark.trim() || undefined,
      },
      { branchId: ALL_BRANCHES }
    );
    if (updated) onSaved(updated);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="wf-subform">
      <div className="wf-grid wf-grid-2">
        <div className="wf-field">
          <label htmlFor="pay-type">Payment For</label>
          <select
            id="pay-type"
            className="wf-select"
            required
            value={form.payment_type}
            onChange={(e) => {
              // Suggest the picked instalment's balance.
              const balance = balanceOf(e.target.value);
              setForm((f) => ({ ...f, payment_type: e.target.value, amount: balance > 0 ? String(balance) : f.amount }));
            }}
            disabled={save.submitting}
          >
            {types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <FieldError>{save.fieldErrors.payment_type}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="pay-amount">Amount (₹)</label>
          <input
            id="pay-amount"
            type="number"
            min="1"
            step="any"
            inputMode="decimal"
            required
            className="wf-input"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.amount}</FieldError>
        </div>
      </div>
      <div className="wf-grid wf-grid-3">
        <div className="wf-field">
          <label htmlFor="pay-date">Received On</label>
          <input id="pay-date" type="date" required max={todayDate()} className="wf-input" value={form.paid_on} onChange={(e) => set("paid_on", e.target.value)} disabled={save.submitting} />
          <FieldError>{save.fieldErrors.paid_on}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="pay-ref">Reference No.</label>
          <input
            id="pay-ref"
            className="wf-input"
            maxLength={100}
            placeholder="UTR / cheque no."
            value={form.reference_no}
            onChange={(e) => set("reference_no", e.target.value)}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.reference_no}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="pay-remark">Remark</label>
          <input id="pay-remark" className="wf-input" maxLength={1000} value={form.remark} onChange={(e) => set("remark", e.target.value)} disabled={save.submitting} />
          <FieldError>{save.fieldErrors.remark}</FieldError>
        </div>
      </div>
      <FieldError>{save.fieldErrors.lead_id}</FieldError>
      <div className="wf-actions-end">
        <button type="button" className="wf-btn" onClick={onCancel} disabled={save.submitting}>
          Cancel
        </button>
        <button type="submit" className="wf-btn primary" disabled={save.submitting}>
          Record Payment
        </button>
      </div>
    </form>
  );
}
