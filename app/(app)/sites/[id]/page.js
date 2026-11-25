"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Alert, Box, Detail, DetailGroup, LoadError, TabBar } from "@/components/ui";
import SiteSupervisor from "@/components/SiteSupervisor";
import SiteMeasurements from "@/components/SiteMeasurements";
import SiteMaterialRequests, { useSiteMaterialRequests } from "@/components/SiteMaterialRequests";
import SiteContractors from "@/components/SiteContractors";
import FinalQuotationStep, { finalQuotationNextStep } from "@/components/FinalQuotationStep";
import OrderPayments from "@/components/OrderPayments";
import OrderChallans from "@/components/OrderChallans";
import OrderStatus from "@/components/OrderStatus";
import { formatAmount, formatDate } from "@/lib/format";
import { MATERIAL_REQUEST_STATUS } from "@/lib/materialRequests";
import { ORDER_STAGE } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, LEAD_API, SITE_API, supervisorNames } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

// One site (POST /api/admin/sites/details). At the top, the site's
// progress in five steps (Measurement → Final Quotation → Order → Dispatch
// → Delivery, from `latest_measurement` and `order_status`) and the next
// step; below, one tab per part of the work, so only what is being looked
// at is on screen. Clicking a step opens its tab; the open tab is kept in
// the URL (?tab=) so a link or a reload comes back to it.

const TAB = {
  OVERVIEW: "overview",
  MEASUREMENT: "measurement",
  QUOTATION: "quotation",
  ORDER: "order",
  DELIVERY: "delivery",
  CONTRACTORS: "contractors",
  MATERIALS: "materials",
};

const SHIPPED = [ORDER_STAGE.DISPATCHED, ORDER_STAGE.SHORT_DELIVERED, ORDER_STAGE.DELIVERED];

/**
 * The site's five steps — [{ key, title, tab, done, state }] — and the
 * next one to do ({ text, tab }, or null when everything is delivered).
 */
function siteJourney(s) {
  const measured = s.latest_measurement;
  const order = s.order_status; // set once the client approved the Final Quotation
  const stage = order?.stage;
  const placed = Boolean(order?.order_count);
  const steps = [
    {
      key: "measurement",
      title: "Measurement",
      tab: TAB.MEASUREMENT,
      done: Boolean(measured),
      state: measured ? `v${measured.version} · ${formatDate(measured.submitted_at)}` : "Waiting for the supervisor",
    },
    {
      key: "quotation",
      title: "Final Quotation",
      tab: TAB.QUOTATION,
      done: Boolean(order),
      state: order ? "Approved by the client" : measured ? "To make and get approved" : "After the measurement",
    },
    {
      key: "order",
      title: "Order",
      tab: TAB.ORDER,
      done: placed,
      state: placed
        ? `${order.order_no}${order.order_count > 1 ? ` +${order.order_count - 1} part${order.order_count > 2 ? "s" : ""}` : ""}`
        : stage === ORDER_STAGE.READY_FOR_ORDER
          ? "Advance received — ready to order"
          : order
            ? "Collecting the advance"
            : "After the quotation",
    },
    {
      key: "dispatch",
      title: "Dispatch",
      tab: TAB.DELIVERY,
      done: SHIPPED.includes(stage),
      state: SHIPPED.includes(stage) ? "All material dispatched" : placed ? order.stage_label : "After the order",
    },
    {
      key: "delivery",
      title: "Delivery",
      tab: TAB.DELIVERY,
      done: stage === ORDER_STAGE.DELIVERED,
      state: SHIPPED.includes(stage) ? order.stage_label : "After dispatch",
    },
  ];

  const current = steps.find((st) => !st.done);
  const NEXT = {
    measurement: "The site's supervisor uploads the measurement from the Supervisor app.",
    quotation: measured
      ? `Sales makes the Final Quotation from measurement v${measured.version} and marks the client's approval.`
      : "Sales makes the Final Quotation once the measurement is in.",
    order:
      stage === ORDER_STAGE.READY_FOR_ORDER
        ? "The advance is in — Accounts places the order."
        : "Collect the advance from the client; then Accounts places the order.",
    dispatch:
      stage === ORDER_STAGE.AWAITING_DISPATCH_PAYMENT
        ? "Collect the before-dispatch payment; then Accounts dispatches the material."
        : "Accounts dispatches the material with delivery challans.",
    delivery:
      stage === ORDER_STAGE.SHORT_DELIVERED
        ? "Some items arrived short — Accounts sends the missing items."
        : "The site's supervisor confirms each delivery in the Supervisor app.",
  };
  return { steps, currentKey: current?.key, next: current ? { text: NEXT[current.key], tab: current.tab } : null };
}

export default function SitePage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading site…</div>}>
      <Site />
    </Suspense>
  );
}

function Site() {
  const { id } = useParams();
  const params = useSearchParams();
  const router = useRouter();
  const can = useCan();
  const site = useApiData(SITE_API.details, { id }, { branchId: ALL_BRANCHES });
  const s = site.data;
  const tab = Object.values(TAB).includes(params.get("tab")) ? params.get("tab") : TAB.OVERVIEW;
  // Bumped when the Final Quotation changes (e.g. approved) — reloads Order & Payments.
  const [orderRefresh, setOrderRefresh] = useState(0);
  // Bumped after a payment / the order is created — reloads Delivery Challans.
  const [challanRefresh, setChallanRefresh] = useState(0);
  // The site's lead, for the Final Quotation step (needs Leads → View).
  const canOpenLead = can("leads.view");
  const leadDetails = useApiData(s && canOpenLead ? LEAD_API.details : null, { id: s?.lead_id }, { branchId: ALL_BRANCHES });
  const requests = useSiteMaterialRequests(s?.id);

  function openTab(next) {
    router.replace(`/sites/${id}${next === TAB.OVERVIEW ? "" : `?tab=${next}`}`, { scroll: false });
  }

  if (!s) {
    if (site.error?.status === 404) {
      return (
        <div className="wf-noaccess">
          <div className="wf-noaccess-icon">🔒</div>
          <h1 className="wf-h1" style={{ justifyContent: "center" }}>
            Site not found
          </h1>
          <p className="wf-sub">It doesn&apos;t exist, or it isn&apos;t in your branches or your sites.</p>
          <Link href="/sites" className="wf-btn primary">
            Back to sites
          </Link>
        </div>
      );
    }
    return site.error ? <LoadError error={site.error} onRetry={site.reload} /> : <div className="wf-empty">Loading site…</div>;
  }

  const lead = s.lead || {};
  const journey = siteJourney(s);
  const pendingRequests = (requests.data?.requests || []).filter((r) => r.request_status === MATERIAL_REQUEST_STATUS.PENDING).length;
  const tabs = [
    { value: TAB.OVERVIEW, label: "Overview" },
    { value: TAB.MEASUREMENT, label: "Measurement", tag: s.latest_measurement ? `v${s.latest_measurement.version}` : undefined },
    { value: TAB.QUOTATION, label: "Final Quotation" },
    { value: TAB.ORDER, label: "Order & Payments" },
    { value: TAB.DELIVERY, label: "Delivery" },
    { value: TAB.CONTRACTORS, label: "Contractors" },
    { value: TAB.MATERIALS, label: "Material Requests", tag: pendingRequests || undefined },
  ];

  return (
    <div>
      <div className="wf-crumb">
        Site Execution / <Link href="/sites">Sites</Link>
      </div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">
            {s.site_code} — {s.site_name}
          </h1>
          <p className="wf-sub">
            {[lead.company_name ? `${lead.full_name} · ${lead.company_name}` : lead.full_name, s.branch_name, `Operation Head: ${s.operation_head_name || "—"}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {canOpenLead && (
          <Link href={`/leads/${s.lead_id}`} className="wf-btn" style={{ marginBottom: 18 }}>
            Open Lead →
          </Link>
        )}
      </div>

      <div className="wf-journey" aria-label="Site progress">
        {journey.steps.map((st, i) => (
          <button
            key={st.key}
            type="button"
            className={`wf-journey-step ${st.done ? "done" : st.key === journey.currentKey ? "current" : "upcoming"}${tab === st.tab ? " active" : ""}`}
            onClick={() => openTab(st.tab)}
          >
            <span className="wf-journey-num">{st.done ? `✓ Step ${i + 1}` : `Step ${i + 1}`}</span>
            <span className="wf-journey-title">{st.title}</span>
            <span className="wf-journey-state">{st.state}</span>
          </button>
        ))}
      </div>

      {journey.next ? (
        <div className="wf-next-step">
          <span>
            <strong>Next step</strong>
            {journey.next.text}
          </span>
          {tab !== journey.next.tab && (
            <button type="button" className="wf-btn primary" onClick={() => openTab(journey.next.tab)}>
              Open →
            </button>
          )}
        </div>
      ) : (
        <div className="wf-next-step done">
          <span>
            <strong>All delivered</strong>
            Every order part has reached the site.
          </span>
        </div>
      )}

      <TabBar tabs={tabs} value={tab} onChange={openTab} label="Site sections" />

      {tab === TAB.OVERVIEW && (
        <>
          <Box title="Site">
            <DetailGroup>
              <Detail label="Site Code">{s.site_code}</Detail>
              <Detail label="Operation Head">{s.operation_head_name || "—"}</Detail>
              <Detail label="Supervisors">{supervisorNames(s, "Not assigned yet")}</Detail>
              <Detail label="Expected Start">{formatDate(s.expected_start_date)}</Detail>
              <Detail label="Order">
                <OrderStatus status={s.order_status} empty="Not yet — after the client approves the Final Quotation" />
              </Detail>
              <Detail label="Moved to Site">{`${formatDate(s.created_at)}${s.created_by_name ? ` by ${s.created_by_name}` : ""}`}</Detail>
              <Detail label="Site Address" wide>
                <span style={{ whiteSpace: "pre-line" }}>{s.address}</span>
              </Detail>
              {s.note && (
                <Detail label="Note for the Operation Head" wide>
                  {s.note}
                </Detail>
              )}
            </DetailGroup>
          </Box>

          <SiteSupervisor site={s} onChanged={site.reload} />

          <Box title="Customer & Booking">
            <DetailGroup>
              <Detail label="Customer">{lead.full_name || "—"}</Detail>
              <Detail label="Company">{lead.company_name || "—"}</Detail>
              <Detail label="Mobile">{formatPhone(lead.country_code, lead.mobile_number)}</Detail>
              <Detail label="Email">{lead.email || "—"}</Detail>
              <Detail label="Lead Status">{lead.status_name || "—"}</Detail>
              <Detail label="Tentative Area">
                {lead.tentative_area ? `${Number(lead.tentative_area).toLocaleString("en-IN")} sq.ft` : "—"}
              </Detail>
              <Detail label="Tentative Quotation">{lead.tentative_quotation_amount ? formatAmount(lead.tentative_quotation_amount) : "—"}</Detail>
              <Detail label="Token Received">{formatAmount(s.token_paid)}</Detail>
            </DetailGroup>
          </Box>
        </>
      )}

      {tab === TAB.MEASUREMENT && <SiteMeasurements siteId={s.id} />}

      {tab === TAB.QUOTATION &&
        (canOpenLead ? (
          leadDetails.error ? (
            <LoadError error={leadDetails.error} onRetry={leadDetails.reload} />
          ) : leadDetails.data ? (
            <FinalQuotationStep
              lead={leadDetails.data}
              onSaved={() => {
                leadDetails.reload();
                site.reload();
                setOrderRefresh((n) => n + 1);
              }}
            />
          ) : (
            <div className="wf-empty">Loading quotation…</div>
          )
        ) : (
          <Alert tone="info">{finalQuotationNextStep(s.latest_measurement)}</Alert>
        ))}

      {tab === TAB.ORDER && !can("orders.view") && <Alert tone="info">The order and its payments need Orders &amp; Payments → View.</Alert>}
      {tab === TAB.ORDER && (
        <OrderPayments
          leadId={s.lead_id}
          refreshKey={orderRefresh}
          onChanged={() => {
            setChallanRefresh((n) => n + 1);
            site.reload();
          }}
        />
      )}

      {tab === TAB.DELIVERY && !can("challans.view") && <Alert tone="info">Delivery challans need Delivery Challans → View.</Alert>}
      {tab === TAB.DELIVERY && can("challans.view") && !s.order_status?.order_count && (
        <Alert tone="info">Delivery challans appear here once the order is placed.</Alert>
      )}
      {tab === TAB.DELIVERY && (
        <OrderChallans
          leadId={s.lead_id}
          refreshKey={challanRefresh}
          onChanged={() => {
            setOrderRefresh((n) => n + 1);
            site.reload();
          }}
        />
      )}

      {tab === TAB.CONTRACTORS && <SiteContractors siteId={s.id} />}

      {tab === TAB.MATERIALS && (
        <SiteMaterialRequests
          list={requests}
          onDecided={() => {
            setOrderRefresh((n) => n + 1);
            site.reload();
          }}
        />
      )}
    </div>
  );
}
