"use client";

import { useState } from "react";
import { Box, DataTable, FieldError, FilterPanel, LoadError, Pagination, SearchField, StatusBadge, StatusFilterField } from "@/components/ui";
import { CATEGORY_API, STATUS, useCategoryOptions } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { statusParam, useListFilters } from "@/lib/useListFilters";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const FILTERS = { search: "", type: "", status: "all" }; // type: "" = all, "main", "sub"
const emptyForm = { id: null, category_name: "", parent_id: "", description: "" };

export default function CategoriesPage() {
  const filters = useListFilters(FILTERS);
  const { page, setPage } = filters;
  const [form, setForm] = useState(null); // null = closed; { id: null, ... } = add; { id, ... } = edit
  const debouncedSearch = useDebouncedValue(filters.values.search.trim());

  const list = useApiData(CATEGORY_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    type: filters.values.type || undefined,
    status: statusParam(filters.values.status),
  });
  const parents = useCategoryOptions();
  const save = useSubmit();
  const statusToggle = useStatusToggle(CATEGORY_API.status, list, parents.reload);
  const can = useCan();

  const items = list.data?.items || [];
  // A category can't be its own parent; the API also refuses its own subcategories.
  const parentOptions = (parents.options || []).filter((c) => c.id !== form?.id);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openForm(category) {
    save.reset();
    setForm(
      category
        ? {
            id: category.id,
            category_name: category.category_name,
            parent_id: category.parent_id || "",
            description: category.description || "",
            // Shown in the dropdown when the parent isn't in /master (inactive, or itself a subcategory).
            parent_name: category.parent_name,
          }
        : emptyForm
    );
  }

  async function handleSave(e) {
    e.preventDefault();
    const { id, category_name, parent_id, description } = form;
    const body = { category_name, parent_id: parent_id || null, description };
    const saved = await save.post(id ? CATEGORY_API.update : CATEGORY_API.create, id ? { id, ...body } : body);
    if (saved) {
      setForm(null);
      list.reload();
      parents.reload();
    }
  }

  function toggleCategory(c) {
    const where = c.parent_id ? "Subcategory dropdowns" : "Category dropdowns";
    statusToggle.run(c, {
      name: c.category_name,
      deactivate: `It will be hidden from ${where}, so it can't be picked for new records. Records already using it keep it${
        c.sub_category_count ? `, and its ${c.sub_category_count} subcategory(ies) keep their own status` : ""
      }. You can activate it again later.`,
      activate: `It will appear in ${where} again.`,
    });
  }


  const parentMissing = form?.parent_id && !parentOptions.some((c) => c.id === form.parent_id);

  return (
    <div>
      <div className="wf-crumb">Masters</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Categories</h1>
          <p className="wf-sub">Main product categories and their subcategories, used across products and quotations.</p>
        </div>
        {can("categories.add") && (
          <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
            + Add Category
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.id ? "Edit Category" : "New Category"}>
            <div className="wf-grid wf-grid-3">
              <div className="wf-field">
                <label htmlFor="cat-name">Category Name</label>
                <input
                  id="cat-name"
                  required
                  className="wf-input"
                  value={form.category_name}
                  onChange={(e) => set("category_name", e.target.value)}
                  placeholder="e.g. Italian Paints"
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.category_name}</FieldError>
              </div>
              <div className="wf-field">
                <label htmlFor="cat-parent">Parent Category</label>
                <select
                  id="cat-parent"
                  className="wf-select"
                  value={form.parent_id}
                  onChange={(e) => set("parent_id", e.target.value)}
                  disabled={save.submitting || !parents.options}
                >
                  <option value="">{parents.options ? "None — main category" : "Loading…"}</option>
                  {parentMissing && <option value={form.parent_id}>{form.parent_name || "Current parent"}</option>}
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
                <FieldError>{save.fieldErrors.parent_id || (parents.error && parents.error.message)}</FieldError>
              </div>
              <div className="wf-field">
                <label htmlFor="cat-desc">Description</label>
                <input
                  id="cat-desc"
                  className="wf-input"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Optional"
                  disabled={save.submitting}
                />
                <FieldError>{save.fieldErrors.description}</FieldError>
              </div>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setForm(null)} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Saving…" : form.id ? "Save Changes" : "Add Category"}
              </button>
            </div>
          </Box>
        </form>
      )}

      <FilterPanel filters={filters}>
        <SearchField id="cat-search" value={filters.values.search} onChange={(v) => filters.set("search", v)} placeholder="Search categories" />
        <div className="wf-field">
          <label htmlFor="cat-type">Type</label>
          <select id="cat-type" className="wf-select" value={filters.values.type} onChange={(e) => filters.set("type", e.target.value)}>
            <option value="">All categories</option>
            <option value="main">Main categories</option>
            <option value="sub">Subcategories</option>
          </select>
        </div>
        <StatusFilterField id="cat-status" value={filters.values.status} onChange={(v) => filters.set("status", v)} />
      </FilterPanel>

      <Box title={`Categories (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading categories…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Category", "Parent", "Subcategories", "Description", "Status", ""]}
              emptyLabel={filters.active ? "No categories match these filters." : "No categories yet. Add the first one."}
              rows={items.map((c) => [
                <strong key="n">{c.category_name}</strong>,
                c.parent_name || "— Main —",
                c.sub_category_count,
                c.description || "—",
                <StatusBadge key="s" active={c.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  {can("categories.edit") && (
                    <button type="button" className="wf-link-btn" onClick={() => openForm(c)}>
                      Edit
                    </button>
                  )}
                  {can("categories.status") && (
                    <button type="button" className="wf-link-btn" onClick={() => toggleCategory(c)} disabled={statusToggle.submitting}>
                      {c.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>,
              ])}
            />
          )
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
      {statusToggle.confirmDialog}
    </div>
  );
}
