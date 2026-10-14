"use client";

// Role-wise access for the web app. There is no real backend login in the
// wireframe: /login matches the email to a demo user below (any password),
// and picking a role on the Role Hub is a shortcut that does the same. The
// signed-in role is kept in localStorage. Each role sees only the menus,
// pages and records it is allowed to.

import { useSyncExternalStore } from "react";
import { ownsStep, supportsStep } from "./stages";

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
  ["/team", ["Manager"]],
  ["/architects", ["Manager", "Sales", "Marketing"]],
  ["/notifications", ALL],
  ["/roles", ALL],
];

export function getWebRole(id) {
  return WEB_ROLES.find((r) => r.id === id) || WEB_ROLES[0];
}

export function canAccess(roleId, path) {
  const match = ACCESS.filter(([prefix]) => path === prefix || path.startsWith(prefix + "/")).sort(
    (a, b) => b[0].length - a[0].length
  )[0];
  return match ? match[1].includes(roleId) : true;
}

// Management can act on every step; other roles only on steps they own or
// collaborate on.
export function canEditStep(roleId, step) {
  return roleId === "Manager" || ownsStep(step, roleId) || supportsStep(step, roleId);
}

// Steps 2-3 on a lead (estimate, measurement booking, conversion) are Sales work.
export function canWorkLead(roleId) {
  return roleId === "Manager" || roleId === "Sales";
}

// ---------- current role (localStorage + change event) ----------

const KEY = "wf_role_v1";
const EVENT = "wf-role-change";

// The signed-in role id, or "" when nobody is signed in.
export function getRoleId() {
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

export function signOut() {
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
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
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
