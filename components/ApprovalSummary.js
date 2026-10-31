// What an approval request asks for, in one line, per type (POST
// /api/admin/approvals/* items) — on the Approvals list and request page.
// Add a type here when the API gets one (services/approval.service.js).

import { formatAmount } from "@/lib/format";

const SUMMARIES = {
  // Mark a lead Booked without the full token: payload { to_status_name,
  // token_paid, token_min_amount, tentative_area, tentative_quotation_amount }.
  token_bypass: (a) => {
    const p = a.payload || {};
    const token = p.token_paid ? `${formatAmount(p.token_paid)} token received` : "no token received";
    const deal = [
      p.tentative_quotation_amount && `quotation ${formatAmount(p.tentative_quotation_amount)}`,
      p.tentative_area && `${Number(p.tentative_area).toLocaleString("en-IN")} sq.ft`,
    ].filter(Boolean);
    return (
      `Mark ${a.lead_name || "the lead"} ${p.to_status_name || "Booked"} with ${token}` +
      `${p.token_min_amount ? ` (minimum ${formatAmount(p.token_min_amount)})` : ""}` +
      `${deal.length ? ` — tentative ${deal.join(", ")}` : ""}`
    );
  },
};

export function ApprovalSummary({ approval }) {
  const summary = SUMMARIES[approval.type];
  return <span>{summary ? summary(approval) : approval.title}</span>;
}
