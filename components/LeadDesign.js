"use client";

// The lead page's Design section: "Design required?" → pick a designer and
// write the brief (POST /design-requests/create — the designer is
// notified); then the designer's uploads and Sales' review (approve / ask
// for changes — /design-requests/review). Shown with Design Requests →
// View; sending needs Add and a booked lead (`is_booked` — the form only
// appears once the lead is Booked), reviewing needs Approve.

import Link from "next/link";
import { useState } from "react";
import { Box, FieldError, LoadError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import DesignRequestView, { DesignStatusBadge } from "@/components/DesignRequestView";
import { formatDate } from "@/lib/format";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, DESIGN_API, DESIGN_STATUS, useDesignMaster } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

export default function LeadDesign({ lead }) {
  const can = useCan();
  const requests = useApiData(DESIGN_API.list, { lead_id: lead.id, limit: 20 }, { branchId: ALL_BRANCHES });
  // Newest activity first: the first is the current one.
  const latest = requests.data?.items[0] || null;
  const current = useApiData(latest ? DESIGN_API.details : null, { id: latest?.id }, { branchId: ALL_BRANCHES });
  const { master } = useDesignMaster(lead.branch_id || ALL_BRANCHES);

  function reload() {
    requests.reload();
    current.reload();
  }

  const request = current.data && current.data.id === latest?.id ? current.data : null;
  // Design is requested only once the lead is booked (is_booked — its
  // status needs a token, e.g. Booked); the API refuses it before that.
  const canSend =
    lead.is_booked && can("designs.add") && requests.data && (!latest || latest.design_status === DESIGN_STATUS.APPROVED);
  const earlier = (requests.data?.items || []).slice(1);

  return (
    <>
      <Box title="Design">
        <LoadError error={requests.error || current.error} onRetry={reload} />
        {!requests.data ? (
          !requests.error && <div className="wf-empty">Loading design…</div>
        ) : !latest ? (
          <div className="wf-empty">
            {lead.is_booked ? "No design requested for this lead yet." : "Design can be requested once the lead is Booked."}
          </div>
        ) : request ? (
          <DesignRequestView request={request} master={master} />
        ) : (
          !current.error && <div className="wf-empty">Loading design…</div>
        )}
        {earlier.length > 0 && (
          <div className="wf-field">
            <label>Earlier Design Requests</label>
            <ul className="wf-list">
              {earlier.map((r) => (
                <li key={r.id}>
                  <Link href={`/design-requests/${r.id}`}>
                    {formatDate(r.created_at)} · {r.designer_name}
                  </Link>
                  <DesignStatusBadge master={master} status={r.design_status} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Box>

      {request && request.design_status === DESIGN_STATUS.SUBMITTED && can("designs.approve") && (
        <ReviewForm request={request} onDone={reload} />
      )}
      {canSend && <SendForm lead={lead} master={master} again={Boolean(latest)} onSent={reload} />}
    </>
  );
}

// "Design required?" → designer + brief → send (confirmed: it hands work
// to someone else and notifies them).
function SendForm({ lead, master, again, onSent }) {
  const [required, setRequired] = useState(false);
  const [designer, setDesigner] = useState("");
  const [details, setDetails] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const designers = master?.designers || [];

  async function handleSend(e) {
    e.preventDefault();
    const person = designers.find((d) => d.id === designer);
    if (
      person &&
      !(await confirm({
        title: `Send ${lead.full_name} to ${person.name} for design?`,
        message: `${person.name} gets a notification and an email with your brief, and sees this lead in their Design Requests.`,
        confirmLabel: "Send to Designer",
        tone: "primary",
      }))
    ) {
      return;
    }
    const sent = await save.post(DESIGN_API.create, { lead_id: lead.id, assigned_to: designer, details }, { branchId: ALL_BRANCHES });
    if (sent) {
      setRequired(false);
      setDesigner("");
      setDetails("");
      onSent();
    }
  }

  return (
    <form onSubmit={handleSend} noValidate>
      <Box title={again ? "Request Another Design" : "Design Required?"}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} disabled={save.submitting} />
          Yes — this lead needs a design from the design team
        </label>
        {required && (
          <>
            <div className="wf-grid wf-grid-2">
              <div className="wf-field">
                <label htmlFor="design-designer">Designer</label>
                <select
                  id="design-designer"
                  required
                  className="wf-select"
                  value={designer}
                  onChange={(e) => setDesigner(e.target.value)}
                  disabled={save.submitting || !master}
                >
                  <option value="">{!master ? "Loading…" : designers.length ? "Select design team member" : "No designers for this branch"}</option>
                  {designers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <FieldError>{save.fieldErrors.assigned_to || save.fieldErrors.lead_id}</FieldError>
              </div>
            </div>
            <div className="wf-field">
              <label htmlFor="design-details">Design Details &amp; Comments</label>
              <textarea
                id="design-details"
                required
                className="wf-textarea"
                rows={4}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="What the customer wants: area, product, finish, colours, references…"
                maxLength={5000}
                disabled={save.submitting}
              />
              <FieldError>{save.fieldErrors.details}</FieldError>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setRequired(false)} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Sending…" : "Send to Designer"}
              </button>
            </div>
          </>
        )}
      </Box>
      {confirmDialog}
    </form>
  );
}

// Sales' review of a submitted design: approve, or send it back with what
// to change (comment required). Both confirmed — the designer is notified.
function ReviewForm({ request, onDone }) {
  const [comment, setComment] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  async function review(decision) {
    const approve = decision === "approve";
    if (
      !(await confirm({
        title: approve ? `Approve ${request.designer_name}'s design?` : `Send the design back to ${request.designer_name}?`,
        message: approve
          ? "The design request is closed as approved and the designer is notified. To change it later, request another design."
          : "The designer is notified with your comment and uploads a new version.",
        confirmLabel: approve ? "Approve Design" : "Ask for Changes",
        tone: "primary",
      }))
    ) {
      return;
    }
    const done = await save.post(DESIGN_API.review, { id: request.id, decision, comment: comment.trim() || null }, { branchId: ALL_BRANCHES });
    if (done) {
      setComment("");
      onDone();
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        review("approve");
      }}
      noValidate
    >
      <Box title="Review Design">
        <div className="wf-field">
          <label htmlFor="design-review-comment">Comment</label>
          <textarea
            id="design-review-comment"
            className="wf-textarea"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Required when asking for changes — tell the designer what to change"
            maxLength={2000}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.comment}</FieldError>
        </div>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={() => review("changes")} disabled={save.submitting}>
            Ask for Changes
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : "Approve Design"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
