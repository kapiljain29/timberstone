"use client";

// The order side of the Order & Payments card (components/OrderPayments.js):
//   - Quotation Lines — the approved Final Quotation's lines with how much
//     of each is ordered / left, and its sample. A product with "Requires
//     sample" (Products master) can be ordered only once Sales uploads a
//     sample for that line (Upload Sample on the row, Quotations → Edit →
//     a dialog naming the line → /orders/upload-sample, multipart).
//   - Place Order (Orders & Payments → Create Order, confirmed) — the order
//     is placed in parts: each part is its own work order with the chosen
//     quantities of the lines (/orders/create). The first part only once
//     the advance is in.
//   - The parts placed so far, each with its lines.
// Every amount and rule comes from the API (`items`, `orders`, `plan` of
// /orders/summary); this only shows them.

import { useState } from "react";
import { Badge, DataTable, Detail, DetailGroup, FieldError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import FileDropBox from "@/components/FileDropBox";
import Modal from "@/components/Modal";
import { formatAmount, formatDateTime } from "@/lib/format";
import { ORDER_API, ORDER_STAGE, useOrderMaster } from "@/lib/orders";
import { discounted } from "@/lib/quotation";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

const qty = (value) => Number(value).toLocaleString("en-IN");
const lineLabel = (line) => `${line.product_name} (${line.area_label}, ${line.colour_pattern})`;

/**
 * leadId — the lead; summary — /orders/summary's result; onChanged(updated)
 * — after a sample or an order part (the API returns the new summary).
 */
export default function OrderParts({ leadId, summary: s, onChanged }) {
  const can = useCan();
  const [placing, setPlacing] = useState(false);
  const [sampleFor, setSampleFor] = useState(null);
  const { plan } = s;
  // The first part waits for the advance; later parts only need something left.
  const canStart = plan.has_order || plan.stage === ORDER_STAGE.READY_FOR_ORDER;
  const orderable = s.items.filter((l) => l.can_order);
  const waitingSample = s.items.filter((l) => l.remaining_quantity > 0 && !l.sample_ready);
  const done = (updated) => {
    setPlacing(false);
    setSampleFor(null);
    onChanged(updated);
  };

  return (
    <>
      <div className="wf-field">
        <label>{`Quotation Lines (${s.items.length})`}</label>
        <DataTable
          columns={["Product", "Area", "Colour / Pattern", "Quantity (sq.ft)", "Rate (₹/sq.ft)", "Amount", "Ordered", "Left", "Sample"]}
          align={[null, null, null, "right", "right", "right", "right", "right", null]}
          rows={s.items.map((l) => [
            <div key="p">
              <strong>{l.product_name}</strong>
              {l.category_name && <div className="wf-sub">{l.category_name}</div>}
            </div>,
            l.area_label,
            l.colour_pattern,
            // + extra approved on the site's material requests (orderable too).
            <div key="q">
              {qty(l.quantity)}
              {l.extra_quantity > 0 && <div className="wf-sub">{`+ ${qty(l.extra_quantity)} extra approved`}</div>}
            </div>,
            formatAmount(l.rate),
            formatAmount(l.amount),
            l.ordered_quantity ? qty(l.ordered_quantity) : "—",
            l.remaining_quantity ? <strong key="r">{qty(l.remaining_quantity)}</strong> : "—",
            <SampleCell
              key="s"
              line={l}
              canUpload={can("quotations.edit") && !sampleFor}
              onUpload={() => {
                setPlacing(false);
                setSampleFor(l);
              }}
            />,
          ])}
        />
      </div>

      {sampleFor && <SampleDialog key={sampleFor.id} leadId={leadId} line={sampleFor} onClose={() => setSampleFor(null)} onSaved={done} />}

      {s.orders.map((o) => (
        <OrderPart key={o.id} order={o} />
      ))}

      {can("orders.add") && !plan.fully_ordered && !placing && !sampleFor && (
        <div className="wf-actions-end">
          <button
            type="button"
            className="wf-btn primary"
            onClick={() => setPlacing(true)}
            disabled={!canStart || !orderable.length}
            title={
              !canStart
                ? "Complete the advance first"
                : !orderable.length
                  ? `Waiting for ${waitingSample.length === 1 ? "a sample" : "samples"} from Sales`
                  : undefined
            }
          >
            {plan.has_order ? "Place Another Order Part" : "Place Order"}
          </button>
        </div>
      )}
      {placing && (
        <PlaceOrderForm
          leadId={leadId}
          lines={s.items}
          discountPct={s.quotation?.discount_pct || 0}
          hasOrder={plan.has_order}
          onCancel={() => setPlacing(false)}
          onSaved={done}
        />
      )}
    </>
  );
}

// A line's sample: not needed / needed / uploaded (with the files).
function SampleCell({ line, canUpload, onUpload }) {
  const upload = canUpload && line.remaining_quantity > 0 && (
    <div>
      <button type="button" className="wf-link-btn" onClick={onUpload}>
        {line.samples.length ? "+ Add Sample" : "Upload Sample"}
      </button>
    </div>
  );
  if (!line.requires_sample && !line.samples.length) return <span className="wf-sub">Not needed</span>;
  return (
    <div>
      {line.samples.length ? (
        <Badge tone="done">{`Uploaded (${line.samples.length})`}</Badge>
      ) : (
        <Badge tone="pending">Needed before ordering</Badge>
      )}
      {line.samples.map((f) => (
        <div key={f.id} className="wf-sub">
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="wf-link-btn" title={f.remark || undefined}>
            {f.original_name} ↗
          </a>
          {` · ${f.uploaded_by_name || "—"}, ${formatDateTime(f.created_at)}`}
        </div>
      ))}
      {upload}
    </div>
  );
}

// Sales uploads a sample for one line — in a dialog that names the line,
// with its samples so far. Closing it with files picked asks first.
function SampleDialog({ leadId, line, onClose, onSaved }) {
  const { master } = useOrderMaster();
  const extensions = master?.sample_extensions || [];
  const [files, setFiles] = useState([]);
  const [remark, setRemark] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  async function close() {
    if (save.submitting) return;
    if (
      (files.length || remark.trim()) &&
      !(await confirm({
        title: "Discard this sample upload?",
        message: `The ${files.length === 1 ? "file" : "files"} you picked for ${line.product_name} won't be uploaded.`,
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      }))
    ) {
      return;
    }
    onClose();
  }

  async function handleUpload(e) {
    e.preventDefault();
    const form = new FormData();
    form.append("lead_id", leadId);
    form.append("quotation_item_id", line.id);
    if (remark.trim()) form.append("remark", remark.trim());
    files.forEach((f) => form.append("files", f));
    const updated = await save.upload(ORDER_API.uploadSample, form, { branchId: ALL_BRANCHES });
    if (updated) onSaved(updated);
  }

  return (
    <Modal title={`Upload Sample — ${line.product_name}`} onClose={close} wide>
      <form onSubmit={handleUpload} noValidate className="wf-subform">
        <DetailGroup title="Quotation Line">
          <Detail label="Product">{line.category_name ? `${line.product_name} (${line.category_name})` : line.product_name}</Detail>
          <Detail label="Area">{line.area_label}</Detail>
          <Detail label="Colour / Pattern">{line.colour_pattern}</Detail>
          <Detail label="Quantity">{`${qty(line.quantity)} sq.ft (${qty(line.remaining_quantity)} left to order)`}</Detail>
          {line.samples.length > 0 && (
            <Detail label="Uploaded So Far" wide>
              {line.samples.map((f) => (
                <div key={f.id}>
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="wf-link-btn">
                    {f.original_name} ↗
                  </a>
                  {` · ${f.uploaded_by_name || "—"}, ${formatDateTime(f.created_at)}`}
                </div>
              ))}
            </Detail>
          )}
        </DetailGroup>
        <div className="wf-field">
          <FileDropBox
            id={`sample-${line.id}`}
            label={`${extensions.join(", ")} — up to ${master?.sample_max_files || 10} files`}
            extensions={extensions}
            files={files}
            onChange={setFiles}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.files}</FieldError>
          <FieldError>{save.fieldErrors.quotation_item_id}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor={`sample-remark-${line.id}`}>Remark</label>
          <input
            id={`sample-remark-${line.id}`}
            className="wf-input"
            maxLength={1000}
            placeholder="e.g. Client picked shade 2 from the sample board"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.remark}</FieldError>
        </div>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={close} disabled={save.submitting}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting || !files.length}>
            {save.submitting ? "Uploading…" : files.length > 1 ? `Upload ${files.length} Files` : "Upload Sample"}
          </button>
        </div>
      </form>
      {confirmDialog}
    </Modal>
  );
}

// Accounts places an order part: tick lines, set each quantity (defaults
// to what is left). Lines waiting for a sample can't be ticked.
// discountPct — the approved quotation's discount, applied to every part.
function PlaceOrderForm({ leadId, lines, discountPct, hasOrder, onCancel, onSaved }) {
  const open = lines.filter((l) => l.remaining_quantity > 0);
  const [picked, setPicked] = useState(() => Object.fromEntries(open.filter((l) => l.can_order).map((l) => [l.id, String(l.remaining_quantity)])));
  const [note, setNote] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const chosen = open.filter((l) => picked[l.id] !== undefined);
  const amount = discounted(
    chosen.map((l) => ({ quantity: picked[l.id], rate: l.rate })),
    discountPct
  ).net;

  function toggle(line, on) {
    setPicked((p) => {
      const next = { ...p };
      if (on) next[line.id] = String(line.remaining_quantity);
      else delete next[line.id];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const rest = open.length - chosen.filter((l) => Number(picked[l.id]) >= l.remaining_quantity).length;
    const ok = await confirm({
      title: `Place ${hasOrder ? "another order part" : "the order"} — ${chosen.length} ${chosen.length === 1 ? "line" : "lines"}?`,
      message:
        `${chosen.map((l) => `${l.product_name}: ${qty(picked[l.id] || 0)} sq.ft`).join(", ")} — about ${formatAmount(amount)} before GST${discountPct ? `, after the quotation's ${discountPct}% discount` : ""}. ` +
        `It gets its own order number; the sales team and the site's Operation Head are notified. ${
          rest > 0 ? `${rest} ${rest === 1 ? "line stays" : "lines stay"} to be ordered later.` : "This orders everything that is left."
        } An order can't be deleted.`,
      confirmLabel: "Place Order",
      tone: "primary",
    });
    if (!ok) return;
    const updated = await save.post(
      ORDER_API.create,
      {
        lead_id: leadId,
        note: note.trim() || undefined,
        items: chosen.map((l) => ({ quotation_item_id: l.id, quantity: picked[l.id] === "" ? undefined : Number(picked[l.id]) })),
      },
      { branchId: ALL_BRANCHES }
    );
    if (updated) onSaved(updated);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="wf-subform">
      <div className="wf-field">
        <label>{hasOrder ? "Place Another Order Part" : "Place Order"}</label>
        <DataTable
          columns={["", "Product", "Area", "Colour / Pattern", "Left (sq.ft)", "Order Now (sq.ft)"]}
          align={[null, null, null, null, "right", null]}
          rows={open.map((l) => [
            <input
              key="c"
              type="checkbox"
              aria-label={`Order ${lineLabel(l)}`}
              checked={picked[l.id] !== undefined}
              onChange={(e) => toggle(l, e.target.checked)}
              disabled={save.submitting || !l.can_order}
            />,
            <div key="p">
              <strong>{l.product_name}</strong>
              {!l.sample_ready && <div className="wf-sub">Waiting for the sample from Sales</div>}
            </div>,
            l.area_label,
            l.colour_pattern,
            qty(l.remaining_quantity),
            picked[l.id] !== undefined ? (
              <input
                key="q"
                className="wf-input"
                type="number"
                min="0"
                max={l.remaining_quantity}
                step="any"
                inputMode="decimal"
                aria-label={`Quantity of ${lineLabel(l)}`}
                value={picked[l.id]}
                onChange={(e) => setPicked((p) => ({ ...p, [l.id]: e.target.value }))}
                disabled={save.submitting}
              />
            ) : (
              "—"
            ),
          ])}
        />
        {/* A line's error (items / items.<n>.<field>) is already a full sentence. */}
        <FieldError>{Object.entries(save.fieldErrors).find(([param]) => param.startsWith("items"))?.[1]}</FieldError>
      </div>
      <div className="wf-field">
        <label htmlFor="order-note">Note</label>
        <textarea id="order-note" className="wf-textarea" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} disabled={save.submitting} />
        <FieldError>{save.fieldErrors.note}</FieldError>
      </div>
      <FieldError>{save.fieldErrors.lead_id}</FieldError>
      <div className="wf-actions-end">
        <button type="button" className="wf-btn" onClick={onCancel} disabled={save.submitting}>
          Cancel
        </button>
        <button type="submit" className="wf-btn primary" disabled={save.submitting || !chosen.length}>
          Place Order
        </button>
      </div>
      {confirmDialog}
    </form>
  );
}

// One placed order part and its lines.
function OrderPart({ order: o }) {
  return (
    <div className="wf-field">
      <DetailGroup title={`Order ${o.order_no}`}>
        <Detail label="Placed">{`${formatDateTime(o.created_at)}${o.created_by_name ? ` by ${o.created_by_name}` : ""}`}</Detail>
        <Detail label="Amount">
          {`${o.discount_amount > 0 ? `${formatAmount(o.order_amount + o.discount_amount)} − ${o.discount_pct}% discount ${formatAmount(o.discount_amount)} = ` : ""}` +
            `${formatAmount(o.order_amount)} + GST ${formatAmount(o.gst_amount)} = ${formatAmount(o.grand_total)}`}
        </Detail>
        <Detail label="Ready to Dispatch">{o.ready_to_dispatch_at ? formatDateTime(o.ready_to_dispatch_at) : "Not yet"}</Detail>
        <Detail label="Dispatch">
          {o.dispatch_completed_at ? "Fully dispatched" : o.challan_count ? `${o.challan_count} ${o.challan_count === 1 ? "challan" : "challans"} sent` : "Not yet"}
        </Detail>
        {o.note && (
          <Detail label="Note" wide>
            {o.note}
          </Detail>
        )}
      </DetailGroup>
      <DataTable
        columns={["Product", "Area", "Colour / Pattern", "Quantity (sq.ft)", "Rate (₹/sq.ft)", "Amount"]}
        align={[null, null, null, "right", "right", "right"]}
        rows={o.items.map((i) => [<strong key="p">{i.product_name}</strong>, i.area_label, i.colour_pattern, qty(i.quantity), formatAmount(i.rate), formatAmount(i.amount)])}
      />
    </div>
  );
}
