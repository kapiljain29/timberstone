"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert, Box, Detail, DetailGroup, LoadError } from "@/components/ui";
import { formatAmount, formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, SITE_API } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

// One site (POST /api/admin/sites/details): the site, its customer and
// what was agreed at booking. The stage-by-stage workflow (stages 4–12)
// comes back here as each stage is built on the API.
export default function SitePage() {
  const { id } = useParams();
  const can = useCan();
  const site = useApiData(SITE_API.details, { id }, { branchId: ALL_BRANCHES });
  const s = site.data;

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
            {[lead.full_name, s.branch_name && `Branch: ${s.branch_name}`, `Moved to Site ${formatDate(s.created_at)}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        {can("leads.view") && (
          <Link href={`/leads/${s.lead_id}`} className="wf-btn" style={{ marginBottom: 18 }}>
            Open Lead →
          </Link>
        )}
      </div>

      <Box title="Site">
        <DetailGroup>
          <Detail label="Site Code">{s.site_code}</Detail>
          <Detail label="Operation Head">{s.operation_head_name || "—"}</Detail>
          <Detail label="Expected Start">{formatDate(s.expected_start_date)}</Detail>
          <Detail label="Site Address" wide>
            <span style={{ whiteSpace: "pre-line" }}>{s.address}</span>
          </Detail>
          <Detail label="Moved to Site By">{s.created_by_name || "—"}</Detail>
          <Detail label="Note for the Operation Head" wide>
            {s.note || "—"}
          </Detail>
        </DetailGroup>
      </Box>

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

      <Alert tone="info">The stage-by-stage workflow (stages 4–12) will appear here as each stage goes live.</Alert>
    </div>
  );
}
