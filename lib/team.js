"use client";

// Team Members & Departments: API paths and the shared master lists both
// screens use.

import { useMyBranches } from "./roles";
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
  details: "/api/admin/roles/details",
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

export const SETTINGS_API = {
  master: "/api/admin/settings/master",
  details: "/api/admin/settings/details",
  update: "/api/admin/settings/update",
  clear: "/api/admin/settings/clear",
  testEmail: "/api/admin/settings/test-email",
  testWhatsapp: "/api/admin/settings/test-whatsapp",
  testPush: "/api/admin/settings/test-push",
  branding: "/api/admin/settings/branding",
  // Public — name / logo / favicon for the sign-in pages.
  publicBranding: "/api/public/branding",
};

/**
 * The company's { app_name, logo_url, favicon_url } (Site Settings →
 * General), from the public POST /api/public/branding — works signed out.
 * `branding` is null until loaded (or if it fails).
 */
export function useBranding() {
  const { data } = useApiData(SETTINGS_API.publicBranding);
  return data;
}

export const PRODUCT_API = {
  list: "/api/admin/products/list",
  details: "/api/admin/products/details",
  create: "/api/admin/products/create",
  update: "/api/admin/products/update",
  status: "/api/admin/products/status",
  master: "/api/admin/products/master",
  colors: "/api/admin/products/colors",
  saveColors: "/api/admin/products/colors/save",
};

export const LEAD_API = {
  list: "/api/admin/leads/list",
  details: "/api/admin/leads/details",
  create: "/api/admin/leads/create",
  update: "/api/admin/leads/update",
  updateStatus: "/api/admin/leads/update-status",
  assign: "/api/admin/leads/assign",
  assignmentHistory: "/api/admin/leads/assignment-history",
  statusHistory: "/api/admin/leads/status-history",
  booking: "/api/admin/leads/booking",
  paymentReceipt: "/api/admin/leads/payment-receipt",
  master: "/api/admin/leads/master",
};

export const APPROVAL_API = {
  list: "/api/admin/approvals/list",
  details: "/api/admin/approvals/details",
  decide: "/api/admin/approvals/decide",
  master: "/api/admin/approvals/master",
};

// approval_status values the screens act on (labels come from the master).
export const APPROVAL_STATUS = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected", CANCELLED: "cancelled" };

// Badge tone for an approval_status.
export function approvalStatusTone(status) {
  if (status === APPROVAL_STATUS.APPROVED) return "done";
  if (status === APPROVAL_STATUS.PENDING) return "pending";
  return "idle";
}

/**
 * Approval types and statuses ({ types, approval_statuses }, from POST
 * /api/admin/approvals/master). `master` is null until loaded.
 */
export function useApprovalMaster() {
  const { data, error, reload } = useApiData(APPROVAL_API.master);
  return { master: data, error, reload };
}

export const DESIGN_API = {
  list: "/api/admin/design-requests/list",
  details: "/api/admin/design-requests/details",
  create: "/api/admin/design-requests/create",
  upload: "/api/admin/design-requests/upload",
  review: "/api/admin/design-requests/review",
  setEta: "/api/admin/design-requests/set-eta",
  master: "/api/admin/design-requests/master",
};

// design_status values the screens act on (labels come from the master).
export const DESIGN_STATUS = {
  PENDING: "pending",
  SUBMITTED: "submitted",
  CHANGES_REQUESTED: "changes_requested",
  APPROVED: "approved",
};

// Badge tone for a design_status.
export function designStatusTone(status) {
  if (status === DESIGN_STATUS.APPROVED) return "done";
  if (status === DESIGN_STATUS.CHANGES_REQUESTED) return "idle";
  return "pending";
}

// True while the designer still has to deliver: waiting for the design or
// for changes (they can upload and set the expected date).
export function designWaiting(status) {
  return status === DESIGN_STATUS.PENDING || status === DESIGN_STATUS.CHANGES_REQUESTED;
}

// True when the designer's expected date has passed and they haven't
// delivered yet.
export function designOverdue(request) {
  return Boolean(request.expected_at) && designWaiting(request.design_status) && new Date(request.expected_at) < new Date();
}

// Label of a design_status from the master's design_statuses.
export function designStatusLabel(master, status) {
  return (master?.design_statuses || []).find((s) => s.value === status)?.label || status;
}

export const DASHBOARD_API = {
  summary: "/api/admin/dashboard/summary",
};

export const CALL_QUEUE_API = {
  list: "/api/admin/call-queue/list",
  summary: "/api/admin/call-queue/summary",
  master: "/api/admin/call-queue/master",
  logCall: "/api/admin/call-queue/log-call",
  history: "/api/admin/call-queue/history",
};

// call_status values the screens act on (labels come from the master).
export const CALL_STATUS = {
  PENDING: "pending",
  CONNECTED: "connected",
  CALLBACK: "callback",
};

// The master's call_statuses entry for a call_status ({ value, label, open }).
function callStatusOption(master, status) {
  return (master?.call_statuses || []).find((s) => s.value === status);
}

// Label of a call_status from the master's call_statuses.
export function callStatusLabel(master, status) {
  return callStatusOption(master, status)?.label || status;
}

// True if a call_status keeps the lead in the queue (call again).
export function isOpenCallStatus(master, status) {
  return Boolean(callStatusOption(master, status)?.open);
}

// Badge tone for a call_status: connected = done, still to call = pending,
// other closed outcomes = idle.
export function callStatusTone(master, status) {
  if (status === CALL_STATUS.CONNECTED) return "done";
  return isOpenCallStatus(master, status) ? "pending" : "idle";
}

export const LEAD_STATUS_API = {
  list: "/api/admin/lead-statuses/list",
  create: "/api/admin/lead-statuses/create",
  update: "/api/admin/lead-statuses/update",
  status: "/api/admin/lead-statuses/status",
  master: "/api/admin/lead-statuses/master",
};

// Record status values used by the API (1 active / 0 inactive).
export const STATUS = { ACTIVE: 1, INACTIVE: 0 };

// x-branch-id value for "every branch the user can access" (branch-optional
// route groups such as leads).
export const ALL_BRANCHES = "all";

/**
 * Dropdown lists for both screens, from POST /api/admin/team/master:
 * { departments, branches, roles, users }. `master` is null until loaded.
 */
export function useTeamMaster() {
  const { data, error, loading, reload } = useApiData(TEAM_API.master);
  return { master: data, error, loading, reload };
}

/**
 * Dropdown lists for the lead screens, from POST /api/admin/leads/master:
 * { lead_sources, lead_sub_sources (of leadSourceId), lead_statuses,
 * project_types, planning_to_start, budgets, work_types, estimated_areas,
 * country_codes, assignees, team_assignees }. `assignees` / `team_assignees`
 * are for `branchId` (ALL_BRANCHES = any of the user's branches). `master`
 * is null until loaded; `stale` is true while it still holds another lead
 * source's sub-sources.
 */
export function useLeadMaster(branchId, leadSourceId = null) {
  const { data, error, stale, reload } = useApiData(LEAD_API.master, leadSourceId ? { lead_source_id: leadSourceId } : {}, {
    branchId,
  });
  return { master: data, error, stale, reload };
}

// Label of a configured option (`project_types`, `budgets`, … from
// /leads/master — [{ value, label }]); the raw value if it isn't listed.
export function optionLabel(options, value) {
  if (!value) return "—";
  return (options || []).find((o) => o.value === value)?.label || value;
}

/**
 * Design request dropdowns, from POST /api/admin/design-requests/master:
 * { designers (who can work in `branchId` — send the lead's branch),
 * design_statuses, file_types }. `master` is null until loaded.
 */
export function useDesignMaster(branchId) {
  const { data, error, reload } = useApiData(DESIGN_API.master, {}, { branchId });
  return { master: data, error, reload };
}

/**
 * Call queue dropdowns, from POST /api/admin/call-queue/master: { callers
 * (sales users in `branchId` whose queue the user may open), call_statuses
 * ([{ value, label, open }]), lead_statuses }. `master` is null until loaded.
 */
export function useCallQueueMaster(branchId) {
  const { data, error, reload } = useApiData(CALL_QUEUE_API.master, {}, { branchId });
  return { master: data, error, reload };
}

/**
 * Site Settings option lists, from POST /api/admin/settings/master:
 * { groups, timezones, date_formats, currencies, smtp_encryptions,
 * whatsapp_events, whatsapp_languages, country_codes, branding }.
 * `master` is null until loaded.
 */
export function useSettingsMaster() {
  const { data, error, reload } = useApiData(SETTINGS_API.master);
  return { master: data, error, reload };
}

/**
 * Roles & Permissions master, from POST /api/admin/roles/master:
 * { modules, data_scopes } — the permission matrix rows and the "Records
 * they see" options. `master` is null until loaded.
 */
export function useRoleMaster() {
  const { data, error, reload } = useApiData(ROLE_API.master);
  return { master: data, error, reload };
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

/**
 * Branch tabs (BranchFilter) for a list screen — only the branches the
 * signed-in user can access:
 *   const tabs = useBranchTabs();
 *   {tabs.show && <BranchFilter branches={tabs.options} allLabel={tabs.allLabel} ... />}
 *   useApiData(X_API.list, { ...tabs.params(branch), ... });
 * The "all" tab is every branch for all-branch members (no filter), and
 * "All My Branches" (branch_ids) for everyone else. The bar is hidden when
 * there is only one branch to show. A tab value that isn't one of the
 * user's branches (e.g. an old ?branch= link) counts as "all".
 * Lists scoped by the x-branch-id header instead (leads) use
 * `tabs.branchId(value)`: the branch, or "all" (every branch the user has).
 */
export function useBranchTabs() {
  const { allBranches, branches } = useMyBranches();
  return {
    options: toBranchFilterOptions(branches),
    allLabel: allBranches ? "All Branches" : "All My Branches",
    show: branches.length > 1,
    params(value) {
      if (value !== "all" && branches.some((b) => b.id === value)) return { branch_id: value };
      return allBranches ? {} : { branch_ids: branches.map((b) => b.id) };
    },
    branchId(value) {
      return branches.some((b) => b.id === value) ? value : ALL_BRANCHES;
    },
  };
}

// API branches ({ id, code, name }) in the shape BranchFilter expects.
export function toBranchFilterOptions(branches) {
  return (branches || []).map((b) => ({ id: b.id, name: b.name, tag: b.code }));
}
