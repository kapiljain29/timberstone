"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import OrderPayments from "@/components/OrderPayments";
import OrderChallans from "@/components/OrderChallans";
import { LoadError } from "@/components/ui";
import { ORDER_API } from "@/lib/orders";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

// One lead's Order & Payments, for Accounts (who may not open leads): the
// customer, the approved Final Quotation, the payment plan, payments and
// the order. Notifications about orders link here.
export default function OrderPage() {
  const { leadId } = useParams();
  const can = useCan();
  const summary = useApiData(ORDER_API.summary, { lead_id: leadId }, { branchId: ALL_BRANCHES });
  // Bumped after a payment / the order is created — reloads Delivery Challans.
  const [challanRefresh, setChallanRefresh] = useState(0);
  const s = summary.data;

  if (!s) {
    if (summary.error?.status === 404) {
      return (
        <div className="wf-noaccess">
          <div className="wf-noaccess-icon">🔒</div>
          <h1 className="wf-h1" style={{ justifyContent: "center" }}>
            Order not found
          </h1>
          <p className="wf-sub">It doesn&apos;t exist, or it isn&apos;t in your branches or your records.</p>
          <Link href="/orders" className="wf-btn primary">
            Back to orders
          </Link>
        </div>
      );
    }
    return summary.error ? <LoadError error={summary.error} onRetry={summary.reload} /> : <div className="wf-empty">Loading order…</div>;
  }

  return (
    <div>
      <div className="wf-crumb">
        Site Execution / <Link href="/orders">Orders</Link>
      </div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">{s.order ? `${s.order.order_no} — ${s.lead.company_name || s.lead.full_name}` : s.lead.company_name || s.lead.full_name}</h1>
          <p className="wf-sub">
            {[s.lead.company_name && s.lead.full_name, s.lead.site && `Site ${s.lead.site.site_code}`, s.lead.branch_name && `Branch: ${s.lead.branch_name}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {can("leads.view") && (
          <Link href={`/leads/${s.lead.id}`} className="wf-btn" style={{ marginBottom: 18 }}>
            Open Lead →
          </Link>
        )}
      </div>
      <OrderPayments leadId={leadId} onChanged={() => setChallanRefresh((n) => n + 1)} />
      <OrderChallans leadId={leadId} refreshKey={challanRefresh} />
    </div>
  );
}
