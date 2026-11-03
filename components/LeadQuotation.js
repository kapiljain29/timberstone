"use client";

// The lead page's Tentative Quotation card (POST /quotations/tentative):
// the current version (ref no., date, area, grand total, PDF), Update
// (Quotations → Edit — saved as a new revision with its reason and PDF)
// and the full history, every revision with its own PDF. Without one yet:
// Create (Quotations → Add). Any lead, any status.

import { useState } from "react";
import { Box, DataTable, Detail, DetailGroup, LoadError } from "@/components/ui";
import QuotationForm from "@/components/QuotationForm";
import { formatAmount, formatDate, formatDateTime } from "@/lib/format";
import { QUOTATION_API } from "@/lib/quotation";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

/**
 * lead — /leads/details; onSaved() reloads it (booking pre-fills from the
 * quotation).
 */
export default function LeadQuotation({ lead, onSaved }) {
  const can = useCan();
  const quotation = useApiData(QUOTATION_API.tentative, { lead_id: lead.id }, { branchId: ALL_BRANCHES });
  // "create" | "update" | null — which form is open.
  const [editing, setEditing] = useState(null);
  const q = quotation.data;
  const current = q?.revisions[0] || null;
  // The current revision with its items, to start the update from.
  const currentItems = useApiData(editing === "update" && current ? QUOTATION_API.revision : null, { revision_id: current?.id }, { branchId: ALL_BRANCHES });

  if (!can("quotations.view")) return null;

  function saved() {
    setEditing(null);
    quotation.reload();
    onSaved();
  }

  if (editing === "create") {
    return <QuotationForm lead={lead} onSaved={saved} onCancel={() => setEditing(null)} />;
  }
  if (editing === "update") {
    if (currentItems.error) return <LoadError error={currentItems.error} onRetry={currentItems.reload} />;
    if (!currentItems.data || currentItems.data.id !== current.id) return <div className="wf-empty">Loading quotation…</div>;
    return <QuotationForm lead={lead} quotation={q} revision={currentItems.data} onSaved={saved} onCancel={() => setEditing(null)} />;
  }

  const pdfLink = (r, label = "Download PDF") =>
    r.pdf_url ? (
      <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="wf-link-btn">
        {label} ↗
      </a>
    ) : (
      <span className="wf-sub">PDF not generated</span>
    );

  return (
    <Box
      title={q ? `Tentative Quotation ${q.quotation_no}` : "Tentative Quotation"}
      right={
        q
          ? can("quotations.edit") && (
              <button type="button" className="wf-link-btn" onClick={() => setEditing("update")}>
                Update Quotation
              </button>
            )
          : can("quotations.add") && (
              <button type="button" className="wf-link-btn" onClick={() => setEditing("create")}>
                + Create Tentative Quotation
              </button>
            )
      }
    >
      <LoadError error={quotation.error} onRetry={quotation.reload} />
      {!quotation.data && quotation.loading ? (
        <div className="wf-empty">Loading quotation…</div>
      ) : !q ? (
        !quotation.error && <div className="wf-empty">No tentative quotation for this lead yet.</div>
      ) : (
        <>
          <DetailGroup title={`Current — ${current.ref_no}`}>
            <Detail label="Party">{current.party_name}</Detail>
            <Detail label="Date">{formatDate(current.quotation_date)}</Detail>
            <Detail label="Total Area">{`${Number(current.total_area).toLocaleString("en-IN")} sq.ft`}</Detail>
            <Detail label="Total (before GST)">{formatAmount(current.total)}</Detail>
            <Detail label={`GST @ ${current.gst_rate}%`}>{formatAmount(current.gst_amount)}</Detail>
            <Detail label="Grand Total">
              <strong>{formatAmount(current.grand_total)}</strong>
            </Detail>
            <Detail label="PDF">{pdfLink(current)}</Detail>
          </DetailGroup>
          <div className="wf-field">
            <label>History ({q.revisions.length})</label>
            <DataTable
              columns={["Version", "Saved", "By", "Grand Total", "Reason", "PDF"]}
              rows={q.revisions.map((r) => [
                <strong key="v">{r.ref_no}</strong>,
                formatDateTime(r.created_at),
                r.created_by_name || "—",
                formatAmount(r.grand_total),
                r.remark || (r.revision === 0 ? "First version" : "—"),
                <span key="p">{pdfLink(r, "PDF")}</span>,
              ])}
            />
          </div>
        </>
      )}
    </Box>
  );
}
