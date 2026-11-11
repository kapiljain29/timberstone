"use client";

// Quotation form (tentative or final) — create (POST /quotations/create)
// and every update (POST /quotations/update — saved as a new revision, with
// the reason). Lines: category (Categories master), product (searched within
// the category as you type), area, colour pattern (suggestions from the
// product's colours as you type, or free text such as "As per client choice"),
// quantity (sq.ft) and rate (₹/sq.ft); the amounts and totals shown are a
// preview — the API calculates what is saved and generates the PDF.

import { useState } from "react";
import { Box, DataTable, FieldError } from "@/components/ui";
import Autocomplete from "@/components/Autocomplete";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatAmount, todayDate } from "@/lib/format";
import { QUOTATION_API, QUOTATION_TYPES, quotationTotals, useQuotationMaster } from "@/lib/quotation";
import { ALL_BRANCHES } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

const EMPTY_LINE = { category_id: "", product_id: "", product_name: "", area: "interior", colour_pattern: "", quantity: "", rate: "" };

// Always offered as a colour pattern, whatever the product.
const CLIENT_CHOICE = { name: "As per client choice" };

// Form values from a saved revision (to update it) or the lead (to create).
function initialValues(lead, revision) {
  if (revision) {
    return {
      party_name: revision.party_name,
      place: revision.place,
      quotation_date: todayDate(),
      items: revision.items.map((i) => ({
        category_id: i.category_id || "",
        product_id: i.product_id,
        product_name: i.product_name,
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
 * lead — /leads/details. type — "tentative" / "final" (QUOTATION_TYPES).
 * quotation + revision — the quotation and its current revision (with
 * items) when updating. To create: quotation null, and revision = one to
 * start from (e.g. the tentative quotation's lines for the final one) or
 * null for a blank form. onSaved(quotation), onCancel().
 */
export default function QuotationForm({ lead, type = "tentative", quotation = null, revision = null, onSaved, onCancel }) {
  const [initial] = useState(() => initialValues(lead, revision));
  const [form, setForm] = useState(initial);
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const { master } = useQuotationMaster();
  const updating = Boolean(quotation);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  // A line's category may since have been deactivated: keep it selectable.
  const categories = [...(master?.categories || [])];
  for (const i of revision?.items || []) {
    if (i.category_id && !categories.some((c) => c.id === i.category_id)) categories.push({ id: i.category_id, category_name: i.category_name });
  }
  const totals = quotationTotals(form.items, { freight: form.freight, gstRate: master?.gst_rate });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const patchLine = (index, patch) =>
    setForm((f) => ({ ...f, items: f.items.map((line, i) => (i === index ? { ...line, ...patch } : line)) }));
  const setLine = (index, key, value) => patchLine(index, { [key]: value });
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
      updating ? { ...body, id: quotation.id, remark: form.remark } : { ...body, lead_id: lead.id, quotation_type: type },
      { branchId: ALL_BRANCHES }
    );
    if (saved) onSaved(saved);
  }

  // A line's number input; `cellKey` is its React key in the row.
  const lineInput = (index, field, { key: cellKey, ...props }) => (
    <input
      key={cellKey}
      className="wf-input"
      value={form.items[index][field]}
      onChange={(e) => setLine(index, field, e.target.value)}
      disabled={save.submitting}
      {...props}
    />
  );

  return (
    <form onSubmit={handleSave} noValidate>
      <Box title={updating ? `Update ${quotation.quotation_no} — saved as revision R${quotation.revision + 1}` : `New ${QUOTATION_TYPES[type].label}`}>
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
          <DataTable
            columns={["Category", "Product", "Area's", "Colour Pattern", "Qty (sq.ft)", "Rate / Sq.ft (₹)", "Amount", ""]}
            widths={["15%", "20%", "10%", "16%", "10%", "10%", "12%", "7%"]}
            align={[null, null, null, null, null, null, "right", "right"]}
            rows={form.items.map((line, index) => [
              <select
                key="g"
                aria-label={`Category, line ${index + 1}`}
                className="wf-select"
                value={line.category_id}
                // A product belongs to its category — pick it again.
                onChange={(e) => patchLine(index, { category_id: e.target.value, product_id: "", product_name: "" })}
                disabled={save.submitting || !master}
              >
                <option value="">{master ? "Select category" : "Loading…"}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name}
                  </option>
                ))}
              </select>,
              <Autocomplete
                key="p"
                id={`quote-product-${index}`}
                ariaLabel={`Product, line ${index + 1}`}
                placeholder={line.category_id ? "Search product" : "Select category first"}
                path={line.category_id ? QUOTATION_API.products : null}
                params={{ category_id: line.category_id }}
                text={line.product_name}
                // Typing again un-picks the product until one is chosen.
                onTextChange={(t) => patchLine(index, { product_name: t, product_id: "" })}
                onPick={(p) => patchLine(index, { product_id: p.id, product_name: p.product_name })}
                optionLabel={(p) => p.product_name}
                emptyLabel="No products in this category match"
                disabled={save.submitting || !line.category_id}
              />,
              <select
                key="a"
                aria-label={`Area, line ${index + 1}`}
                className="wf-select"
                value={line.area}
                onChange={(e) => setLine(index, "area", e.target.value)}
                disabled={save.submitting}
              >
                {(master?.areas || [{ value: line.area, label: "Loading…" }]).map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>,
              <Autocomplete
                key="c"
                id={`quote-colour-${index}`}
                ariaLabel={`Colour pattern, line ${index + 1}`}
                placeholder={line.product_id ? "Search colour or type" : "Type, or pick a product"}
                // The picked product's colours; free text is always allowed.
                path={line.product_id ? QUOTATION_API.colors : null}
                params={{ product_id: line.product_id }}
                extraOptions={[CLIENT_CHOICE]}
                text={line.colour_pattern}
                onTextChange={(t) => setLine(index, "colour_pattern", t.slice(0, 150))}
                onPick={(c) => setLine(index, "colour_pattern", c.name)}
                optionLabel={(c) => c.name}
                optionHint={(c) => c.code}
                emptyLabel="No colours linked to this product — type it"
                disabled={save.submitting}
              />,
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
