"use client";

// Role-wise access for the web app. /login signs in through the API
// (lib/api.js session); the API role is mapped to a web role id below.
// Roles not yet on the API are still demo users: picking one on the Role
// Hub stores a demo role id in localStorage, used only while there is no
// API session. Each role sees only the menus, pages and records it is
// allowed to.

import { useSyncExternalStore } from "react";
import { getSession, logout, onSessionChange } from "./api";
import { ownsStep, supportsStep } from "./stages";

// API role -> web role id, for roles whose panel runs on the API. Other
// API roles can't sign in to the web panel yet.
const API_ROLE_TO_WEB = {
  super_admin: "SuperAdmin",
};

// Web panel role for a signed-in API user. Name comes from the session.
const API_ROLES = {
  SuperAdmin: { id: "SuperAdmin", label: "Super Admin", home: "/dashboard" },
};

// Web role id for an API role (e.g. "super_admin"), or "" if not enabled yet.
export function webRoleIdForApiRole(apiRole) {
  return API_ROLE_TO_WEB[apiRole] || "";
}

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

// Which roles can open each section. The longest matching prefix wins.
const ACCESS = [
  ["/dashboard", ["Manager"]],
  ["/call-queue", ["Manager", "Sales"]],
  ["/leads", ["Manager", "Sales", "Marketing"]],
  ["/projects", ["Manager", "Sales", "Design", "Accounts", "Supervisor"]],
  ["/branches", ["Manager"]],
  ["/departments", ["Manager"]],
  ["/team", ["Manager"]],
  ["/architects", ["Manager", "Sales", "Marketing"]],
  ["/account", ALL],
  ["/notifications", ALL],
  ["/roles", ALL],
];

export function getWebRole(id) {
  if (API_ROLES[id]) {
    const user = getSession()?.user;
    return { ...API_ROLES[id], user: user?.name || "", email: user?.email || "", fromApi: true };
  }
  return WEB_ROLES.find((r) => r.id === id) || WEB_ROLES[0];
}

export function canAccess(roleId, path) {
  // Super admin has full access to every section.
  if (roleId === "SuperAdmin") return true;
  const match = ACCESS.filter(([prefix]) => path === prefix || path.startsWith(prefix + "/")).sort(
    (a, b) => b[0].length - a[0].length
  )[0];
  return match ? match[1].includes(roleId) : true;
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
  if (session?.user) return webRoleIdForApiRole(session.user.role);
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
  return id ? getWebRole(id) : null;
}
