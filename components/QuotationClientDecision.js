"use client";

// The client's answer to a quotation, inside its card on the lead page
// (POST /quotations/client-decision, Quotations → Approve). For now Sales
// marks it after hearing from the client (later the client's WhatsApp
// button will): Mark Approved (confirmed — it locks the quotation, and for
// the Final Quotation the order's payments start), Not Approved (with the
// client's reason — then revise it), or Undo Approval (reason required, not
// once the order exists — the API refuses). The answers' history is listed.

import { useState } from "react";
import { Badge, Detail, DetailGroup, FieldError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDateTime } from "@/lib/format";
import { CLIENT_DECISION, CLIENT_STATUS, QUOTATION_API, clientStatusTone, useQuotationMaster } from "@/lib/quotation";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, optionLabel } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

const DECISION_LABELS = {
  [CLIENT_DECISION.APPROVED]: "Approved",
  [CLIENT_DECISION.REJECTED]: "Not approved",
  [CLIENT_DECISION.REOPENED]: "Approval undone",
};

/**
 * quotation — the card's quotation (with client_status, decisions);
 * label — "Final Quotation" / "Tentative Quotation"; isFinal — payments
 * start on approval; onDecided(updated quotation).
 */
export default function QuotationClientDecision({ quotation: q, label, isFinal, onDecided }) {
  const can = useCan();
  const { master } = useQuotationMaster();
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  // CLIENT_DECISION.REJECTED / REOPENED while its reason form is open.
  const [asking, setAsking] = useState(null);
  const [remark, setRemark] = useState("");
  const current = q.revisions[0];
  const approved = q.client_status === CLIENT_STATUS.APPROVED;
  const approvedRevision = q.revisions.find((r) => r.id === q.approved_revision_id);

  async function send(decision, text = "") {
    const updated = await save.post(QUOTATION_API.clientDecision, { id: q.id, decision, remark: text.trim() || undefined }, { branchId: ALL_BRANCHES });
    if (updated) {
      setAsking(null);
      setRemark("");
      onDecided(updated);
    }
  }

  async function approve() {
    const ok = await confirm({
      title: `Mark ${current.ref_no} approved by the client?`,
      message: isFinal
        ? "The quotation is locked (no more revisions), and the order's payments start — whoever records payments is notified to collect the advance."
        : "The quotation is locked — no more revisions until the approval is undone.",
      confirmLabel: "Mark Approved",
      tone: "primary",
    });
    if (ok) send(CLIENT_DECISION.APPROVED);
  }

  async function submitReason(e) {
    e.preventDefault();
    if (asking === CLIENT_DECISION.REOPENED) {
      const ok = await confirm({
        title: `Undo the approval of ${approvedRevision?.ref_no || q.quotation_no}?`,
        message: "The quotation can be revised again and goes back to the client. The approval stays in the history.",
        confirmLabel: "Undo Approval",
      });
      if (!ok) return;
    }
    send(asking, remark);
  }

  const canDecide = can("quotations.approve");

  return (
    <>
      <DetailGroup title="Client's Answer">
        <Detail label="Status">
          <Badge tone={clientStatusTone(q.client_status)}>{optionLabel(master?.client_statuses, q.client_status) || q.client_status}</Badge>
        </Detail>
        {q.client_decided_at && (
          <Detail label="Marked">{`${formatDateTime(q.client_decided_at)}${q.client_decided_by_name ? ` by ${q.client_decided_by_name}` : ""}`}</Detail>
        )}
        {approved && <Detail label="Approved Version">{approvedRevision?.ref_no || "—"}</Detail>}
      </DetailGroup>

      {canDecide && !asking && (
        <div className="wf-actions-end">
          {approved ? (
            <button type="button" className="wf-btn" onClick={() => setAsking(CLIENT_DECISION.REOPENED)} disabled={save.submitting}>
              Undo Approval
            </button>
          ) : (
            <>
              <button type="button" className="wf-btn" onClick={() => setAsking(CLIENT_DECISION.REJECTED)} disabled={save.submitting}>
                Not Approved
              </button>
              <button type="button" className="wf-btn primary" onClick={approve} disabled={save.submitting}>
                {`Mark ${current.ref_no} Approved`}
              </button>
            </>
          )}
        </div>
      )}

      {asking && (
        <form onSubmit={submitReason} noValidate className="wf-subform">
          <div className="wf-field">
            <label htmlFor={`client-remark-${q.id}`}>
              {asking === CLIENT_DECISION.REOPENED ? "Why undo the approval?" : "Client's reason (optional)"}
            </label>
            <textarea
              id={`client-remark-${q.id}`}
              className="wf-input"
              rows={2}
              maxLength={1000}
              required={asking === CLIENT_DECISION.REOPENED}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={asking === CLIENT_DECISION.REOPENED ? "e.g. Client wants the lobby added" : "e.g. Rate too high for Marmorino"}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.remark}</FieldError>
          </div>
          <div className="wf-actions-end">
            <button type="button" className="wf-btn" onClick={() => setAsking(null)} disabled={save.submitting}>
              Cancel
            </button>
            <button type="submit" className="wf-btn primary" disabled={save.submitting}>
              {asking === CLIENT_DECISION.REOPENED ? "Undo Approval" : "Mark Not Approved"}
            </button>
          </div>
        </form>
      )}

      {q.decisions.length > 0 && (
        <div className="wf-field">
          <label>{`${label}: client's answers`}</label>
          <ul className="wf-list">
            {q.decisions.map((d) => (
              <li key={d.id}>
                <span>
                  <strong>{DECISION_LABELS[d.decision] || d.decision}</strong> · {d.revision_ref_no}
                  {d.decided_by_name ? ` · marked by ${d.decided_by_name}` : ""}
                  {d.remark ? ` · “${d.remark}”` : ""}
                </span>
                <span style={{ color: "var(--idle)", whiteSpace: "nowrap" }}>{formatDateTime(d.decided_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {confirmDialog}
    </>
  );
}
