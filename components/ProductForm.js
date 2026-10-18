"use client";

// Add / edit form for a product — used by the Add Product page
// (/products/new) and the Edit Product page (/products/edit/[id]). Saves
// through the API and calls onSaved(product); onCancel() runs after the
// user confirms discarding unsaved changes.

import { useState } from "react";
import { Box, FieldError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { PRODUCT_API, PRODUCT_SPECS, useProductMaster } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

const EMPTY = {
  product_name: "",
  category_id: "",
  sub_category_id: "",
  description: "",
  coverage: "",
  thickness: "",
  kgs_per_sqft: "",
  dimensions: "",
};

// Form values for an existing product (/products/details).
function fromProduct(product) {
  const values = { ...EMPTY };
  for (const key of Object.keys(EMPTY)) values[key] = product[key] || "";
  return values;
}

/**
 * product — the product to edit (/products/details), or null to add one.
 */
export default function ProductForm({ product = null, onSaved, onCancel }) {
  const [initial] = useState(() => (product ? fromProduct(product) : EMPTY));
  const [form, setForm] = useState(initial);
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  // Main categories, plus the subcategories of the chosen category.
  const { master, error: masterError, stale: masterStale } = useProductMaster(form.category_id || null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const categories = master?.categories || [];
  const subCategories = masterStale ? [] : master?.sub_categories || [];
  // The product's current (sub)category may since have been deactivated:
  // keep it selectable so saving doesn't drop it.
  const categoryMissing = form.category_id && master && !categories.some((c) => c.id === form.category_id);
  const subMissing = form.sub_category_id && master && !masterStale && !subCategories.some((c) => c.id === form.sub_category_id);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCancel() {
    if (
      dirty &&
      !(await confirm({
        title: product ? "Discard your changes?" : "Discard this new product?",
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
    const body = { ...form, sub_category_id: form.sub_category_id || null };
    const saved = await save.post(product ? PRODUCT_API.update : PRODUCT_API.create, product ? { id: product.id, ...body } : body);
    if (saved) onSaved(saved);
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <Box title="Product Details">
        <div className="wf-grid wf-grid-3">
          <div className="wf-field">
            <label htmlFor="prod-name">Product Name</label>
            <input
              id="prod-name"
              required
              autoFocus
              className="wf-input"
              value={form.product_name}
              onChange={(e) => set("product_name", e.target.value)}
              placeholder="e.g. Marmorino Classic"
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.product_name}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="prod-category">Category</label>
            <select
              id="prod-category"
              required
              className="wf-select"
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value, sub_category_id: "" }))}
              disabled={save.submitting || !master}
            >
              <option value="">{master ? "Select category" : "Loading…"}</option>
              {categoryMissing && <option value={form.category_id}>{product?.category_name || "Current category"}</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.category_id || (masterError && masterError.message)}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="prod-sub">Subcategory</label>
            <select
              id="prod-sub"
              className="wf-select"
              value={form.sub_category_id}
              onChange={(e) => set("sub_category_id", e.target.value)}
              disabled={save.submitting || !form.category_id || masterStale}
            >
              <option value="">
                {!form.category_id ? "Select a category first" : masterStale ? "Loading…" : subCategories.length ? "None" : "No subcategories"}
              </option>
              {subMissing && <option value={form.sub_category_id}>{product?.sub_category_name || "Current subcategory"}</option>}
              {subCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.category_name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.sub_category_id}</FieldError>
          </div>
        </div>
      </Box>

      <Box title="Specifications">
        <div className="wf-grid wf-grid-4">
          {PRODUCT_SPECS.map(([key, label, placeholder]) => (
            <div className="wf-field" key={key}>
              <label htmlFor={`prod-${key}`}>{label}</label>
              <input
                id={`prod-${key}`}
                className="wf-input"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                maxLength={100}
                disabled={save.submitting}
              />
              <FieldError>{save.fieldErrors[key]}</FieldError>
            </div>
          ))}
        </div>
        <div className="wf-field">
          <label htmlFor="prod-desc">Description</label>
          <textarea
            id="prod-desc"
            className="wf-textarea"
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Optional"
            maxLength={1000}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.description}</FieldError>
        </div>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={handleCancel} disabled={save.submitting}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : product ? "Save Changes" : "Add Product"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
