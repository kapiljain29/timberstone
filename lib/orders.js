"use client";

// Orders & payments (POST /api/admin/orders/*): the approved Final
// Quotation's payment plan, the customer's payments and the order — placed
// in parts (one work order per part), with samples for the products that
// need one.
// The API calculates every amount (timberstone-api services/order.service.js).

import { useApiData } from "./useApi";

export const ORDER_API = {
  master: "/api/admin/orders/master",
  list: "/api/admin/orders/list",
  summary: "/api/admin/orders/summary",
  recordPayment: "/api/admin/orders/record-payment",
  // Place an order part.
  create: "/api/admin/orders/create",
  // Sales uploads a sample for a quotation line (multipart).
  uploadSample: "/api/admin/orders/upload-sample",
};

// plan.stage values (labels come from the master's order_stages).
export const ORDER_STAGE = {
  AWAITING_ADVANCE: "awaiting_advance",
  READY_FOR_ORDER: "ready_for_order",
  AWAITING_DISPATCH_PAYMENT: "awaiting_dispatch_payment",
  READY_TO_DISPATCH: "ready_to_dispatch",
  PARTLY_DISPATCHED: "partly_dispatched",
  DISPATCHED: "dispatched",
  // Every challan confirmed, but some items arrived short (a follow-up is due).
  SHORT_DELIVERED: "short_delivered",
  DELIVERED: "delivered",
};

// Payment types a payment can be recorded as (the token is recorded when
// booking) — the same keys as the plan's instalments.
export const ORDER_PAYMENT_TYPE = { ADVANCE: "advance", DISPATCH: "dispatch", PROGRESS: "progress", HANDOVER: "handover" };

export function orderStageTone(stage) {
  if (stage === ORDER_STAGE.DELIVERED) return "done";
  if ([ORDER_STAGE.READY_FOR_ORDER, ORDER_STAGE.READY_TO_DISPATCH, ORDER_STAGE.PARTLY_DISPATCHED, ORDER_STAGE.DISPATCHED].includes(stage)) return "current";
  return "pending";
}

/**
 * { payment_types (advance / dispatch), order_stages, sample_extensions,
 * sample_max_files } for
 * the payment form and the Orders screen. `master` is null until loaded.
 */
export function useOrderMaster() {
  const { data, error, reload } = useApiData(ORDER_API.master);
  return { master: data, error, reload };
}
