"use client";

// A lead's Delivery Challans card (POST /api/admin/challans/for-order,
// Delivery Challans → View) — next to Order & Payments on the lead, site
// and order pages, once an order part exists. The order is placed in parts
// (each its own work order); Accounts (Delivery Challans → Add) dispatches
// each part in one or more challans: lines (the part's products or free
// text, quantity, unit), dispatch date, vehicle and driver; ticking "last"
// marks that part fully dispatched. The site's supervisor confirms each
// delivery in the Supervisor app — the list shows its status and photos.

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
 * or a new order part on the same page); onChanged() — after a challan or
 * marking a part fully dispatched (the lead's order stage changes).
 */
export default function OrderChallans({ leadId, refreshKey = 0, onChanged }) {
  const can = useCan();
  const data = useApiData(can("challans.view") ? CHALLAN_API.forOrder : null, { lead_id: leadId }, { branchId: ALL_BRANCHES });
  const { master } = useChallanMaster();
  // The challan form open: { orderId, shortageId (sending the missing items
  // of a short delivery) } or null.
  const [creatingFor, setCreatingFor] = useState(null);
  const { reload } = data;

  useEffect(() => {
    if (refreshKey) reload();
  }, [refreshKey, reload]);

  // Nothing to show before the first order part.
  if (!can("challans.view") || (data.data && !data.data.orders.length)) return null;
  const d = data.data;
  const total = d ? d.orders.reduce((sum, part) => sum + part.challans.length, 0) : 0;
  const saved = (updated) => {
    setCreatingFor(null);
    data.patch(() => updated);
    onChanged?.();
  };

  return (
    <Box title={`Delivery Challans${d ? ` (${total})` : ""}`}>
      <LoadError error={data.error} onRetry={data.reload} />
      {!d
        ? !data.error && <div className="wf-empty">Loading challans…</div>
        : d.orders.map((part) => (
            <PartChallans
              key={part.order.id}
              part={part}
              master={master}
              creating={creatingFor?.orderId === part.order.id ? creatingFor : null}
              onCreate={(shortageId = null) => setCreatingFor({ orderId: part.order.id, shortageId })}
              onCancel={() => setCreatingFor(null)}
              onSaved={saved}
            />
          ))}
    </Box>
  );
}

// One order part: its dispatch state, "Create Challan" and its challans.
function PartChallans({ part, master, creating, onCreate, onCancel, onSaved }) {
  const can = useCan();
  const complete = useSubmit({ fieldErrorsInToast: true });
  const [confirm, confirmDialog] = useConfirm();
  const { order, challans } = part;

  // Its last material went out without being marked as the last.
  async function completeDispatch() {
    const ok = await confirm({
      title: `Mark ${order.order_no} fully dispatched?`,
      message: `Use this when everything in this order part is already sent (${challans.length} ${challans.length === 1 ? "challan" : "challans"} so far). No more challans can be added to it afterwards.`,
      confirmLabel: "Mark Fully Dispatched",
      tone: "primary",
    });
    if (!ok) return;
    const updated = await complete.post(CHALLAN_API.completeDispatch, { work_order_id: order.id }, { branchId: ALL_BRANCHES });
    if (updated) onSaved(updated);
  }

  return (
    <div className="wf-field">
      <label>
        {`Order ${order.order_no} — ${challans.length} ${challans.length === 1 ? "challan" : "challans"}`}
        {order.dispatch_completed_at && " · fully dispatched"}
      </label>
      {!part.can_dispatch && part.blocked_reason && !order.dispatch_completed_at && <Alert tone="info">{part.blocked_reason}</Alert>}
      {part.can_complete && can("challans.add") && !creating && (
        <Alert tone="info">
          {`${challans.length} ${challans.length === 1 ? "challan" : "challans"} sent for this order so far. Is that everything? `}
          <button type="button" className="wf-link-btn" onClick={completeDispatch} disabled={complete.submitting}>
            Mark Fully Dispatched
          </button>
        </Alert>
      )}
      {/* Short deliveries: the missing items still to send. */}
      {!creating &&
        (part.open_shortages || []).map((sh) => (
          <Alert key={sh.id} tone="error">
            <strong>{`${sh.challan_no} arrived short: `}</strong>
            {sh.short_lines.map((l) => `${l.item_name} — ${Number(l.short).toLocaleString("en-IN")} ${l.unit} missing`).join(" · ")}
            {can("challans.add") && (
              <>
                {" "}
                <button type="button" className="wf-link-btn" onClick={() => onCreate(sh.id)}>
                  Send Missing Items
                </button>
              </>
            )}
          </Alert>
        ))}
      {creating ? (
        <ChallanForm
          order={order}
          products={part.products}
          units={master?.units || []}
          shortage={creating.shortageId ? (part.open_shortages || []).find((sh) => sh.id === creating.shortageId) : null}
          onCancel={onCancel}
          onSaved={onSaved}
        />
      ) : (
        part.can_dispatch &&
        can("challans.add") && (
          <div>
            <button type="button" className="wf-link-btn" onClick={() => onCreate()}>
              {`+ Create Challan for ${order.order_no}`}
            </button>
          </div>
        )
      )}
      {challans.length === 0
        ? !creating && <div className="wf-empty">No challans yet — this order part is sent in one or more challans.</div>
        : challans.map((c) => <ChallanView key={c.id} challan={c} master={master} />)}
      {confirmDialog}
    </div>
  );
}

// One challan: what was sent, and its delivery confirmation.
function ChallanView({ challan: c, master }) {
  const delivered = c.delivered_at;
  return (
    <div className="wf-field">
      <DetailGroup
        title={`${c.challan_no}${c.completes_dispatch ? " · last part" : ""}${c.shortage_for_challan_no ? ` · missing items of ${c.shortage_for_challan_no}` : ""}`}
      >
        <Detail label="Status">
          <Badge tone={challanStatusTone(c.delivery_status)}>
            {optionLabel(master?.delivery_statuses, c.delivery_status) || c.delivery_status}
          </Badge>
          {c.short_items > 0 && (
            <>
              {" "}
              <Badge tone={c.shortage_open ? "pending" : "done"}>
                {c.shortage_open
                  ? `${c.short_items} ${c.short_items === 1 ? "item" : "items"} short`
                  : `Missing items delivered ${formatDate(c.shortage_resolved_at)}`}
              </Badge>
            </>
          )}
        </Detail>
        <Detail label="Dispatched">{`${formatDate(c.dispatch_date)}${c.created_by_name ? ` by ${c.created_by_name}` : ""}`}</Detail>
        <Detail label="Vehicle / Driver">{[c.vehicle_no, c.driver_name].filter(Boolean).join(" · ") || "—"}</Detail>
        {delivered && (
          <Detail label="Delivered">{`${formatDateTime(c.delivered_at)}${c.delivered_by_name ? ` — confirmed by ${c.delivered_by_name}` : ""}`}</Detail>
        )}
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
      {/* Once confirmed: what the supervisor received on each line. */}
      <DataTable
        columns={delivered ? ["Material", "Sent", "Received", "Short", "Unit"] : ["Material", "Quantity", "Unit"]}
        align={delivered ? [null, "right", "right", "right", null] : [null, "right", null]}
        rows={c.items.map((i) =>
          delivered
            ? [
                i.item_name,
                Number(i.quantity).toLocaleString("en-IN"),
                i.received_quantity === null ? "—" : Number(i.received_quantity).toLocaleString("en-IN"),
                i.short > 0 ? (
                  <strong key="s" style={{ color: "var(--red-text)" }}>
                    {Number(i.short).toLocaleString("en-IN")}
                  </strong>
                ) : (
                  "—"
                ),
                i.unit,
              ]
            : [i.item_name, Number(i.quantity).toLocaleString("en-IN"), i.unit]
        )}
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

// Accounts dispatches (a part of) an order part.
// shortage — { id, challan_no, short_lines } when sending the missing items
// of a short delivery: the lines start from what is missing.
function ChallanForm({ order, products, units, shortage = null, onCancel, onSaved }) {
  const orderNo = order.order_no;
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const [form, setForm] = useState({
    dispatch_date: todayDate(),
    vehicle_no: "",
    driver_name: "",
    note: "",
    completes_dispatch: false,
    // Starts with the missing lines (a follow-up), else one line per product of the order part.
    items: shortage
      ? shortage.short_lines.map((l) => ({ product_id: l.product_id || "", item_name: l.item_name, quantity: String(l.short), unit: l.unit }))
      : products.length
        ? products.map((p) => ({ ...EMPTY_LINE, product_id: p.product_id, item_name: p.product_name }))
        : [{ ...EMPTY_LINE }],
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
      title: shortage
        ? `Send the missing items of ${shortage.challan_no}?`
        : form.completes_dispatch
          ? `Dispatch the rest of ${orderNo}?`
          : `Dispatch material of ${orderNo}?`,
      message: `A Delivery Challan is created and the site's supervisor is asked to confirm the delivery.${
        form.completes_dispatch ? ` ${orderNo} is marked fully dispatched — no more challans can be added to it.` : ""
      } A challan can't be edited afterwards.`,
      confirmLabel: "Create Challan",
      tone: "primary",
    });
    if (!ok) return;
    const updated = await save.post(
      CHALLAN_API.create,
      {
        work_order_id: order.id,
        dispatch_date: form.dispatch_date || undefined,
        vehicle_no: form.vehicle_no.trim() || undefined,
        driver_name: form.driver_name.trim() || undefined,
        note: form.note.trim() || undefined,
        completes_dispatch: form.completes_dispatch,
        shortage_for_id: shortage ? shortage.id : undefined,
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
      {shortage && (
        <Alert tone="info">{`Sending the items missing from ${shortage.challan_no}. Once the supervisor confirms this challan, that shortage is closed.`}</Alert>
      )}
      <div className="wf-grid wf-grid-3">
        <div className="wf-field">
          <label htmlFor="dc-date">Dispatch Date</label>
          <input
            id="dc-date"
            type="date"
            required
            max={todayDate()}
            className="wf-input"
            value={form.dispatch_date}
            onChange={(e) => set("dispatch_date", e.target.value)}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.dispatch_date}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="dc-vehicle">Vehicle No.</label>
          <input
            id="dc-vehicle"
            className="wf-input"
            maxLength={30}
            placeholder="e.g. RJ14 GB 4521"
            value={form.vehicle_no}
            onChange={(e) => set("vehicle_no", e.target.value)}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.vehicle_no}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="dc-driver">Driver</label>
          <input
            id="dc-driver"
            className="wf-input"
            maxLength={100}
            value={form.driver_name}
            onChange={(e) => set("driver_name", e.target.value)}
            disabled={save.submitting}
          />
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
            <select
              key="p"
              className="wf-select"
              aria-label={`Line ${i + 1} product`}
              value={line.product_id}
              onChange={(e) => pickProduct(i, e.target.value)}
              disabled={save.submitting}
            >
              <option value="">Other (type below)</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name}
                </option>
              ))}
            </select>,
            <input
              key="n"
              className="wf-input"
              aria-label={`Line ${i + 1} material`}
              maxLength={200}
              value={line.item_name}
              onChange={(e) => setLine(i, { item_name: e.target.value })}
              disabled={save.submitting}
            />,
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
            <input
              key="u"
              className="wf-input"
              list="dc-units"
              aria-label={`Line ${i + 1} unit`}
              maxLength={30}
              placeholder="Litres, Bags…"
              value={line.unit}
              onChange={(e) => setLine(i, { unit: e.target.value })}
              disabled={save.submitting}
            />,
            form.items.length > 1 ? (
              <button
                key="x"
                type="button"
                className="wf-link-btn"
                onClick={() =>
                  set(
                    "items",
                    form.items.filter((_, j) => j !== i)
                  )
                }
                disabled={save.submitting}
                aria-label={`Remove line ${i + 1}`}
              >
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
        <button
          type="button"
          className="wf-link-btn"
          onClick={() => set("items", [...form.items, { ...EMPTY_LINE }])}
          disabled={save.submitting}
        >
          + Add Line
        </button>
      </div>

      <div className="wf-field">
        <label htmlFor="dc-note">Note</label>
        <textarea
          id="dc-note"
          className="wf-input"
          rows={2}
          maxLength={2000}
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
          disabled={save.submitting}
        />
        <FieldError>{save.fieldErrors.note}</FieldError>
      </div>
      {/* A follow-up for missing items doesn't change whether the part is fully dispatched. */}
      {!shortage && !order.dispatch_completed_at && (
        <div className="wf-field">
          <label className="wf-check-option">
            <input
              type="checkbox"
              checked={form.completes_dispatch}
              onChange={(e) => set("completes_dispatch", e.target.checked)}
              disabled={save.submitting}
            />
            <span>
              <strong>This is the last of {orderNo}</strong> — it is fully dispatched; no more challans can be added to it.
            </span>
          </label>
        </div>
      )}
      <FieldError>{save.fieldErrors.work_order_id || save.fieldErrors.shortage_for_id}</FieldError>
      <div className="wf-actions-end">
        <button type="button" className="wf-btn" onClick={onCancel} disabled={save.submitting}>
          Cancel
        </button>
        <button type="submit" className="wf-btn primary" disabled={save.submitting}>
          {shortage ? "Send Missing Items" : "Create Challan"}
        </button>
      </div>
      {confirmDialog}
    </form>
  );
}
