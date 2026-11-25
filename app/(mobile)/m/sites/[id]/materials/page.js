"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, FieldError, LoadError } from "@/components/ui";
import { MCard, MEmpty, MIcon, MSectionTitle } from "@/components/MobileUI";
import { formatDateTime } from "@/lib/format";
import { MATERIAL_REQUEST_API, materialRequestTone, sqft } from "@/lib/materialRequests";
import { ALL_BRANCHES } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

// Extra Material for a site (Supervisor app): ask for more of the items on
// the client's approved Final Quotation (POST /api/mobile/sites/
// material-requests → lines + requests), with the reason. The site's
// Operation Head approves or rejects it; once approved, Accounts orders it.
export default function MobileMaterialsPage() {
  const { id } = useParams();
  const page = useApiData(MATERIAL_REQUEST_API.app, { site_id: id }, { branchId: ALL_BRANCHES });
  const d = page.data;
  const backHref = `/m/sites/${id}`;

  return (
    <div>
      <Link href={backHref} className="wf-mback">
        <MIcon name="back" size={16} /> Site
      </Link>
      <h1 className="wf-mtitle">Extra Material</h1>
      <p className="wf-msub">Ask for more of the items quoted to the client. The Operation Head approves it, then Accounts orders it.</p>

      {!d ? (
        page.error?.status === 404 ? (
          <MEmpty icon="alert" title="Site not found" sub="It isn't one of your sites any more." />
        ) : page.error ? (
          <LoadError error={page.error} onRetry={page.reload} />
        ) : (
          <div className="wf-empty">Loading…</div>
        )
      ) : (
        <>
          {d.can_request ? (
            <RequestForm siteId={id} lines={d.lines} onSent={page.reload} />
          ) : (
            <MEmpty icon="lock" title="Not yet" sub={d.blocked_reason} />
          )}

          {d.requests.length > 0 && <MSectionTitle>Your requests</MSectionTitle>}
          {d.requests.map((r) => (
            <MCard key={r.id} title={formatDateTime(r.created_at)} right={<Badge tone={materialRequestTone(r.request_status)}>{r.status_label}</Badge>}>
              <ul className="wf-mitems">
                {r.items.map((i) => (
                  <li key={i.id}>
                    <span>{`${i.product_name} · ${i.area_label} · ${i.colour_pattern}`}</span>
                    <strong>{sqft(i.quantity)}</strong>
                  </li>
                ))}
              </ul>
              <div className="wf-mnote">
                <span className="wf-mlabel">Why</span>
                {r.reason}
              </div>
              {r.decided_at && (
                <div className="wf-mnote">
                  <span className="wf-mlabel">{`${r.status_label} by ${r.decided_by_name || "—"} · ${formatDateTime(r.decided_at)}`}</span>
                  {r.decision_comment || null}
                </div>
              )}
            </MCard>
          ))}
        </>
      )}
    </div>
  );
}

// The quotation's lines, each with an "extra quantity" box (blank = not
// needed), and why it is needed.
function RequestForm({ siteId, lines, onSent }) {
  const save = useSubmit();
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState("");
  // Only lines with a quantity above 0 are requested — blank or 0 = not needed.
  const picked = lines.filter((l) => Number(qty[l.id]) > 0);

  async function handleSubmit(e) {
    e.preventDefault();
    const sent = await save.post(
      MATERIAL_REQUEST_API.create,
      { site_id: siteId, items: picked.map((l) => ({ quotation_item_id: l.id, quantity: Number(qty[l.id]) })), reason },
      { branchId: ALL_BRANCHES }
    );
    if (sent) {
      setQty({});
      setReason("");
      onSent();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <MCard title="Request More Material">
        <div>
          <span className="wf-mlabel">Extra quantity needed (sq.ft) — fill in only the items you need</span>
          <ul className="wf-mitems wf-mreceive">
            {lines.map((l) => (
              <li key={l.id}>
                <span>
                  <span className="wf-mreceive-name">{l.product_name}</span>
                  <span className="wf-mreceive-sent">
                    {`${l.area_label} · ${l.colour_pattern} · quoted ${sqft(l.quantity)}`}
                    {l.extra_quantity > 0 ? ` · ${sqft(l.extra_quantity)} extra approved` : ""}
                  </span>
                </span>
                <label className="wf-mreceive-qty">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    className="wf-input"
                    aria-label={`${l.product_name} extra quantity`}
                    placeholder="0"
                    value={qty[l.id] ?? ""}
                    onChange={(e) => setQty((q) => ({ ...q, [l.id]: e.target.value }))}
                    disabled={save.submitting}
                  />
                  <span>sq.ft</span>
                </label>
              </li>
            ))}
          </ul>
          {/* items or items.<n>.<field> — full sentences. */}
          <FieldError>{Object.entries(save.fieldErrors).find(([param]) => param.startsWith("items"))?.[1]}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="material-reason">Why is it needed?</label>
          <textarea
            id="material-reason"
            className="wf-input"
            rows={3}
            maxLength={2000}
            required
            placeholder="e.g. Staircase wall is larger than measured"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.reason}</FieldError>
        </div>
        <button type="submit" className="wf-btn primary wf-mblock" disabled={save.submitting || picked.length === 0}>
          <MIcon name="truck" size={18} /> {save.submitting ? "Sending…" : picked.length ? `Send Request (${picked.length})` : "Enter a quantity"}
        </button>
      </MCard>
    </form>
  );
}
