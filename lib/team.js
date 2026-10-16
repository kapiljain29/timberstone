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
};

export const DEPARTMENT_API = {
  list: "/api/admin/departments/list",
  create: "/api/admin/departments/create",
  update: "/api/admin/departments/update",
  status: "/api/admin/departments/status",
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

// API branches ({ id, code, name }) in the shape BranchFilter expects.
export function toBranchFilterOptions(branches) {
  return (branches || []).map((b) => ({ id: b.id, name: b.name, tag: b.code }));
}
