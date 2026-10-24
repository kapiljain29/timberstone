"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Box, Detail, DetailGroup, FieldError, FutureDateTimeField, LoadError, leadStatusTone } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import LeadAssignForm from "@/components/LeadAssignForm";
import LeadDesign from "@/components/LeadDesign";
import { dateTimeLocalToIso, formatDate, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useCan } from "@/lib/roles";
import {
  ALL_BRANCHES,
  CALL_QUEUE_API,
  LEAD_API,
  callStatusLabel,
  callStatusTone,
  optionLabel,
  useCallQueueMaster,
  useLeadMaster,
} from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

// Lead detail. Every call goes across all the user's branches
// (ALL_BRANCHES), so a lead opens whatever branch tab the list was on.
export default function LeadDetailPage() {
  const { id } = useParams();
  const can = useCan();
  const lead = useApiData(LEAD_API.details, { id }, { branchId: ALL_BRANCHES });
  const statusHistory = useApiData(LEAD_API.statusHistory, { lead_id: id }, { branchId: ALL_BRANCHES });
  const assignmentHistory = useApiData(LEAD_API.assignmentHistory, { lead_id: id }, { branchId: ALL_BRANCHES });
  const callHistory = useApiData(CALL_QUEUE_API.history, { lead_id: id }, { branchId: ALL_BRANCHES });
  // Call status labels for the call history.
  const { master: callMaster } = useCallQueueMaster(ALL_BRANCHES);
  // Option labels, statuses and who the user may assign — for the lead's branch.
  const { master } = useLeadMaster(lead.data ? lead.data.branch_id || ALL_BRANCHES : null);

  if (!lead.data) {
    if (lead.error?.status === 404) {
      return (
        <div className="wf-noaccess">
          <div className="wf-noaccess-icon">🔒</div>
          <h1 className="wf-h1" style={{ justifyContent: "center" }}>
            Lead not found
          </h1>
          <p className="wf-sub">It doesn&apos;t exist, or it isn&apos;t in your branches or your list of leads.</p>
          <Link href="/leads" className="wf-btn primary">
            Back to leads
          </Link>
        </div>
      );
    }
    return lead.error ? <LoadError error={lead.error} onRetry={lead.reload} /> : <div className="wf-empty">Loading lead…</div>;
  }

  const l = lead.data;
  const answers = l.user_answers && typeof l.user_answers === "object" ? Object.entries(l.user_answers) : [];
  // Option label for a stored value; null when not set (shows "Not provided").
  const option = (options, value) => (value ? optionLabel(options, value) : null);
  const phone = formatPhone(l.country_code, l.mobile_number);

  return (
    <div>
      <div className="wf-crumb">
        Pre-Sales / <Link href="/leads">Leads</Link>
      </div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">
            {l.full_name} {l.status_name && <Badge tone={leadStatusTone(l.status_name)}>{l.status_name}</Badge>}
          </h1>
          <p className="wf-sub">
            {[
              l.company_name,
              `Branch: ${l.branch_name || "None"}`,
              l.next_follow_up_at && `Next follow-up ${formatDateTime(l.next_follow_up_at)}`,
              `Created ${formatDate(l.created_at)}${l.created_by_name ? ` by ${l.created_by_name}` : ""}`,
              `Updated ${formatDateTime(l.updated_at)}${l.updated_by_name ? ` by ${l.updated_by_name}` : ""}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {can("leads.edit") && (
          <Link href={`/leads/edit/${l.id}`} className="wf-btn primary" style={{ marginBottom: 18 }}>
            Edit Lead
          </Link>
        )}
      </div>

      <Box title="Step 1 — Lead Details">
        <DetailGroup title="Contact">
          <Detail label="Mobile">{l.mobile_number && <a href={`tel:${l.country_code}${l.mobile_number}`}>{phone}</a>}</Detail>
          <Detail label="Email">{l.email && <a href={`mailto:${l.email}`}>{l.email}</a>}</Detail>
          <Detail label="Company / Household">{l.company_name}</Detail>
        </DetailGroup>
        <DetailGroup title="Source">
          <Detail label="Lead Source">{l.lead_source_name}</Detail>
          <Detail label="Sub-Source">{l.lead_sub_source_name}</Detail>
          <Detail label="Architect">
            {l.architect_name && (l.architect_firm_name ? `${l.architect_name} — ${l.architect_firm_name}` : l.architect_name)}
          </Detail>
        </DetailGroup>
        <DetailGroup title="Requirement">
          <Detail label="Project Type">{option(master?.project_types, l.project_type)}</Detail>
          <Detail label="Type of Property">{option(master?.work_types, l.work_type)}</Detail>
          <Detail label="Estimated Area">{option(master?.estimated_areas, l.estimated_area)}</Detail>
          <Detail label="Budget">{option(master?.budgets, l.budget)}</Detail>
          <Detail label="Planning to Start">{option(master?.planning_to_start, l.planning_to_start)}</Detail>
          <Detail label="Requirement in Cladding">
            {l.requirement_in_cladding_categories.length > 0 && (
              <span className="wf-detail-tags">
                {l.requirement_in_cladding_categories.map((c) => (
                  <Badge key={c.id} tone="idle">
                    {c.category_name}
                  </Badge>
                ))}
              </span>
            )}
          </Detail>
        </DetailGroup>
      </Box>

      {l.lead_gen_id && (
        <Box title="Meta Lead Ad">
          <DetailGroup title="Campaign">
            <Detail label="Campaign">{l.campaign_name}</Detail>
            <Detail label="Form ID">{l.form_id}</Detail>
            <Detail label="Meta Lead ID">{l.lead_gen_id}</Detail>
          </DetailGroup>
          {answers.length > 0 && (
            <DetailGroup title="Answers on the Lead Form">
              {answers.map(([question, answer]) => (
                <Detail key={question} label={question.replace(/_/g, " ")}>
                  {Array.isArray(answer) ? answer.join(", ") : answer == null ? null : String(answer)}
                </Detail>
              ))}
            </DetailGroup>
          )}
        </Box>
      )}

      {can("designs.view") && <LeadDesign lead={l} />}

      {can("leads.edit") && (
        <StatusForm
          lead={l}
          master={master}
          onChanged={(updated) => {
            lead.patch(() => updated);
            statusHistory.reload();
          }}
        />
      )}

      <Box title="Status History">
        <History
          history={statusHistory}
          emptyLabel="No status changes yet."
          render={(h) => (
            <>
              <span>
                <strong>{formatDateTime(h.changed_at)}</strong> · {h.from_status_name || "—"} → {h.to_status_name}
                {h.changed_by_name ? ` · by ${h.changed_by_name}` : ""}
                {h.next_follow_up_at ? ` · next follow-up ${formatDateTime(h.next_follow_up_at)}` : ""}
                {h.remark ? ` · “${h.remark}”` : ""}
              </span>
              <Badge tone={leadStatusTone(h.to_status_name)}>{h.to_status_name}</Badge>
            </>
          )}
        />
      </Box>

      {can("leads.assign") && (
        <LeadAssignForm
          title="Assign to Another Team Member"
          leadIds={[l.id]}
          branchId={ALL_BRANCHES}
          master={master}
          exclude={l.assignees.map((a) => a.id)}
          onAssigned={() => {
            lead.reload();
            assignmentHistory.reload();
          }}
        />
      )}

      <Box title={`Assigned To (${l.assignees.length})`}>
        <p className="wf-sub">{l.assignees.map((a) => a.name).join(", ") || "Nobody yet — this lead is in its branch lead manager's queue."}</p>
        <History
          history={assignmentHistory}
          emptyLabel="No assignments yet."
          render={(h) => (
            <span>
              <strong>{formatDateTime(h.assigned_at)}</strong> · {h.user_name}
              {h.assigned_by_name ? ` · assigned by ${h.assigned_by_name}` : ""}
              {h.remark ? ` · “${h.remark}”` : ""}
            </span>
          )}
        />
      </Box>

      <Box title={`Call History${callHistory.data ? ` (${callHistory.data.length})` : ""}`}>
        <History
          history={callHistory}
          emptyLabel="No calls logged yet. Calls are logged by the sales team from their Call Queue."
          render={(c) => (
            <>
              <span>
                <strong>{formatDateTime(c.called_at)}</strong>
                {c.called_by_name ? ` · ${c.called_by_name}` : ""}
                {c.next_callback_at ? ` · callback ${formatDateTime(c.next_callback_at)}` : ""}
                {c.lead_status_name ? ` · status → ${c.lead_status_name}` : ""}
                {c.remark ? ` · “${c.remark}”` : ""}
              </span>
              <Badge tone={callStatusTone(callMaster, c.call_status)}>{callStatusLabel(callMaster, c.call_status)}</Badge>
            </>
          )}
        />
      </Box>

    </div>
  );
}

// A history list (useApiData of /status-history, /assignment-history or
// /call-queue/history).
function History({ history, emptyLabel, render }) {
  if (history.error) return <LoadError error={history.error} onRetry={history.reload} />;
  if (!history.data) return <div className="wf-empty">Loading history…</div>;
  if (!history.data.length) return <div className="wf-empty">{emptyLabel}</div>;
  return (
    <ul className="wf-list">
      {history.data.map((h) => (
        <li key={h.id}>{render(h)}</li>
      ))}
    </ul>
  );
}

// Change the lead's status (POST /leads/update-status — writes a history
// row with the remark). Confirmed first: it is recorded and can't be undone.
// A status that needs a follow-up (needs_follow_up) also asks for the next
// follow-up date: the lead comes back to its callers' Call Queue then. The
// lead's current status is offered too when it needs one (reschedule).
function StatusForm({ lead, master, onChanged }) {
  const [status, setStatus] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [remark, setRemark] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const statuses = (master?.lead_statuses || []).filter((s) => s.id !== lead.status || s.needs_follow_up);
  const next = statuses.find((s) => s.id === status);
  const reschedule = next?.id === lead.status;

  async function handleSave(e) {
    e.preventDefault();
    if (
      next &&
      !reschedule &&
      !(await confirm({
        title: `Mark ${lead.full_name} as ${next.name}?`,
        message: `The lead's status changes from ${lead.status_name || "none"} to ${next.name}. The change is kept in the status history.`,
        confirmLabel: `Mark as ${next.name}`,
        tone: "primary",
      }))
    ) {
      return;
    }
    const updated = await save.post(
      LEAD_API.updateStatus,
      {
        id: lead.id,
        status,
        next_follow_up_at: next?.needs_follow_up ? dateTimeLocalToIso(followUpAt) : null,
        remark: remark.trim() || null,
      },
      { branchId: ALL_BRANCHES }
    );
    if (updated) {
      setStatus("");
      setFollowUpAt("");
      setRemark("");
      onChanged(updated);
    }
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <Box title="Change Status">
        <div className="wf-grid wf-grid-2">
          <div className="wf-field">
            <label htmlFor="lead-new-status">New Status</label>
            <select
              id="lead-new-status"
              required
              className="wf-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={save.submitting || !master}
            >
              <option value="">{master ? "Select status" : "Loading…"}</option>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id === lead.status ? `${s.name} (reschedule follow-up)` : s.name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.status}</FieldError>
          </div>
          {next?.needs_follow_up && (
            <FutureDateTimeField
              id="lead-next-follow-up"
              label="Next Follow-up"
              required
              value={followUpAt}
              onChange={setFollowUpAt}
              disabled={save.submitting}
              error={save.fieldErrors.next_follow_up_at}
            />
          )}
          <div className="wf-field">
            <label htmlFor="lead-status-remark">Remark</label>
            <input
              id="lead-status-remark"
              className="wf-input"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. Customer asked to call next week"
              maxLength={1000}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.remark}</FieldError>
          </div>
        </div>
        <div className="wf-actions-end">
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : reschedule ? "Reschedule Follow-up" : "Change Status"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
