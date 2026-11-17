"use client";

// Delivery challans (POST /api/admin/challans/*): an order's material
// dispatched in parts by Accounts; each part's delivery is confirmed by the
// site's supervisor in the Supervisor app (/api/mobile/sites/delivery/confirm).

import { useApiData } from "./useApi";

export const CHALLAN_API = {
  master: "/api/admin/challans/master",
  forOrder: "/api/admin/challans/for-order",
  create: "/api/admin/challans/create",
  // Mark the order fully dispatched (the last part wasn't marked).
  completeDispatch: "/api/admin/challans/complete-dispatch",
};

// delivery_status values (labels come from the master's delivery_statuses).
export const CHALLAN_STATUS = { DISPATCHED: "dispatched", DELIVERED: "delivered" };

// Multipart fields of the delivery confirmation (Supervisor app).
export const CHALLAN_PHOTO_FIELDS = { signedChallan: "signed_challan", materialPhotos: "material_photos" };

export function challanStatusTone(status) {
  return status === CHALLAN_STATUS.DELIVERED ? "done" : "pending";
}

/**
 * { units (suggestions), delivery_statuses, file_kinds } — `master` is null
 * until loaded.
 */
export function useChallanMaster() {
  const { data, error, reload } = useApiData(CHALLAN_API.master);
  return { master: data, error, reload };
}
