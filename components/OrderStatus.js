// A site's / lead's order status (`order_status` from the API: { order_no
// (the first part's), order_count, stage, stage_label } or null): the order
// number (+ how many more parts) and its stage as a badge, or "—" before
// the client approved the Final Quotation.

import { Badge } from "@/components/ui";
import { orderStageTone } from "@/lib/orders";

export default function OrderStatus({ status, empty = "—" }) {
  if (!status) return empty;
  return (
    <span>
      {status.order_no && <strong>{`${status.order_no}${status.order_count > 1 ? ` +${status.order_count - 1}` : ""} `}</strong>}
      <Badge tone={orderStageTone(status.stage)}>{status.stage_label}</Badge>
    </span>
  );
}
