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
};

// quotation_type → its name and the endpoint that reads it. The final one
// is made from the site's measurement (the API refuses it before that).
export const QUOTATION_TYPES = {
  tentative: { value: "tentative", label: "Tentative Quotation", path: QUOTATION_API.tentative },
  final: { value: "final", label: "Final Quotation", path: QUOTATION_API.final },
};

/**
 * { categories, areas, gst_rate } for the quotation form (products and
 * colours are searched as the user types). `master` is null until loaded.
 */
export function useQuotationMaster() {
  const { data, error, reload } = useApiData(QUOTATION_API.master);
  return { master: data, error, reload };
}

const paise = (rupees) => Math.round((Number(rupees) || 0) * 100);

/**
 * Totals for items [{ quantity, rate }] (strings or numbers): each amount,
 * subtotal, total (+ freight), GST at gstRate %, grand total (total + GST)
 * and total area — in rupees. "Rounded Off" (the rounded amount the
 * customer pays) is entered separately and never added to the grand total.
 */
export function quotationTotals(items, { freight, gstRate }) {
  const amounts = items.map((i) => Math.round((Number(i.quantity) || 0) * paise(i.rate)));
  const subtotal = amounts.reduce((a, b) => a + b, 0);
  const total = subtotal + paise(freight);
  const gst = Math.round((total * (Number(gstRate) || 0)) / 100);
  return {
    amounts: amounts.map((a) => a / 100),
    subtotal: subtotal / 100,
    total: total / 100,
    gstAmount: gst / 100,
    grandTotal: (total + gst) / 100,
    totalArea: items.reduce((a, i) => a + paise(i.quantity), 0) / 100,
  };
}
