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

// The quotation's items as tap-to-select rows: tapping one selects it and
// shows its quantity box (with − / +); only selected items are sent. Then
// why it is needed.
function RequestForm({ siteId, lines, onSent }) {
  const save = useSubmit();
  // Selected items: { [line id]: quantity text } — not in it = not needed.
  const [qty, setQty] = useState({});
  const [reason, setReason] = useState("");
  const picked = lines.filter((l) => l.id in qty);

  function toggle(line) {
    setQty((q) => {
      const next = { ...q };
      if (line.id in next) delete next[line.id];
      else next[line.id] = "";
      return next;
    });
  }
  const setLine = (id, value) => setQty((q) => ({ ...q, [id]: value }));
  const step = (id, by) => setLine(id, String(Math.max((Number(qty[id]) || 0) + by, 0)));

  // A line's error: items.<n>.quantity, n = its place among the selected.
  const errorFor = (line) => save.fieldErrors[`items.${picked.indexOf(line)}.quantity`];

  async function handleSubmit(e) {
    e.preventDefault();
    const sent = await save.post(
      MATERIAL_REQUEST_API.create,
      { site_id: siteId, items: picked.map((l) => ({ quotation_item_id: l.id, quantity: qty[l.id] === "" ? null : Number(qty[l.id]) })), reason },
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
      <MCard title="Request More Material" right={picked.length ? <Badge tone="pending">{`${picked.length} selected`}</Badge> : null}>
        <div>
          <span className="wf-mlabel">Tap the items you need, then enter the extra quantity</span>
          <ul className="wf-mpick">
            {lines.map((l) => {
              const selected = l.id in qty;
              const error = selected && errorFor(l);
              return (
                <li key={l.id} className={`wf-mpick-item${selected ? " selected" : ""}${error ? " error" : ""}`}>
                  <button type="button" className="wf-mpick-head" onClick={() => toggle(l)} aria-pressed={selected} disabled={save.submitting}>
                    <span className="wf-mpick-check">{selected && <MIcon name="check" size={14} />}</span>
                    <span>
                      <span className="wf-mpick-name">{l.product_name}</span>
                      <span className="wf-mpick-meta">{`${l.area_label} · ${l.colour_pattern}`}</span>
                      <span className="wf-mpick-meta">{`Quoted ${sqft(l.quantity)} · ordered ${sqft(l.ordered_quantity)}`}</span>
                      {l.extra_quantity > 0 && <span className="wf-mpick-chip">{`${sqft(l.extra_quantity)} extra already approved`}</span>}
                    </span>
                  </button>
                  {selected && (
                    <>
                      <div className="wf-mpick-qty">
                        <button type="button" className="wf-mpick-step" onClick={() => step(l.id, -1)} aria-label={`Less ${l.product_name}`} disabled={save.submitting}>
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          className="wf-input"
                          aria-label={`${l.product_name} extra quantity in sq.ft`}
                          placeholder="Qty"
                          autoFocus
                          value={qty[l.id]}
                          onChange={(e) => setLine(l.id, e.target.value)}
                          disabled={save.submitting}
                        />
                        <button type="button" className="wf-mpick-step" onClick={() => step(l.id, 1)} aria-label={`More ${l.product_name}`} disabled={save.submitting}>
                          +
                        </button>
                        <span className="wf-mpick-unit">sq.ft extra</span>
                      </div>
                      <FieldError>{error}</FieldError>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {/* Errors about the list as a whole (e.g. an item no longer on the quotation). */}
          <FieldError>{save.fieldErrors.items}</FieldError>
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
          <MIcon name="truck" size={18} />{" "}
          {save.submitting
            ? "Sending…"
            : picked.length === 0
              ? "Select the items you need"
              : `Send Request · ${picked.length} ${picked.length === 1 ? "item" : "items"}`}
        </button>
      </MCard>
    </form>
  );
}
