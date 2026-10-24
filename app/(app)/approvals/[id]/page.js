"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Alert, Badge, Box, Detail, DetailGroup, FieldError, LoadError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { ApprovalSummary } from "@/components/ApprovalSummary";
import { formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, APPROVAL_API, APPROVAL_STATUS, approvalStatusTone, optionLabel, useApprovalMaster } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

// One approval request — what is asked and why; an approver (can_decide)
// approves it (it takes effect at once — e.g. the lead becomes Booked) or
// rejects it with the reason. The requester is notified either way.
export default function ApprovalPage() {
  const { id } = useParams();
  const can = useCan();
  const approval = useApiData(APPROVAL_API.details, { id }, { branchId: ALL_BRANCHES });
  const { master } = useApprovalMaster();
  const a = approval.data;

  if (!a) {
    if (approval.error?.status === 404) {
      return (
        <div className="wf-noaccess">
          <div className="wf-noaccess-icon">🔒</div>
          <h1 className="wf-h1" style={{ justifyContent: "center" }}>
            Request not found
          </h1>
          <p className="wf-sub">It doesn&apos;t exist, or it isn&apos;t in your branches.</p>
          <Link href="/approvals" className="wf-btn primary">
            Back to approvals
          </Link>
        </div>
      );
    }
    return approval.error ? <LoadError error={approval.error} onRetry={approval.reload} /> : <div className="wf-empty">Loading request…</div>;
  }

  const decided = a.approval_status !== APPROVAL_STATUS.PENDING;

  return (
    <div>
      <div className="wf-crumb">
        Overview / <Link href="/approvals">Approvals</Link>
      </div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">
            {a.title}{" "}
            <Badge tone={approvalStatusTone(a.approval_status)}>{optionLabel(master?.approval_statuses, a.approval_status)}</Badge>
          </h1>
          <p className="wf-sub">
            <ApprovalSummary approval={a} />
          </p>
        </div>
        {a.lead_id && can("leads.view") && (
          <Link href={`/leads/${a.lead_id}`} className="wf-btn" style={{ marginBottom: 18 }}>
            Open Lead →
          </Link>
        )}
      </div>

      <Box title="Request">
        <DetailGroup>
          <Detail label="Lead">{a.lead_name || "—"}</Detail>
          <Detail label="Company">{a.lead_company_name || "—"}</Detail>
          <Detail label="Mobile">{formatPhone(a.lead_country_code, a.lead_mobile_number)}</Detail>
          <Detail label="Branch">{a.branch_name || "—"}</Detail>
          <Detail label="Requested By">{a.requested_by_name || "—"}</Detail>
          <Detail label="Requested On">{formatDateTime(a.created_at)}</Detail>
          <Detail label="Reason" wide>
            <span style={{ whiteSpace: "pre-line" }}>{a.reason}</span>
          </Detail>
          {a.payload?.remark && (
            <Detail label="Remark" wide>
              {a.payload.remark}
            </Detail>
          )}
          {decided && (
            <>
              <Detail label="Decided By">{a.decided_by_name || "—"}</Detail>
              <Detail label="Decided On">{formatDateTime(a.decided_at)}</Detail>
              <Detail label="Comment" wide>
                {a.decision_comment || "—"}
              </Detail>
            </>
          )}
        </DetailGroup>
      </Box>

      {a.can_decide && <DecideForm approval={a} onDecided={(updated) => approval.patch(() => updated)} />}
      {!decided && !a.can_decide && can("approvals.approve") && (
        <Alert tone="info">You asked for this approval — someone else from Management has to decide it.</Alert>
      )}
    </div>
  );
}

// Approve / reject (with the reason). Both are confirmed: approving takes
// effect at once, and the requester is notified either way.
function DecideForm({ approval, onDecided }) {
  const [comment, setComment] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  async function decide(decision) {
    const approve = decision === "approve";
    if (
      !(await confirm(
        approve
          ? {
              title: `Approve: ${approval.title}?`,
              message: `It takes effect now${approval.payload?.to_status_name ? ` — ${approval.lead_name} becomes ${approval.payload.to_status_name}` : ""}, and ${approval.requested_by_name || "the requester"} is notified. This can't be undone here.`,
              confirmLabel: "Approve",
              tone: "primary",
            }
          : {
              title: `Reject: ${approval.title}?`,
              message: `Nothing changes, and ${approval.requested_by_name || "the requester"} is told why.`,
              confirmLabel: "Reject",
            }
      ))
    ) {
      return;
    }
    const updated = await save.post(APPROVAL_API.decide, { id: approval.id, decision, comment: comment.trim() || null }, { branchId: ALL_BRANCHES });
    if (updated) onDecided(updated);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        decide("approve");
      }}
      noValidate
    >
      <Box title="Decision">
        <div className="wf-field">
          <label htmlFor="approval-comment">Comment</label>
          <textarea
            id="approval-comment"
            className="wf-textarea"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Required when rejecting — tell them why"
            maxLength={1000}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.comment}</FieldError>
        </div>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={() => decide("reject")} disabled={save.submitting}>
            Reject
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : "Approve"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
