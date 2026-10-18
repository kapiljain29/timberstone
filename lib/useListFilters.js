"use client";

// Filter state for a list screen's Search & Filters panel (FilterPanel in
// components/ui.js):
//   const FILTERS = { search: "", status: "all" };
//   const filters = useListFilters(FILTERS);
//   const search = useDebouncedValue(filters.values.search.trim());
//   useApiData(X_API.list, { page: filters.page, search, status: statusParam(filters.values.status) });
//   <FilterPanel filters={filters}>
//     <SearchField value={filters.values.search} onChange={(v) => filters.set("search", v)} />
// Every change goes back to page 1. `initial` overrides some defaults on
// the first render (e.g. ?branch= from the URL); reset() goes back to the
// defaults. `active` = how many filters differ from their default.

import { useState } from "react";

export function useListFilters(defaults, initial) {
  const [values, setValues] = useState(() => ({ ...defaults, ...initial }));
  const [page, setPage] = useState(1);

  function set(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
    setPage(1);
  }

  function reset() {
    setValues(defaults);
    setPage(1);
  }

  const active = Object.keys(defaults).filter((key) => values[key] !== defaults[key]).length;
  // FilterPanel starts collapsed unless the screen opened with a filter set.
  const [openAtStart] = useState(active > 0);

  return { values, set, reset, active, openAtStart, page, setPage };
}

// StatusFilterField value ("all" | "1" | "0") → the list API's `status`.
export function statusParam(value) {
  return value === "all" ? undefined : Number(value);
}
