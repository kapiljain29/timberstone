"use client";

// The lead page's quotation card, for its Tentative Quotation (POST
// /quotations/tentative — any lead, any status) or its Final Quotation
// (/quotations/final — made from the site's measurement, so it can be
// created only once the lead's site has one; it starts from the tentative
// quotation's lines). Shows the current version (ref no., date, area,
// grand total, PDF), Update (Quotations → Edit — saved as a new revision
// with its reason and PDF) and the full history, every revision with its
// own PDF. Without one yet: Create (Quotations → Add).

import { useState } from "react";
import { Alert, Box, DataTable, Detail, DetailGroup, LoadError } from "@/components/ui";
import QuotationForm from "@/components/QuotationForm";
import { formatAmount, formatDate, formatDateTime } from "@/lib/format";
import { QUOTATION_API, QUOTATION_TYPES } from "@/lib/quotation";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

/**
 * lead — /leads/details; type — "tentative" (default) / "final";
 * onSaved() reloads the lead (booking pre-fills from the quotation).
 */
export default function LeadQuotation({ lead, type = "tentative", onSaved }) {
  const can = useCan();
  const kind = QUOTATION_TYPES[type];
  const isFinal = type === "final";
  // Final: the site's measurement in use ({ version, submitted_at }) — needed to create it.
  const measured = lead.site?.latest_measurement || null;
  const quotation = useApiData(kind.path, { lead_id: lead.id }, { branchId: ALL_BRANCHES });
  // "create" | "update" | null — which form is open.
  const [editing, setEditing] = useState(null);
  const q = quotation.data;
  const current = q?.revisions[0] || null;
  // The current revision with its items, to start the update from.
  const currentItems = useApiData(editing === "update" && current ? QUOTATION_API.revision : null, { revision_id: current?.id }, { branchId: ALL_BRANCHES });
  // A new final quotation starts from the tentative one's current lines.
  const tentative = useApiData(isFinal && editing === "create" ? QUOTATION_API.tentative : null, { lead_id: lead.id }, { branchId: ALL_BRANCHES });
  const tentativeCurrentId = tentative.data?.revisions[0]?.id || null;
  const tentativeItems = useApiData(tentativeCurrentId ? QUOTATION_API.revision : null, { revision_id: tentativeCurrentId }, { branchId: ALL_BRANCHES });

  if (!can("quotations.view")) return null;

  function saved() {
    setEditing(null);
    quotation.reload();
    onSaved();
  }

  if (editing === "create") {
    if (isFinal) {
      const loadError = tentative.error || tentativeItems.error;
      if (loadError) return <LoadError error={loadError} onRetry={tentative.error ? tentative.reload : tentativeItems.reload} />;
      const ready = tentative.data !== null ? !tentativeCurrentId || tentativeItems.data?.id === tentativeCurrentId : !tentative.loading;
      if (!ready) return <div className="wf-empty">Loading the tentative quotation…</div>;
    }
    const startFrom = isFinal && tentativeCurrentId ? tentativeItems.data : null;
    return <QuotationForm lead={lead} type={type} revision={startFrom} onSaved={saved} onCancel={() => setEditing(null)} />;
  }
  if (editing === "update") {
    if (currentItems.error) return <LoadError error={currentItems.error} onRetry={currentItems.reload} />;
    if (!currentItems.data || currentItems.data.id !== current.id) return <div className="wf-empty">Loading quotation…</div>;
    return <QuotationForm lead={lead} type={type} quotation={q} revision={currentItems.data} onSaved={saved} onCancel={() => setEditing(null)} />;
  }

  const canCreate = can("quotations.add") && (!isFinal || measured);
  // Final: a newer measurement than the current version.
  const newerMeasurement = isFinal && q && measured && current && new Date(measured.submitted_at) > new Date(current.created_at);

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
      title={q ? `${kind.label} ${q.quotation_no}` : kind.label}
      right={
        q
          ? can("quotations.edit") && (
              <button type="button" className="wf-link-btn" onClick={() => setEditing("update")}>
                Update Quotation
              </button>
            )
          : canCreate && (
              <button type="button" className="wf-link-btn" onClick={() => setEditing("create")}>
                {`+ Create ${kind.label}`}
              </button>
            )
      }
    >
      <LoadError error={quotation.error} onRetry={quotation.reload} />
      {!quotation.data && quotation.loading ? (
        <div className="wf-empty">Loading quotation…</div>
      ) : !q ? (
        !quotation.error && (
          <div className="wf-empty">
            {isFinal && !measured
              ? "The Final Quotation can be made once the site's supervisor uploads the measurement."
              : isFinal
                ? can("quotations.add")
                  ? `No final quotation yet — make it from the site's measurement v${measured.version}.`
                  : `No final quotation yet — Sales makes it from the site's measurement v${measured.version}.`
                : "No tentative quotation for this lead yet."}
          </div>
        )
      ) : (
        <>
          {newerMeasurement && (
            <Alert tone="info">{`Measurement v${measured.version} was uploaded after this version — update the quotation if the measurements changed.`}</Alert>
          )}
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
