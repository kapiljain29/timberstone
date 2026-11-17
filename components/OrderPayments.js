"use client";

// A lead's Order & Payments card (POST /api/admin/orders/summary, Orders &
// Payments → View) — on the lead page, the site page and the Orders screen.
// Once the client approved the Final Quotation it shows what is ordered
// (the approved revision's lines) and the payment plan
// (all amounts from the API):
//   1. Advance — advance_pct of the total before GST, the booking token
//      included → then the order can be created (Create Order, Orders &
//      Payments → Create Order, confirmed);
//   2. Before dispatch — dispatch_pct more plus all the GST → ready to
//      dispatch.
// Record Payment (Orders & Payments → Record Payment) adds the customer's
// payments; the list shows every payment, token included.

import { useEffect, useState } from "react";
import { Alert, Badge, Box, DataTable, Detail, DetailGroup, FieldError, LoadError, ProgressBar } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatAmount, formatDate, formatDateTime, todayDate } from "@/lib/format";
import { ORDER_API, ORDER_PAYMENT_TYPE, ORDER_STAGE, orderStageTone, useOrderMaster } from "@/lib/orders";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, optionLabel } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

/**
 * leadId — the lead; refreshKey — change it to reload (e.g. after the
 * Final Quotation was approved on the same page); onChanged() — after a
 * payment or the order is created (e.g. to reload the Delivery Challans).
 */
export default function OrderPayments({ leadId, refreshKey = 0, onChanged }) {
  const can = useCan();
  const summary = useApiData(can("orders.view") ? ORDER_API.summary : null, { lead_id: leadId }, { branchId: ALL_BRANCHES });
  const { master } = useOrderMaster();
  const create = useSubmit({ fieldErrorsInToast: true });
  const [confirm, confirmDialog] = useConfirm();
  const [paying, setPaying] = useState(false);
  const { reload } = summary;

  useEffect(() => {
    if (refreshKey) reload();
  }, [refreshKey, reload]);

  if (!can("orders.view")) return null;
  const s = summary.data;
  const plan = s?.plan;
  const stageLabel = plan ? optionLabel(master?.order_stages, plan.stage) || plan.stage : null;

  async function createOrder() {
    const ok = await confirm({
      title: `Create the order for ${s.lead.company_name || s.lead.full_name}?`,
      message: `From ${s.quotation.revision_ref_no} — ${formatAmount(plan.grand_total)} incl. GST, with ${plan.advance_pct}% advance / ${plan.dispatch_pct}% + GST before dispatch. The sales team and the site's Operation Head are notified. An order can't be deleted.`,
      confirmLabel: "Create Order",
      tone: "primary",
    });
    if (!ok) return;
    const updated = await create.post(ORDER_API.create, { lead_id: leadId }, { branchId: ALL_BRANCHES });
    if (updated) {
      summary.patch(() => updated);
      onChanged?.();
    }
  }

  return (
    <Box title="Order & Payments" right={plan && <Badge tone={orderStageTone(plan.stage)}>{stageLabel}</Badge>}>
      <LoadError error={summary.error} onRetry={summary.reload} />
      {!s ? (
        !summary.error && <div className="wf-empty">Loading order…</div>
      ) : !plan ? (
        <div className="wf-empty">Payments start once the client approves the Final Quotation.</div>
      ) : (
        <>
          <StageNote plan={plan} order={s.order} canCreate={can("orders.add")} />

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

          {/* What is ordered — the approved quotation's lines, so the order can be placed from here. */}
          <div className="wf-field">
            <label>{`Order Items (${s.items.length})`}</label>
            <DataTable
              columns={["Product", "Category", "Area", "Colour / Pattern", "Quantity (sq.ft)", "Rate (₹/sq.ft)", "Amount"]}
              align={[null, null, null, null, "right", "right", "right"]}
              rows={s.items.map((i) => [
                <strong key="p">{i.product_name}</strong>,
                i.category_name || "—",
                i.area_label,
                i.colour_pattern,
                Number(i.quantity).toLocaleString("en-IN"),
                formatAmount(i.rate),
                formatAmount(i.amount),
              ])}
            />
          </div>

          <PaymentSchedule plan={plan} />

          {s.order && (
            <DetailGroup title={`Order ${s.order.order_no}`}>
              <Detail label="Created">{`${formatDateTime(s.order.created_at)}${s.order.created_by_name ? ` by ${s.order.created_by_name}` : ""}`}</Detail>
              <Detail label="Ready to Dispatch">{s.order.ready_to_dispatch_at ? formatDateTime(s.order.ready_to_dispatch_at) : "Not yet"}</Detail>
              {s.order.note && (
                <Detail label="Note" wide>
                  {s.order.note}
                </Detail>
              )}
            </DetailGroup>
          )}

          {!paying && (can("orders.payment") || (!s.order && can("orders.add"))) && (
            <div className="wf-actions-end">
              {can("orders.payment") && (
                <button type="button" className={`wf-btn${plan.stage === ORDER_STAGE.READY_FOR_ORDER ? "" : " primary"}`} onClick={() => setPaying(true)}>
                  Record Payment
                </button>
              )}
              {!s.order && can("orders.add") && (
                <button
                  type="button"
                  className="wf-btn primary"
                  onClick={createOrder}
                  disabled={create.submitting || plan.stage !== ORDER_STAGE.READY_FOR_ORDER}
                  title={plan.stage === ORDER_STAGE.READY_FOR_ORDER ? undefined : "Complete the advance first"}
                >
                  Create Order
                </button>
              )}
            </div>
          )}

          {paying && (
            <PaymentForm
              leadId={leadId}
              master={master}
              plan={plan}
              hasOrder={Boolean(s.order)}
              onCancel={() => setPaying(false)}
              onSaved={(updated) => {
                setPaying(false);
                summary.patch(() => updated);
                onChanged?.();
              }}
            />
          )}
        </>
      )}

      {s && s.payments.length > 0 && (
        <div className="wf-field">
          <label>Payments ({s.payments.length})</label>
          <DataTable
            columns={["Received On", "For", "Amount", "Mode", "Reference No.", "Recorded By"]}
            rows={s.payments.map((p) => [
              formatDate(p.paid_on),
              optionLabel(master?.payment_types, p.payment_type) || p.payment_type,
              <strong key="a">{formatAmount(p.amount)}</strong>,
              optionLabel(master?.payment_modes, p.payment_mode) || p.payment_mode,
              p.reference_no || "—",
              p.created_by_name || "—",
            ])}
          />
        </div>
      )}
      {confirmDialog}
    </Box>
  );
}

// How each instalment is described (the amounts come from the API).
const INSTALLMENTS = {
  advance: { title: "Advance", when: "Before the order is created — the booking token counts" },
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

// What happens next, for the current stage.
function StageNote({ plan, order, canCreate }) {
  if (plan.stage === ORDER_STAGE.AWAITING_ADVANCE) {
    return (
      <Alert tone="info">{`Collect ${formatAmount(plan.advance_remaining)} more to complete the advance (${plan.advance_pct}% of the total before GST, token included). Then the order can be created.`}</Alert>
    );
  }
  if (plan.stage === ORDER_STAGE.READY_FOR_ORDER) {
    return <Alert tone="info">{canCreate ? "The advance is received — create the order." : "The advance is received — Accounts creates the order next."}</Alert>;
  }
  if (plan.stage === ORDER_STAGE.AWAITING_DISPATCH_PAYMENT) {
    return (
      <Alert tone="info">{`Order ${order.order_no} is created. Collect ${formatAmount(plan.dispatch_remaining)} more (${plan.dispatch_pct}% + GST) before the material is dispatched.`}</Alert>
    );
  }
  if (plan.stage === ORDER_STAGE.READY_TO_DISPATCH) {
    return <Alert tone="info">{`Payment before dispatch received — order ${order.order_no} is ready to dispatch. Accounts sends it with Delivery Challans (one per part).`}</Alert>;
  }
  if (plan.stage === ORDER_STAGE.PARTLY_DISPATCHED) {
    return (
      <Alert tone="info">{`Order ${order.order_no} is partly dispatched — ${order.challan_count} ${order.challan_count === 1 ? "part" : "parts"} sent, ${order.delivered_count} confirmed delivered. Accounts sends the rest, or marks it fully dispatched.`}</Alert>
    );
  }
  if (plan.stage === ORDER_STAGE.DISPATCHED) {
    return (
      <Alert tone="info">{`Every part of order ${order.order_no} is dispatched — ${order.delivered_count} of ${order.challan_count} challans confirmed delivered by the site's supervisor.`}</Alert>
    );
  }
  return <Alert tone="info">{`Order ${order.order_no} is delivered — every challan confirmed on site.`}</Alert>;
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
    payment_mode: "",
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
        payment_mode: form.payment_mode || undefined,
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
      <div className="wf-grid wf-grid-3">
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
        <div className="wf-field">
          <label htmlFor="pay-mode">Payment Mode</label>
          <select id="pay-mode" className="wf-select" required value={form.payment_mode} onChange={(e) => set("payment_mode", e.target.value)} disabled={save.submitting}>
            <option value="">Select…</option>
            {(master?.payment_modes || []).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <FieldError>{save.fieldErrors.payment_mode}</FieldError>
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
