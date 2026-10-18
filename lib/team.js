"use client";

// Team Members & Departments: API paths and the shared master lists both
// screens use.

import { useApiData } from "./useApi";

export const TEAM_API = {
  list: "/api/admin/team/list",
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

// API branches ({ id, code, name }) in the shape BranchFilter expects.
export function toBranchFilterOptions(branches) {
  return (branches || []).map((b) => ({ id: b.id, name: b.name, tag: b.code }));
}
