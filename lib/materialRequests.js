"use client";

// Extra material for a site (material requests): a site's supervisor asks
// for more of the approved Final Quotation's lines from the Supervisor app,
// the site's Operation Head approves or rejects it on the panel, and the
// approved quantity can then be ordered by Accounts (extra_quantity on the
// order's lines). timberstone-api services/materialRequest.service.js.

import { useEffect } from "react";
import { POLL_MS } from "./notifications";
import { ALL_BRANCHES } from "./team";
import { useApiData } from "./useApi";

export const MATERIAL_REQUEST_API = {
  // Supervisor app: { can_request, blocked_reason, lines, requests } / a new request.
  app: "/api/mobile/sites/material-requests",
  create: "/api/mobile/sites/material-requests/create",
  // Panel: the site page's card ({ can_decide, requests }), the Material
  // Requests screen (every site — items, counts incl. to_decide), approve / reject.
  site: "/api/admin/sites/material-requests",
  list: "/api/admin/sites/material-requests/list",
  decide: "/api/admin/sites/material-requests/decide",
};

// material_requests.request_status (labels come with each request).
export const MATERIAL_REQUEST_STATUS = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" };
export const MATERIAL_REQUEST_DECISION = { APPROVE: "approve", REJECT: "reject" };

export function materialRequestTone(status) {
  return status === MATERIAL_REQUEST_STATUS.APPROVED ? "done" : status === MATERIAL_REQUEST_STATUS.REJECTED ? "idle" : "pending";
}

// "12.5" → "12.5 sq.ft" (Indian grouping).
export const sqft = (n) => `${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })} sq.ft`;

const CHANGED = "wf-material-requests-change";

// Call after approving / rejecting, so the sidebar badge updates at once.
export function materialRequestsChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

/**
 * How many pending requests wait for the signed-in user's decision (the
 * sites they are Operation Head of; every one for a Super Admin) — the
 * sidebar badge. Reloads every minute and after materialRequestsChanged().
 * enabled = false (no API session / no Sites → View) skips it.
 */
export function useMaterialRequestsToDecide(enabled) {
  const list = useApiData(enabled ? MATERIAL_REQUEST_API.list : null, { request_status: "pending", page: 1, limit: 1 }, { branchId: ALL_BRANCHES });
  const { reload } = list;
  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(reload, POLL_MS);
    window.addEventListener(CHANGED, reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener(CHANGED, reload);
    };
  }, [enabled, reload]);
  return enabled ? list.data?.counts?.to_decide || 0 : 0;
}
