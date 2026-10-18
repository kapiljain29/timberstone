"use client";

import Link from "next/link";
import { Box, DataTable, FilterPanel, LoadError, Pagination, SearchField, StatusBadge, StatusFilterField } from "@/components/ui";
import { PRODUCT_API, PRODUCT_SPECS, STATUS, useProductMaster } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { statusParam, useListFilters } from "@/lib/useListFilters";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const FILTERS = { search: "", category: "all", status: "all" };

export default function ProductsPage() {
  const filters = useListFilters(FILTERS);
  const { page, setPage } = filters;
  const debouncedSearch = useDebouncedValue(filters.values.search.trim());

  const list = useApiData(PRODUCT_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    category_id: filters.values.category === "all" ? undefined : filters.values.category,
    status: statusParam(filters.values.status),
  });
  // Main categories for the Category filter.
  const { master } = useProductMaster();
  const statusToggle = useStatusToggle(PRODUCT_API.status, list);
  const can = useCan();

  const items = list.data?.items || [];
  const categories = master?.categories || [];

  function toggleProduct(p) {
    statusToggle.run(p, {
      name: p.product_name,
      deactivate: "It will be marked inactive, so it can't be picked for new quotations and orders. Records already using it keep it. You can activate it again later.",
      activate: "It will be available to pick for new quotations and orders again.",
    });
  }

  function specSummary(p) {
    const parts = PRODUCT_SPECS.filter(([key]) => p[key]).map(([key, label]) => `${label}: ${p[key]}`);
    return parts.length ? parts.join(" · ") : "—";
  }

  return (
    <div>
      <div className="wf-crumb">Masters</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Products</h1>
          <p className="wf-sub">Products you sell, by category and subcategory, with their coverage and size specs.</p>
        </div>
        {can("products.add") && (
          <Link href="/products/new" className="wf-btn primary" style={{ marginBottom: 18 }}>
            + Add Product
          </Link>
        )}
      </div>

      <FilterPanel filters={filters}>
        <SearchField id="prod-search" value={filters.values.search} onChange={(v) => filters.set("search", v)} placeholder="Search products" />
        <div className="wf-field">
          <label htmlFor="prod-filter-category">Category</label>
          <select
            id="prod-filter-category"
            className="wf-select"
            value={filters.values.category}
            onChange={(e) => filters.set("category", e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>
        <StatusFilterField id="prod-status" value={filters.values.status} onChange={(v) => filters.set("status", v)} />
      </FilterPanel>

      <Box title={`Products (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading products…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Product", "Category", "Subcategory", "Specs", "Status", ""]}
              emptyLabel={filters.active ? "No products match these filters." : "No products yet. Add the first one."}
              rows={items.map((p) => [
                <strong key="n">{p.product_name}</strong>,
                p.category_name || "—",
                p.sub_category_name || "—",
                specSummary(p),
                <StatusBadge key="s" active={p.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  {can("products.edit") && (
                    <Link href={`/products/edit/${p.id}`} className="wf-link-btn">
                      Edit
                    </Link>
                  )}
                  {can("products.status") && (
                    <button type="button" className="wf-link-btn" onClick={() => toggleProduct(p)} disabled={statusToggle.submitting}>
                      {p.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
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
