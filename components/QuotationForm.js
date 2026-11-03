"use client";

// Tentative quotation form — create (POST /quotations/create) and every
// update (POST /quotations/update — saved as a new revision, with the
// reason). Lines: product (Products master), area, colour pattern (a colour
// from the Color master, or free text such as "As per client choice"),
// quantity (sq.ft) and rate (₹/sq.ft); the amounts and totals shown are a
// preview — the API calculates what is saved and generates the PDF.

import { useState } from "react";
import { Box, DataTable, FieldError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatAmount, todayDate } from "@/lib/format";
import { QUOTATION_API, quotationTotals, useQuotationMaster } from "@/lib/quotation";
import { ALL_BRANCHES } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

const EMPTY_LINE = { product_id: "", area: "interior", colour_pattern: "", quantity: "", rate: "" };

// Form values from a saved revision (to update it) or the lead (to create).
function initialValues(lead, revision) {
  if (revision) {
    return {
      party_name: revision.party_name,
      place: revision.place,
      quotation_date: todayDate(),
      items: revision.items.map((i) => ({
        product_id: i.product_id,
        area: i.area,
        colour_pattern: i.colour_pattern,
        quantity: String(i.quantity),
        rate: String(i.rate),
      })),
      freight: revision.freight ? String(revision.freight) : "",
      round_off: revision.round_off ? String(revision.round_off) : "",
      remark: "",
    };
  }
  return {
    party_name: lead.company_name || lead.full_name,
    place: lead.branch_name || "",
    quotation_date: todayDate(),
    items: [{ ...EMPTY_LINE }],
    freight: "",
    round_off: "",
    remark: "",
  };
}

/**
 * lead — /leads/details. quotation + revision — the quotation and its
 * current revision (with items) when updating; null to create.
 * onSaved(quotation), onCancel().
 */
export default function QuotationForm({ lead, quotation = null, revision = null, onSaved, onCancel }) {
  const [initial] = useState(() => initialValues(lead, revision));
  const [form, setForm] = useState(initial);
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const { master } = useQuotationMaster();
  const updating = Boolean(quotation);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  // Products on the current version stay selectable even if deactivated since.
  const products = [...(master?.products || [])];
  for (const i of revision?.items || []) {
    if (!products.some((p) => p.id === i.product_id)) products.push({ id: i.product_id, product_name: `${i.product_name} (inactive)` });
  }
  const totals = quotationTotals(form.items, { freight: form.freight, gstRate: master?.gst_rate });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setLine = (index, key, value) =>
    setForm((f) => ({ ...f, items: f.items.map((line, i) => (i === index ? { ...line, [key]: value } : line)) }));
  const addLine = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_LINE }] }));
  const removeLine = (index) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));

  async function handleCancel() {
    if (
      dirty &&
      !(await confirm({
        title: updating ? "Discard your changes?" : "Discard this quotation?",
        message: "What you've entered will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      }))
    ) {
      return;
    }
    onCancel();
  }

  async function handleSave(e) {
    e.preventDefault();
    const toNumber = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
    const body = {
      party_name: form.party_name,
      place: form.place,
      quotation_date: form.quotation_date,
      items: form.items.map((line) => ({
        product_id: line.product_id,
        area: line.area,
        colour_pattern: line.colour_pattern,
        quantity: toNumber(line.quantity),
        rate: toNumber(line.rate),
      })),
      freight: toNumber(form.freight),
      round_off: toNumber(form.round_off),
    };
    const saved = await save.post(
      updating ? QUOTATION_API.update : QUOTATION_API.create,
      updating ? { ...body, id: quotation.id, remark: form.remark } : { ...body, lead_id: lead.id },
      { branchId: ALL_BRANCHES }
    );
    if (saved) onSaved(saved);
  }

  const lineInput = (index, key, props) => (
    <input
      className="wf-input"
      value={form.items[index][key]}
      onChange={(e) => setLine(index, key, e.target.value)}
      disabled={save.submitting}
      {...props}
    />
  );

  return (
    <form onSubmit={handleSave} noValidate>
      <Box title={updating ? `Update ${quotation.quotation_no} — saved as revision R${quotation.revision + 1}` : "New Tentative Quotation"}>
        <div className="wf-grid wf-grid-3">
          <div className="wf-field">
            <label htmlFor="quote-party">Party Name</label>
            <input
              id="quote-party"
              required
              className="wf-input"
              value={form.party_name}
              onChange={(e) => set("party_name", e.target.value)}
              maxLength={150}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.party_name}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="quote-place">Place</label>
            <input
              id="quote-place"
              required
              className="wf-input"
              value={form.place}
              onChange={(e) => set("place", e.target.value)}
              placeholder="e.g. Jaipur"
              maxLength={150}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.place}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="quote-date">Date</label>
            <input
              id="quote-date"
              type="date"
              required
              className="wf-input"
              value={form.quotation_date}
              onChange={(e) => set("quotation_date", e.target.value)}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.quotation_date}</FieldError>
          </div>
        </div>

        <div className="wf-field">
          <label className="wf-required">Products</label>
          <datalist id="quote-colours">
            <option value="As per client choice" />
            {(master?.colors || []).map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <DataTable
            columns={["Product", "Area's", "Colour Pattern", "Quantity (sq.ft)", "Rate per Sq.ft (₹)", "Amount", ""]}
            widths={["26%", "12%", "18%", "12%", "12%", "13%", "7%"]}
            align={[null, null, null, null, null, "right", "right"]}
            rows={form.items.map((line, index) => [
              <select
                key="p"
                aria-label={`Product, line ${index + 1}`}
                className="wf-select"
                value={line.product_id}
                onChange={(e) => setLine(index, "product_id", e.target.value)}
                disabled={save.submitting || !master}
              >
                <option value="">{master ? "Select product" : "Loading…"}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name}
                  </option>
                ))}
              </select>,
              <select
                key="a"
                aria-label={`Area, line ${index + 1}`}
                className="wf-select"
                value={line.area}
                onChange={(e) => setLine(index, "area", e.target.value)}
                disabled={save.submitting}
              >
                {(master?.areas || [{ value: "interior", label: "Interior" }]).map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>,
              lineInput(index, "colour_pattern", {
                key: "c",
                list: "quote-colours",
                maxLength: 150,
                placeholder: "e.g. 255/2",
                "aria-label": `Colour pattern, line ${index + 1}`,
              }),
              lineInput(index, "quantity", {
                key: "q",
                type: "number",
                min: "0",
                step: "any",
                inputMode: "decimal",
                "aria-label": `Quantity, line ${index + 1}`,
              }),
              lineInput(index, "rate", { key: "r", type: "number", min: "0", step: "any", inputMode: "decimal", "aria-label": `Rate, line ${index + 1}` }),
              formatAmount(totals.amounts[index]),
              <button
                key="x"
                type="button"
                className="wf-link-btn"
                onClick={() => removeLine(index)}
                disabled={save.submitting || form.items.length === 1}
                aria-label={`Remove line ${index + 1}`}
              >
                Remove
              </button>,
            ])}
          />
          <FieldError>{save.fieldErrors.items}</FieldError>
          <div className="wf-quote-foot">
            <button type="button" className="wf-btn" onClick={addLine} disabled={save.submitting}>
              + Add Product
            </button>
            <div className="wf-quote-summary" aria-label="Totals">
              <div className="wf-quote-summary-row">
                <span>Subtotal</span>
                <span>{formatAmount(totals.subtotal)}</span>
              </div>
              <div className="wf-quote-summary-row">
                <label htmlFor="quote-freight">Freight (₹)</label>
                <input
                  id="quote-freight"
                  type="number"
                  min="0"
                  step="any"
                  className="wf-input"
                  value={form.freight}
                  onChange={(e) => set("freight", e.target.value)}
                  placeholder="0.00"
                  disabled={save.submitting}
                />
              </div>
              <div className="wf-quote-summary-row total">
                <span>Total</span>
                <span>{formatAmount(totals.total)}</span>
              </div>
              <div className="wf-quote-summary-row">
                <span>Add GST @ {master ? master.gst_rate : "—"}%</span>
                <span>{formatAmount(totals.gstAmount)}</span>
              </div>
              <div className="wf-quote-summary-row">
                <label htmlFor="quote-round">Rounded Off — amount payable (₹)</label>
                <input
                  id="quote-round"
                  type="number"
                  step="any"
                  className="wf-input"
                  value={form.round_off}
                  onChange={(e) => set("round_off", e.target.value)}
                  placeholder={String(Math.round(totals.grandTotal))}
                  disabled={save.submitting}
                />
              </div>
              <div className="wf-quote-summary-row grand">
                <span>Grand Total</span>
                <span>{formatAmount(totals.grandTotal)}</span>
              </div>
              <div className="wf-quote-summary-row muted">
                <span>Total Area</span>
                <span>{totals.totalArea.toLocaleString("en-IN")} sq.ft</span>
              </div>
            </div>
          </div>
          <FieldError>{save.fieldErrors.freight || save.fieldErrors.round_off}</FieldError>
        </div>

        {updating && (
          <div className="wf-field">
            <label htmlFor="quote-remark">Reason for the Change</label>
            <textarea
              id="quote-remark"
              required
              className="wf-textarea"
              rows={2}
              value={form.remark}
              onChange={(e) => set("remark", e.target.value)}
              placeholder="e.g. Customer added the staircase wall; rate revised"
              maxLength={1000}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.remark}</FieldError>
          </div>
        )}

        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={handleCancel} disabled={save.submitting}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : updating ? "Save Revision & PDF" : "Create Quotation & PDF"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
