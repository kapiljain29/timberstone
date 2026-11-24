"use client";

// Payments (POST /api/admin/payments/*): every customer payment — the
// token given when a lead is Booked and the order's payments. Each one is
// recorded pending; Accounts (Payments → Confirm) marks it received —
// only then does it count (booking, the order's payment plan) — or
// rejects it.

import { useApiData } from "./useApi";

export const PAYMENT_API = {
  master: "/api/admin/payments/master",
  list: "/api/admin/payments/list",
  review: "/api/admin/payments/review",
};

// payment_status values (labels come from the master's payment_statuses).
export const PAYMENT_STATUS = { PENDING: "pending", RECEIVED: "received", REJECTED: "rejected" };

export function paymentStatusTone(status) {
  if (status === PAYMENT_STATUS.RECEIVED) return "done";
  if (status === PAYMENT_STATUS.PENDING) return "pending";
  return "idle";
}

/**
 * { payment_statuses, payment_types } for the Payments
 * screen. `master` is null until loaded.
 */
export function usePaymentMaster() {
  const { data, error, reload } = useApiData(PAYMENT_API.master);
  return { master: data, error, reload };
}
