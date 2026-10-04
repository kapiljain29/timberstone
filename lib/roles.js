"use client";

// Role-wise access for the web app. There is no real login in the
// wireframe: picking a role on the Role Hub "logs in" as that role's demo
// user, and the choice is kept in localStorage. Each role sees only the
// menus, pages and records it is allowed to.

import { useSyncExternalStore } from "react";
import { ownsStep, supportsStep } from "./stages";

export const WEB_ROLES = [
  { id: "Manager", label: "Management", user: "Rahul Sharma", home: "/dashboard" },
  { id: "Sales", label: "Sales", user: "Vivek Rane", home: "/call-queue" },
  { id: "Marketing", label: "Marketing", user: "Sonal Bhatt", home: "/leads" },
  { id: "Design", label: "Design", user: "Aditi Saxena", home: "/projects" },
  { id: "Accounts", label: "Accounts", user: "Rajesh Khandelwal", home: "/projects" },
  { id: "Supervisor", label: "Supervisor", user: "Ramesh Kadam", home: "/projects" },
];

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

export function getRoleId() {
  try {
    return window.localStorage.getItem(KEY) || "Manager";
  } catch {
    return "Manager";
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

function subscribe(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// The current role object, or null during server render / hydration.
export function useRole() {
  const id = useSyncExternalStore(subscribe, getRoleId, () => null);
  return id ? getWebRole(id) : null;
}
