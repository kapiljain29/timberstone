"use client";

// Team Members & Departments: API paths and the shared master lists both
// screens use.

import { useApiData } from "./useApi";

export const TEAM_API = {
  list: "/api/admin/team/list",
  details: "/api/admin/team/details",
  create: "/api/admin/team/create",
  update: "/api/admin/team/update",
  status: "/api/admin/team/status",
  master: "/api/admin/team/master",
};

export const BRANCH_API = {
  list: "/api/admin/branches/list",
  create: "/api/admin/branches/create",
  update: "/api/admin/branches/update",
  status: "/api/admin/branches/status",
  master: "/api/admin/branches/master",
};

export const ARCHITECT_API = {
  list: "/api/admin/architects/list",
  create: "/api/admin/architects/create",
  update: "/api/admin/architects/update",
  status: "/api/admin/architects/status",
  master: "/api/admin/architects/master",
};

export const ROLE_API = {
  list: "/api/admin/roles/list",
  create: "/api/admin/roles/create",
  update: "/api/admin/roles/update",
  status: "/api/admin/roles/status",
  master: "/api/admin/roles/master",
};

export const DEPARTMENT_API = {
  list: "/api/admin/departments/list",
  create: "/api/admin/departments/create",
  update: "/api/admin/departments/update",
  status: "/api/admin/departments/status",
};

export const CATEGORY_API = {
  list: "/api/admin/categories/list",
  create: "/api/admin/categories/create",
  update: "/api/admin/categories/update",
  status: "/api/admin/categories/status",
  master: "/api/admin/categories/master",
};

export const LEAD_SOURCE_API = {
  list: "/api/admin/lead-sources/list",
  create: "/api/admin/lead-sources/create",
  update: "/api/admin/lead-sources/update",
  status: "/api/admin/lead-sources/status",
  master: "/api/admin/lead-sources/master",
};

export const COLOR_API = {
  list: "/api/admin/colors/list",
  create: "/api/admin/colors/create",
  update: "/api/admin/colors/update",
  status: "/api/admin/colors/status",
  master: "/api/admin/colors/master",
};

export const PRODUCT_API = {
  list: "/api/admin/products/list",
  details: "/api/admin/products/details",
  create: "/api/admin/products/create",
  update: "/api/admin/products/update",
  status: "/api/admin/products/status",
  master: "/api/admin/products/master",
};

export const LEAD_STATUS_API = {
  list: "/api/admin/lead-statuses/list",
  create: "/api/admin/lead-statuses/create",
  update: "/api/admin/lead-statuses/update",
  status: "/api/admin/lead-statuses/status",
  master: "/api/admin/lead-statuses/master",
};

// Record status values used by the API (1 active / 0 inactive).
export const STATUS = { ACTIVE: 1, INACTIVE: 0 };

/**
 * Dropdown lists for both screens, from POST /api/admin/team/master:
 * { departments, branches, roles, users }. `master` is null until loaded.
 */
export function useTeamMaster() {
  const { data, error, loading, reload } = useApiData(TEAM_API.master);
  return { master: data, error, loading, reload };
}

/**
 * Active categories for dropdowns, [{ id, category_name }]: main categories,
 * or the subcategories of parentId. `options` is null until loaded.
 */
export function useCategoryOptions(parentId = null) {
  const { data, error, reload } = useApiData(CATEGORY_API.master, parentId ? { parent_id: parentId } : {});
  return { options: data, error, reload };
}

/**
 * Active lead sources for dropdowns, [{ id, lead_source_name }]: main lead
 * sources, or the sub-lead sources of parentId. `options` is null until loaded.
 */
export function useLeadSourceOptions(parentId = null) {
  const { data, error, reload } = useApiData(LEAD_SOURCE_API.master, parentId ? { parent_id: parentId } : {});
  return { options: data, error, reload };
}

/**
 * Active colors for dropdowns, [{ id, name, code }]. `options` is null
 * until loaded.
 */
export function useColorOptions() {
  const { data, error, reload } = useApiData(COLOR_API.master);
  return { options: data, error, reload };
}

// Optional product spec fields (free text): [API key, label, placeholder] —
// the Product form's text boxes and the list's spec columns.
export const PRODUCT_SPECS = [
  ["coverage", "Coverage", "e.g. 40 sq.ft / kg"],
  ["thickness", "Thickness", "e.g. 2 mm"],
  ["kgs_per_sqft", "Kgs per Sq.ft", "e.g. 0.25"],
  ["dimensions", "Dimensions", "e.g. 600 × 1200 mm"],
];

/**
 * Dropdown lists for the Product form, from POST /api/admin/products/master:
 * { categories, sub_categories } — sub_categories are those of categoryId
 * ([] without one). `master` is null until loaded; `stale` is true while it
 * still holds another category's sub_categories.
 */
export function useProductMaster(categoryId = null) {
  const { data, error, stale, reload } = useApiData(PRODUCT_API.master, categoryId ? { category_id: categoryId } : {});
  return { master: data, error, stale, reload };
}

// API branches ({ id, code, name }) in the shape BranchFilter expects.
export function toBranchFilterOptions(branches) {
  return (branches || []).map((b) => ({ id: b.id, name: b.name, tag: b.code }));
}
