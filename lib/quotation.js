"use client";

// Tentative and final quotations on a lead (POST /api/admin/quotations/*):
// API paths, the form's lists and the totals shown while typing. The API calculates
// the saved amounts the same way (timberstone-api services/quotation.service.js)
// — this is only the live preview.

import { useApiData } from "./useApi";

export const QUOTATION_API = {
  master: "/api/admin/quotations/master",
  // Autocomplete: a category's products / a product's colours.
  products: "/api/admin/quotations/products",
  colors: "/api/admin/quotations/colors",
  tentative: "/api/admin/quotations/tentative",
  final: "/api/admin/quotations/final",
  revision: "/api/admin/quotations/revision",
  create: "/api/admin/quotations/create",
  update: "/api/admin/quotations/update",
  // The client's answer: approved / rejected / reopened (undo an approval).
  clientDecision: "/api/admin/quotations/client-decision",
};

// quotations.client_status (labels come from the master's client_statuses).
export const CLIENT_STATUS = { PENDING: "pending", APPROVED: "approved", REJECTED: "rejected" };
export const CLIENT_DECISION = { APPROVED: "approved", REJECTED: "rejected", REOPENED: "reopened" };

export function clientStatusTone(status) {
  return status === CLIENT_STATUS.APPROVED ? "done" : status === CLIENT_STATUS.REJECTED ? "idle" : "pending";
}

// quotation_type → its name and the endpoint that reads it. The final one
// is made from the site's measurement (the API refuses it before that).
export const QUOTATION_TYPES = {
  tentative: { value: "tentative", label: "Tentative Quotation", path: QUOTATION_API.tentative },
  final: { value: "final", label: "Final Quotation", path: QUOTATION_API.final },
};

/**
 * { categories, areas, gst_rate, discount_slabs } for the quotation form (products and
 * colours are searched as the user types). `master` is null until loaded.
 */
export function useQuotationMaster() {
  const { data, error, reload } = useApiData(QUOTATION_API.master);
  return { master: data, error, reload };
}

const paise = (rupees) => Math.round((Number(rupees) || 0) * 100);

/**
 * The discount % for an amount: the highest slab ([{ min_amount,
 * discount_pct }], the master's discount_slabs) the amount reaches; 0 when
 * none. Same rule as the API (services/quotation.service.js slabFor).
 */
export function slabFor(slabs, amount) {
  let pct = 0;
  for (const slab of slabs || []) if ((Number(amount) || 0) >= Number(slab.min_amount)) pct = Number(slab.discount_pct);
  return pct;
}

/**
 * Lines [{ quantity, rate }] less discountPct %: { amounts, gross,
 * discountAmount, net } in rupees — a quotation, or an order part (with
 * the approved quotation's %).
 */
export function discounted(items, discountPct) {
  const amounts = items.map((i) => Math.round((Number(i.quantity) || 0) * paise(i.rate)));
  const gross = amounts.reduce((a, b) => a + b, 0);
  const discount = Math.round((gross * (Number(discountPct) || 0)) / 100);
  return { amounts: amounts.map((a) => a / 100), gross: gross / 100, discountAmount: discount / 100, net: (gross - discount) / 100 };
}

/**
 * Totals for items [{ quantity, rate }] (strings or numbers): each amount,
 * subtotal, the discount (the slab the subtotal reaches — % and amount),
 * total (subtotal − discount + freight), GST at gstRate %, grand total
 * (total + GST) and total area — in rupees. "Rounded Off" (the rounded
 * amount the customer pays) is entered separately and never added to the
 * grand total.
 */
export function quotationTotals(items, { freight, gstRate, slabs }) {
  const lines = discounted(items, 0);
  const discountPct = slabFor(slabs, lines.gross);
  const { discountAmount, net } = discounted(items, discountPct);
  const total = paise(net) + paise(freight);
  const gst = Math.round((total * (Number(gstRate) || 0)) / 100);
  return {
    amounts: lines.amounts,
    subtotal: lines.gross,
    discountPct,
    discountAmount,
    total: total / 100,
    gstAmount: gst / 100,
    grandTotal: (total + gst) / 100,
    totalArea: items.reduce((a, i) => a + paise(i.quantity), 0) / 100,
  };
}
