// A payment's status (pending / received / rejected) as a badge, with who
// reviewed it — and their remark — as a tooltip. `statuses` = the Payments
// master's payment_statuses (optional: cards that don't load that master
// use the built-in labels).

import { Badge } from "@/components/ui";
import { paymentStatusTone } from "@/lib/payments";
import { optionLabel } from "@/lib/team";

const LABELS = { pending: "Pending confirmation", received: "Received", rejected: "Rejected" };

export default function PaymentStatusBadge({ payment, statuses }) {
  const label = (statuses && optionLabel(statuses, payment.payment_status)) || LABELS[payment.payment_status] || payment.payment_status;
  const by = payment.reviewed_by_name ? `${label} by ${payment.reviewed_by_name}${payment.review_remark ? ` — ${payment.review_remark}` : ""}` : undefined;
  return (
    <span title={by}>
      <Badge tone={paymentStatusTone(payment.payment_status)}>{label}</Badge>
    </span>
  );
}
