"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge, Box, CheckboxTiles, FieldError, LoadError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { COLOR_API, PRODUCT_API, STATUS, useColorOptions } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";
import { useCan } from "@/lib/roles";

// Product Colors — opened from Colors on the Products list. Tick the colors
// (from the Color master) the product is available in; Save sends the whole
// set at once (POST /api/admin/products/colors/save), so several colors can
// be added or removed in one go. A color that isn't in the master yet can be
// created right here (+ New color, needs colors.add) and comes back ticked.
// Without products.edit the list is read-only.
export default function ProductColorsPage() {
  const router = useRouter();
  const { id } = useParams();
  const product = useApiData(PRODUCT_API.colors, { product_id: id });
  const colors = useColorOptions();
  const backToList = () => router.push("/products");

  return (
    <div>
      <div className="wf-crumb">
        Masters / <Link href="/products">Products</Link>
      </div>
      <h1 className="wf-h1">Product Colors{product.data ? ` — ${product.data.product_name}` : ""}</h1>
      <p className="wf-sub">The colors this product is available in. Add new colors to pick from in the Colors master.</p>

      <LoadError error={product.error} onRetry={product.reload} />
      <LoadError error={colors.error} onRetry={colors.reload} />

      {product.data && colors.options ? (
        <ColorsForm key={product.data.product_id} data={product.data} activeColors={colors.options} onDone={backToList} />
      ) : (
        !product.error && !colors.error && <div className="wf-empty">Loading colors…</div>
      )}
    </div>
  );
}

// A color as a tile: name, its code underneath, and an Inactive badge for a
// color since deactivated that the product still has.
function colorTile(c) {
  return {
    value: c.id,
    label: c.name,
    hint: c.code || undefined,
    badge: c.status === STATUS.INACTIVE ? <Badge tone="idle">Inactive</Badge> : null,
  };
}

/**
 * data = /products/colors ({ product_id, colors }); activeColors = the
 * Color master's active colors ([{ id, name, code }]).
 */
function ColorsForm({ data, activeColors, onDone }) {
  const can = useCan();
  const canEdit = can("products.edit");
  // Creating a color only helps someone who can then tick it.
  const canCreate = canEdit && can("colors.add");
  const [initial] = useState(() => data.colors.map((c) => c.id));
  const [selected, setSelected] = useState(initial);
  const [search, setSearch] = useState("");
  const [created, setCreated] = useState([]); // colors added on this page
  const [newColorName, setNewColorName] = useState(null); // null = closed; else the name to start with
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  // Active colors (incl. ones just created here), plus any the product
  // already has that were since deactivated (kept until unticked).
  const known = [...activeColors, ...created.filter((c) => !activeColors.some((a) => a.id === c.id))];
  const all = [...known, ...data.colors.filter((c) => !known.some((a) => a.id === c.id))].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const term = search.trim().toLowerCase();
  const shown = term ? all.filter((c) => `${c.name} ${c.code || ""}`.toLowerCase().includes(term)) : all;
  const dirty = JSON.stringify([...selected].sort()) !== JSON.stringify([...initial].sort());

  function handleCreated(color) {
    setCreated((list) => [...list, color]);
    setSelected((ids) => [...ids, color.id]);
    setNewColorName(null);
    setSearch("");
  }

  async function handleCancel() {
    if (
      dirty &&
      !(await confirm({
        title: "Discard your changes?",
        message: "The colors you ticked or unticked won't be saved to this product.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      }))
    ) {
      return;
    }
    onDone();
  }

  async function handleSave() {
    if (await save.post(PRODUCT_API.saveColors, { product_id: data.product_id, color_ids: selected })) onDone();
  }

  // Opens the inline New Color form, starting with `name`. linkStyle = inline
  // in a sentence (empty states); otherwise a toolbar button.
  const newColorButton = (name = "", label = "+ New Color", linkStyle = false) =>
    canCreate &&
    newColorName === null && (
      <button
        type="button"
        className={linkStyle ? "wf-link-btn" : "wf-btn ghost"}
        onClick={() => setNewColorName(name)}
        disabled={save.submitting}
      >
        {label}
      </button>
    );

  return (
    <div>
      <Box
        title="Available Colors"
        right={
          <input
            className="wf-input"
            style={{ width: 220 }}
            type="search"
            placeholder="Search name or code"
            aria-label="Search colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        {all.length === 0 ? (
          <div className="wf-empty">No colors yet. {newColorButton("", "+ Create the first color", true)}</div>
        ) : (
          <>
            <div className="wf-tile-toolbar">
              <span className="wf-tile-count">
                <strong>{selected.length}</strong> of {all.length} selected
              </span>
              {canEdit && (
                <div className="wf-btn-row">
                  <button
                    type="button"
                    className="wf-btn"
                    onClick={() => setSelected([...new Set([...selected, ...shown.map((c) => c.id)])])}
                    disabled={save.submitting || shown.length === 0}
                  >
                    Select All{term ? " Shown" : ""}
                  </button>
                  <button
                    type="button"
                    className="wf-btn"
                    onClick={() => setSelected(term ? selected.filter((sid) => !shown.some((c) => c.id === sid)) : [])}
                    disabled={save.submitting || selected.length === 0}
                  >
                    Clear{term ? " Shown" : ""}
                  </button>
                  {newColorButton()}
                </div>
              )}
            </div>
            {shown.length ? (
              <CheckboxTiles
                options={shown.map(colorTile)}
                values={selected}
                onChange={setSelected}
                disabled={!canEdit || save.submitting}
                error={save.fieldErrors.color_ids}
              />
            ) : (
              <div className="wf-empty">
                No colors match “{search.trim()}”. {newColorButton(search.trim(), `+ Create “${search.trim()}”`, true)}
              </div>
            )}
          </>
        )}
        {newColorName !== null && (
          <NewColorForm key={newColorName} initialName={newColorName} onCreated={handleCreated} onCancel={() => setNewColorName(null)} />
        )}
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={handleCancel} disabled={save.submitting}>
            {canEdit ? "Cancel" : "Back to Products"}
          </button>
          {canEdit && (
            <button type="button" className="wf-btn primary" onClick={handleSave} disabled={save.submitting || !dirty}>
              {save.submitting ? "Saving…" : "Save Colors"}
            </button>
          )}
        </div>
      </Box>
      {confirmDialog}
    </div>
  );
}

/**
 * Inline "new color" form: creates the color in the Color master
 * (POST /api/admin/colors/create) and hands it to onCreated, which ticks it
 * — it's added to the product with Save Colors. Its own <form> (Enter adds
 * the color), so the page's Save Colors is a plain button.
 */
function NewColorForm({ initialName, onCreated, onCancel }) {
  const [values, setValues] = useState({ name: initialName, code: "" });
  const create = useSubmit();

  async function handleSubmit(e) {
    e.preventDefault();
    const color = await create.post(COLOR_API.create, values);
    if (color) onCreated(color);
  }

  return (
    <form className="wf-inline-create" onSubmit={handleSubmit} noValidate>
      <p className="wf-inline-create-title">New color — added to the Colors master and ticked for this product</p>
      <div className="wf-grid wf-grid-2">
        <div className="wf-field">
          <label htmlFor="new-color-name">Color Name</label>
          <input
            id="new-color-name"
            required
            autoFocus
            className="wf-input"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            placeholder="e.g. Royal Blue"
            disabled={create.submitting}
          />
          <FieldError>{create.fieldErrors.name}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="new-color-code">Color Code</label>
          <input
            id="new-color-code"
            className="wf-input"
            value={values.code}
            onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
            placeholder="Optional, e.g. #4169E1 or RAL 5002"
            maxLength={50}
            disabled={create.submitting}
          />
          <FieldError>{create.fieldErrors.code}</FieldError>
        </div>
      </div>
      <div className="wf-inline-create-actions">
        <button type="button" className="wf-btn" onClick={onCancel} disabled={create.submitting}>
          Cancel
        </button>
        <button type="submit" className="wf-btn primary" disabled={create.submitting}>
          {create.submitting ? "Adding…" : "Add Color"}
        </button>
      </div>
    </form>
  );
}
