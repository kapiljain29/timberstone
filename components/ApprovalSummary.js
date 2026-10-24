// What an approval request asks for, in one line, per type (POST
// /api/admin/approvals/* items) — on the Approvals list and request page.
// Add a type here when the API gets one (services/approval.service.js).

import { formatAmount } from "@/lib/format";

const SUMMARIES = {
  // Mark a lead Booked without the full token: payload { to_status_name,
  // token_paid, token_min_amount }.
  token_bypass: (a) => {
    const { to_status_name: status, token_paid: paid, token_min_amount: min } = a.payload || {};
    const token = paid ? `${formatAmount(paid)} token received` : "no token received";
    return `Mark ${a.lead_name || "the lead"} ${status || "Booked"} with ${token}${min ? ` (minimum ${formatAmount(min)})` : ""}`;
  },
};

export function ApprovalSummary({ approval }) {
  const summary = SUMMARIES[approval.type];
  return <span>{summary ? summary(approval) : approval.title}</span>;
}
