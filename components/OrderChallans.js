"use client";

// A lead's Delivery Challans card (POST /api/admin/challans/for-order,
// Delivery Challans → View) — next to Order & Payments on the lead, site
// and order pages, once the order exists. Accounts (Delivery Challans →
// Add) dispatches the order in parts: each challan has its lines (the
// approved quotation's products or free text, quantity, unit), dispatch
// date, vehicle and driver; ticking "last part" marks the order fully
// dispatched. The site's supervisor confirms each delivery in the
// Supervisor app — the list shows its status and confirmation photos.

import { useEffect, useState } from "react";
import { Alert, Badge, Box, DataTable, Detail, DetailGroup, FieldError, ImageGallery, LoadError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDate, formatDateTime, todayDate } from "@/lib/format";
import { CHALLAN_API, challanStatusTone, useChallanMaster } from "@/lib/challans";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, optionLabel } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

const EMPTY_LINE = { product_id: "", item_name: "", quantity: "", unit: "" };

/**
 * leadId — the lead; refreshKey — change it to reload (e.g. after a payment
 * on the same page made the order ready to dispatch); onChanged() — after a
 * challan or marking the order fully dispatched (the order's stage changes).
 */
export default function OrderChallans({ leadId, refreshKey = 0, onChanged }) {
  const can = useCan();
  const data = useApiData(can("challans.view") ? CHALLAN_API.forOrder : null, { lead_id: leadId }, { branchId: ALL_BRANCHES });
  const { master } = useChallanMaster();
  const [creating, setCreating] = useState(false);
  const complete = useSubmit({ fieldErrorsInToast: true });
  const [confirm, confirmDialog] = useConfirm();
  const { reload } = data;

  useEffect(() => {
    if (refreshKey) reload();
  }, [refreshKey, reload]);

  // Nothing to show before the order exists.
  if (!can("challans.view") || (data.data && !data.data.order)) return null;
  const d = data.data;

  // The last part went out without being marked as the last one.
  async function completeDispatch() {
    const ok = await confirm({
      title: `Mark ${d.order.order_no} fully dispatched?`,
      message: `Use this when the last part is already sent (${d.challans.length} ${d.challans.length === 1 ? "challan" : "challans"} so far). No more challans can be added afterwards.`,
      confirmLabel: "Mark Fully Dispatched",
      tone: "primary",
    });
    if (!ok) return;
    const updated = await complete.post(CHALLAN_API.completeDispatch, { lead_id: leadId }, { branchId: ALL_BRANCHES });
    if (updated) {
      data.patch(() => updated);
      onChanged?.();
    }
  }

  return (
    <Box
      title={`Delivery Challans${d ? ` (${d.challans.length})` : ""}`}
      right={
        d?.can_dispatch &&
        can("challans.add") &&
        !creating && (
          <button type="button" className="wf-link-btn" onClick={() => setCreating(true)}>
            + Create Challan
          </button>
        )
      }
    >
      <LoadError error={data.error} onRetry={data.reload} />
      {!d ? (
        !data.error && <div className="wf-empty">Loading challans…</div>
      ) : (
        <>
          {!d.can_dispatch && d.blocked_reason && <Alert tone="info">{d.blocked_reason}</Alert>}
          {d.can_complete && can("challans.add") && !creating && (
            <Alert tone="info">
              {`${d.challans.length} ${d.challans.length === 1 ? "part" : "parts"} sent so far. Is that everything? `}
              <button type="button" className="wf-link-btn" onClick={completeDispatch} disabled={complete.submitting}>
                Mark Fully Dispatched
              </button>
            </Alert>
          )}
          {creating && (
            <ChallanForm
              leadId={leadId}
              orderNo={d.order.order_no}
              products={d.products}
              units={master?.units || []}
              onCancel={() => setCreating(false)}
              onSaved={(updated) => {
                setCreating(false);
                data.patch(() => updated);
                onChanged?.();
              }}
            />
          )}
          {d.challans.length === 0 ? (
            !creating && <div className="wf-empty">No challans yet — the order is sent in one or more parts, each with its own challan.</div>
          ) : (
            d.challans.map((c) => <ChallanView key={c.id} challan={c} master={master} />)
          )}
        </>
      )}
      {confirmDialog}
    </Box>
  );
}

// One challan: what was sent, and its delivery confirmation.
function ChallanView({ challan: c, master }) {
  const delivered = c.delivered_at;
  return (
    <div className="wf-field">
      <DetailGroup title={`${c.challan_no}${c.completes_dispatch ? " · last part" : ""}`}>
        <Detail label="Status">
          <Badge tone={challanStatusTone(c.delivery_status)}>{optionLabel(master?.delivery_statuses, c.delivery_status) || c.delivery_status}</Badge>
        </Detail>
        <Detail label="Dispatched">{`${formatDate(c.dispatch_date)}${c.created_by_name ? ` by ${c.created_by_name}` : ""}`}</Detail>
        <Detail label="Vehicle / Driver">{[c.vehicle_no, c.driver_name].filter(Boolean).join(" · ") || "—"}</Detail>
        {delivered && <Detail label="Delivered">{`${formatDateTime(c.delivered_at)}${c.delivered_by_name ? ` — confirmed by ${c.delivered_by_name}` : ""}`}</Detail>}
        {c.note && (
          <Detail label="Note" wide>
            {c.note}
          </Detail>
        )}
        {c.delivery_remark && (
          <Detail label="Supervisor's Note" wide>
            {c.delivery_remark}
          </Detail>
        )}
      </DetailGroup>
      <DataTable
        columns={["Material", "Quantity", "Unit"]}
        rows={c.items.map((i) => [i.item_name, Number(i.quantity).toLocaleString("en-IN"), i.unit])}
      />
      {delivered && (
        <div className="wf-grid wf-grid-2">
          <div className="wf-field">
            <label>Signed Challan</label>
            <ImageGallery images={c.signed_challan} />
          </div>
          <div className="wf-field">
            <label>Material on Site</label>
            <ImageGallery images={c.material_photos} emptyLabel="No photos." />
          </div>
        </div>
      )}
    </div>
  );
}

// Accounts dispatches a part of the order.
function ChallanForm({ leadId, orderNo, products, units, onCancel, onSaved }) {
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const [form, setForm] = useState({
    dispatch_date: todayDate(),
    vehicle_no: "",
    driver_name: "",
    note: "",
    completes_dispatch: false,
    // Starts with one line per product of the approved quotation.
    items: products.length ? products.map((p) => ({ ...EMPTY_LINE, product_id: p.product_id, item_name: p.product_name })) : [{ ...EMPTY_LINE }],
  });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setLine = (index, patch) => setForm((f) => ({ ...f, items: f.items.map((l, i) => (i === index ? { ...l, ...patch } : l)) }));

  // Picking a product names the line after it; "Other" leaves the name free.
  function pickProduct(index, productId) {
    const product = products.find((p) => p.product_id === productId);
    setLine(index, { product_id: productId, item_name: product ? product.product_name : "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await confirm({
      title: form.completes_dispatch ? `Dispatch the last part of ${orderNo}?` : `Dispatch a part of ${orderNo}?`,
      message: `A Delivery Challan is created and the site's supervisor is asked to confirm the delivery.${
        form.completes_dispatch ? " The order is marked fully dispatched — no more challans can be added." : ""
      } A challan can't be edited afterwards.`,
      confirmLabel: "Create Challan",
      tone: "primary",
    });
    if (!ok) return;
    const updated = await save.post(
      CHALLAN_API.create,
      {
        lead_id: leadId,
        dispatch_date: form.dispatch_date || undefined,
        vehicle_no: form.vehicle_no.trim() || undefined,
        driver_name: form.driver_name.trim() || undefined,
        note: form.note.trim() || undefined,
        completes_dispatch: form.completes_dispatch,
        items: form.items.map((l) => ({
          product_id: l.product_id || null,
          item_name: l.item_name,
          quantity: l.quantity === "" ? undefined : Number(l.quantity),
          unit: l.unit,
        })),
      },
      { branchId: ALL_BRANCHES }
    );
    if (updated) onSaved(updated);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="wf-subform">
      <div className="wf-grid wf-grid-3">
        <div className="wf-field">
          <label htmlFor="dc-date">Dispatch Date</label>
          <input id="dc-date" type="date" required max={todayDate()} className="wf-input" value={form.dispatch_date} onChange={(e) => set("dispatch_date", e.target.value)} disabled={save.submitting} />
          <FieldError>{save.fieldErrors.dispatch_date}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="dc-vehicle">Vehicle No.</label>
          <input id="dc-vehicle" className="wf-input" maxLength={30} placeholder="e.g. RJ14 GB 4521" value={form.vehicle_no} onChange={(e) => set("vehicle_no", e.target.value)} disabled={save.submitting} />
          <FieldError>{save.fieldErrors.vehicle_no}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="dc-driver">Driver</label>
          <input id="dc-driver" className="wf-input" maxLength={100} value={form.driver_name} onChange={(e) => set("driver_name", e.target.value)} disabled={save.submitting} />
          <FieldError>{save.fieldErrors.driver_name}</FieldError>
        </div>
      </div>

      <div className="wf-field">
        <label>Material Sent</label>
        <datalist id="dc-units">
          {units.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <DataTable
          columns={["Product", "Material", "Quantity", "Unit", ""]}
          rows={form.items.map((line, i) => [
            <select key="p" className="wf-select" aria-label={`Line ${i + 1} product`} value={line.product_id} onChange={(e) => pickProduct(i, e.target.value)} disabled={save.submitting}>
              <option value="">Other (type below)</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                </option>
              ))}
            </select>,
            <input key="n" className="wf-input" aria-label={`Line ${i + 1} material`} maxLength={200} value={line.item_name} onChange={(e) => setLine(i, { item_name: e.target.value })} disabled={save.submitting} />,
            <input
              key="q"
              className="wf-input"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              aria-label={`Line ${i + 1} quantity`}
              value={line.quantity}
              onChange={(e) => setLine(i, { quantity: e.target.value })}
              disabled={save.submitting}
            />,
            <input key="u" className="wf-input" list="dc-units" aria-label={`Line ${i + 1} unit`} maxLength={30} placeholder="Litres, Bags…" value={line.unit} onChange={(e) => setLine(i, { unit: e.target.value })} disabled={save.submitting} />,
            form.items.length > 1 ? (
              <button key="x" type="button" className="wf-link-btn" onClick={() => set("items", form.items.filter((_, j) => j !== i))} disabled={save.submitting} aria-label={`Remove line ${i + 1}`}>
                ×
              </button>
            ) : (
              ""
            ),
          ])}
        />
        {/* A line's error (items.<n>.<field>) is already a full sentence. */}
        <FieldError>{Object.entries(save.fieldErrors).find(([param]) => param.startsWith("items"))?.[1]}</FieldError>
      </div>
      <div className="wf-field">
        <button type="button" className="wf-link-btn" onClick={() => set("items", [...form.items, { ...EMPTY_LINE }])} disabled={save.submitting}>
          + Add Line
        </button>
      </div>

      <div className="wf-field">
        <label htmlFor="dc-note">Note</label>
        <textarea id="dc-note" className="wf-input" rows={2} maxLength={2000} value={form.note} onChange={(e) => set("note", e.target.value)} disabled={save.submitting} />
        <FieldError>{save.fieldErrors.note}</FieldError>
      </div>
      <div className="wf-field">
        <label className="wf-check-option">
          <input type="checkbox" checked={form.completes_dispatch} onChange={(e) => set("completes_dispatch", e.target.checked)} disabled={save.submitting} />
          <span>
            <strong>This is the last part</strong> — the order is fully dispatched; no more challans can be added.
          </span>
        </label>
      </div>
      <FieldError>{save.fieldErrors.lead_id}</FieldError>
      <div className="wf-actions-end">
        <button type="button" className="wf-btn" onClick={onCancel} disabled={save.submitting}>
          Cancel
        </button>
        <button type="submit" className="wf-btn primary" disabled={save.submitting}>
          Create Challan
        </button>
      </div>
      {confirmDialog}
    </form>
  );
}
