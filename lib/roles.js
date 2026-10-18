"use client";

// Role-wise access for the web app. /login signs in through the API
// (lib/api.js session):
//   - Super Admin → web role "SuperAdmin": every section.
//   - any other role → web role "Member": the sections its permissions
//     allow (session.user.permissions, "module.action" keys — see
//     PANEL_ACCESS), and only the buttons it may use (useCan).
// Without an API session the demo roles below still drive the wireframe:
// picking one on the Role Hub stores a demo role id in localStorage.

import { useCallback, useSyncExternalStore } from "react";
import { getSession, logout, onSessionChange } from "./api";
import { ownsStep, supportsStep } from "./stages";

const SUPER_ADMIN_SLUG = "super_admin";
const MEMBER = "Member";

// Panel section → what a signed-in member (non–Super Admin) needs to open
// it: a permission key, null = every member, false = Super Admin only
// (screens not on permissions yet). Longest matching prefix wins.
const PANEL_ACCESS = [
  ["/dashboard", false],
  ["/projects", false],
  ["/call-queue", "leads.view"],
  ["/leads", "leads.view"],
  ["/leads/new", "leads.add"],
  ["/architects", "architects.view"],
  ["/categories", "categories.view"],
  ["/lead-sources", "lead_sources.view"],
  ["/lead-statuses", "lead_statuses.view"],
  ["/branches", "branches.view"],
  ["/departments", "departments.view"],
  ["/team", "team.view"],
  ["/team/new", "team.add"],
  ["/role-master", "roles.view"],
  ["/account", null],
  ["/notifications", null],
  ["/roles", null],
];

// Where a member lands after sign-in: the first of these they can open.
const MEMBER_HOMES = [
  "/leads",
  "/call-queue",
  "/architects",
  "/team",
  "/branches",
  "/departments",
  "/role-master",
  "/categories",
  "/lead-sources",
  "/lead-statuses",
];

function matchPrefix(rules, path) {
  return rules
    .filter(([prefix]) => path === prefix || path.startsWith(prefix + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0];
}

function memberCanOpen(permissions, path) {
  const rule = matchPrefix(PANEL_ACCESS, path);
  if (!rule) return true;
  if (rule[1] === false) return false;
  return rule[1] === null || permissions.includes(rule[1]);
}

// Web role id for a signed-in API user: "SuperAdmin", "Member" (has at
// least one panel section), or "" when their role gives them nothing on
// the web panel (e.g. Supervisor — they use the mobile app).
export function webRoleIdForApiUser(user) {
  if (!user) return "";
  if (user.role === SUPER_ADMIN_SLUG) return "SuperAdmin";
  const permissions = user.permissions || [];
  return MEMBER_HOMES.some((path) => memberCanOpen(permissions, path)) ? MEMBER : "";
}

// Web panel roles for signed-in API users. Names come from the session.
const API_ROLES = {
  SuperAdmin: { id: "SuperAdmin", label: "Super Admin", home: "/dashboard" },
  [MEMBER]: { id: MEMBER, label: "", home: "/account/change-password" },
};

export const WEB_ROLES = [
  { id: "Manager", label: "Management", user: "Rahul Sharma", email: "rahul.sharma@timberstone.in", home: "/dashboard" },
  { id: "Sales", label: "Sales", user: "Vivek Rane", email: "vivek.rane@timberstone.in", home: "/call-queue" },
  { id: "Marketing", label: "Marketing", user: "Sonal Bhatt", email: "sonal.bhatt@timberstone.in", home: "/leads" },
  { id: "Design", label: "Design", user: "Aditi Saxena", email: "aditi.saxena@timberstone.in", home: "/projects" },
  { id: "Accounts", label: "Accounts", user: "Rajesh Khandelwal", email: "rajesh.k@timberstone.in", home: "/projects" },
  { id: "Supervisor", label: "Supervisor", user: "Ramesh Kadam", email: "ramesh.kadam@timberstone.in", home: "/projects" },
];

// Demo user for a login email (case-insensitive), or undefined.
export function findRoleByEmail(email) {
  const normalized = email.trim().toLowerCase();
  return WEB_ROLES.find((r) => r.email === normalized);
}

const ALL = WEB_ROLES.map((r) => r.id);

// Demo roles (no API session): which can open each section. The longest
// matching prefix wins.
const ACCESS = [
  ["/dashboard", ["Manager"]],
  ["/call-queue", ["Manager", "Sales"]],
  ["/leads", ["Manager", "Sales", "Marketing"]],
  ["/projects", ["Manager", "Sales", "Design", "Accounts", "Supervisor"]],
  ["/branches", ["Manager"]],
  ["/departments", ["Manager"]],
  ["/team", ["Manager"]],
  ["/role-master", ["Manager"]],
  ["/architects", ["Manager", "Sales", "Marketing"]],
  ["/categories", ["Manager"]],
  ["/lead-sources", ["Manager", "Marketing"]],
  ["/lead-statuses", ["Manager", "Marketing"]],
  ["/account", ALL],
  ["/notifications", ALL],
  ["/roles", ALL],
];

export function getWebRole(id) {
  if (API_ROLES[id]) {
    const user = getSession()?.user;
    const role = { ...API_ROLES[id], user: user?.name || "", email: user?.email || "", fromApi: true };
    if (id === MEMBER) {
      const permissions = user?.permissions || [];
      role.label = user?.roleName || "";
      role.home = MEMBER_HOMES.find((path) => memberCanOpen(permissions, path)) || role.home;
    }
    return role;
  }
  return WEB_ROLES.find((r) => r.id === id) || WEB_ROLES[0];
}

export function canAccess(roleId, path) {
  // Super admin has full access to every section.
  if (roleId === "SuperAdmin") return true;
  if (roleId === MEMBER) return memberCanOpen(getSession()?.user?.permissions || [], path);
  const match = matchPrefix(ACCESS, path);
  return match ? match[1].includes(roleId) : true;
}

// True if the signed-in user may do `key` ("module.action") — for showing
// Add / Edit / Activate buttons. Super Admin and demo roles (no API
// session) may do everything; the API still checks every call.
export function can(key) {
  const user = getSession()?.user;
  if (!user || user.role === SUPER_ADMIN_SLUG) return true;
  return (user.permissions || []).includes(key);
}

// Management can act on every step; other roles only on steps they own or
// collaborate on.
export function canEditStep(roleId, step) {
  return roleId === "SuperAdmin" || roleId === "Manager" || ownsStep(step, roleId) || supportsStep(step, roleId);
}

// Steps 2-3 on a lead (estimate, measurement booking, conversion) are Sales work.
export function canWorkLead(roleId) {
  return roleId === "SuperAdmin" || roleId === "Manager" || roleId === "Sales";
}

// ---------- current role (localStorage + change event) ----------

const KEY = "wf_role_v1";
const EVENT = "wf-role-change";

// The signed-in role id, or "" when nobody is signed in. An API session
// wins over a demo role.
export function getRoleId() {
  const session = getSession();
  if (session?.user) return webRoleIdForApiUser(session.user);
  try {
    return window.localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setRoleId(id) {
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Storage blocked — the role just won't persist across reloads.
  }
  window.dispatchEvent(new Event(EVENT));
}

// Ends the API session (revoking its refresh token) and any demo role.
export function signOut() {
  logout();
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked — nothing was persisted anyway.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  const offSession = onSessionChange(callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
    offSession();
  };
}

// The signed-in role id: null during server render / hydration, "" when
// signed out.
export function useRoleId() {
  return useSyncExternalStore(subscribe, getRoleId, () => null);
}

// The current role object, or null while hydrating or signed out.
export function useRole() {
  const id = useRoleId();
  useSyncExternalStore(subscribe, permissionsSnapshot, () => ""); // re-render when permissions change
  return id ? getWebRole(id) : null;
}

function permissionsSnapshot() {
  const user = getSession()?.user;
  return user ? `${user.role}|${(user.permissions || []).join(",")}` : "";
}

// can() that re-renders when the session's permissions change:
//   const can = useCan(); {can("branches.add") && <button>+ Add Branch</button>}
export function useCan() {
  const snapshot = useSyncExternalStore(subscribe, permissionsSnapshot, () => "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((key) => can(key), [snapshot]);
}
