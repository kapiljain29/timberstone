"use client";

// Approving / rejecting a material request — shared by the site page's
// Extra Material Requests card and the Material Requests screen
// (POST /api/admin/sites/material-requests/decide; only the site's
// Operation Head or a Super Admin — `can_decide` on the request).
// Approve is confirmed; Reject opens a dialog for the reason (required),
// then is confirmed.
//
//   const decision = useMaterialRequestDecision(list.reload);
//   <button onClick={() => decision.approve(r)}>Approve</button>
//   <button onClick={() => decision.reject(r)}>Reject</button>
//   {decision.dialogs}

import { useState } from "react";
import { FieldError } from "@/components/ui";
import Modal from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { MATERIAL_REQUEST_API, MATERIAL_REQUEST_DECISION, materialRequestsChanged, sqft } from "@/lib/materialRequests";
import { ALL_BRANCHES } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

// "SPA Texture 120 sq.ft, Marmorino 40 sq.ft"
const itemsText = (r) => r.items.map((i) => `${i.product_name} ${sqft(i.quantity)}`).join(", ");
const requester = (r) => r.requested_by_name || "the supervisor";

/**
 * onDecided(request, approved) — after a decision is saved.
 */
export function useMaterialRequestDecision(onDecided) {
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const [rejecting, setRejecting] = useState(null);
  const [comment, setComment] = useState("");

  async function send(r, decision) {
    const done = await save.post(MATERIAL_REQUEST_API.decide, { id: r.id, decision, comment: comment.trim() || undefined }, { branchId: ALL_BRANCHES });
    if (done) {
      setRejecting(null);
      setComment("");
      materialRequestsChanged();
      onDecided(r, decision === MATERIAL_REQUEST_DECISION.APPROVE);
    }
  }

  async function approve(r) {
    const ok = await confirm({
      title: `Approve extra material from ${requester(r)}?`,
      message: `${r.site_code ? `${r.site_code}: ` : ""}${itemsText(r)}. Accounts can then order it on top of the quotation's quantities, and the supervisor and the order team are notified. This can't be undone.`,
      confirmLabel: "Approve",
      tone: "primary",
    });
    if (ok) send(r, MATERIAL_REQUEST_DECISION.APPROVE);
  }

  async function submitReject(e) {
    e.preventDefault();
    const ok = await confirm({
      title: `Reject extra material from ${requester(rejecting)}?`,
      message: `${itemsText(rejecting)}. The supervisor is told your reason. This can't be undone — they can send a new request.`,
      confirmLabel: "Reject",
    });
    if (ok) send(rejecting, MATERIAL_REQUEST_DECISION.REJECT);
  }

  const close = () => {
    setRejecting(null);
    setComment("");
    save.reset();
  };

  const dialogs = (
    <>
      {rejecting && (
        <Modal title={`Reject Request — ${rejecting.site_code || requester(rejecting)}`} onClose={close} wide>
          <form onSubmit={submitReject} noValidate>
            <p className="wf-sub">{itemsText(rejecting)}</p>
            <div className="wf-field">
              <label htmlFor="mr-reject-comment">Why reject it?</label>
              <textarea
                id="mr-reject-comment"
                className="wf-input"
                rows={3}
                maxLength={2000}
                required
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. The measured area already covers the staircase wall"
                disabled={save.submitting}
              />
              <FieldError>{save.fieldErrors.comment}</FieldError>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={close} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                Reject Request
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmDialog}
    </>
  );

  return { approve, reject: setRejecting, submitting: save.submitting, dialogs };
}
