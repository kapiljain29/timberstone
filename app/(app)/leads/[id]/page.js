"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, Box, FieldError, LoadError, leadStatusTone } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import LeadAssignForm from "@/components/LeadAssignForm";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, LEAD_API, optionLabel, useLeadMaster } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

// Lead detail. Every call goes across all the user's branches
// (ALL_BRANCHES), so a lead opens whatever branch tab the list was on.
export default function LeadDetailPage() {
  const { id } = useParams();
  const can = useCan();
  const lead = useApiData(LEAD_API.details, { id }, { branchId: ALL_BRANCHES });
  const statusHistory = useApiData(LEAD_API.statusHistory, { lead_id: id }, { branchId: ALL_BRANCHES });
  const assignmentHistory = useApiData(LEAD_API.assignmentHistory, { lead_id: id }, { branchId: ALL_BRANCHES });
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
            {[l.company_name, `Branch: ${l.branch_name || "None"}`, `Created ${formatDate(l.created_at)}${l.created_by_name ? ` by ${l.created_by_name}` : ""}`]
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
        <div className="wf-grid wf-grid-3">
          <Info label="Mobile" value={formatPhone(l.country_code, l.mobile_number)} />
          <Info label="Email" value={l.email} />
          <Info label="Company / Household" value={l.company_name} />
          <Info label="Lead Source" value={l.lead_source_name} />
          <Info label="Sub-Source" value={l.lead_sub_source_name} />
          <Info label="Project Type" value={optionLabel(master?.project_types, l.project_type)} />
          <Info label="Type of Property" value={optionLabel(master?.work_types, l.work_type)} />
          <Info label="Estimated Area" value={optionLabel(master?.estimated_areas, l.estimated_area)} />
          <Info label="Budget" value={optionLabel(master?.budgets, l.budget)} />
          <Info label="Planning to Start" value={optionLabel(master?.planning_to_start, l.planning_to_start)} />
          <Info label="Requirement in Cladding" value={l.requirement_in_cladding_categories.map((c) => c.category_name).join(", ")} />
          <Info label="Last Updated" value={`${formatDateTime(l.updated_at)}${l.updated_by_name ? ` by ${l.updated_by_name}` : ""}`} />
        </div>
      </Box>

      {l.lead_gen_id && (
        <Box title="Meta Lead Ad">
          <div className="wf-grid wf-grid-3">
            <Info label="Campaign" value={l.campaign_name} />
            <Info label="Form ID" value={l.form_id} />
            <Info label="Meta Lead ID" value={l.lead_gen_id} />
          </div>
          {answers.length > 0 && (
            <ul className="wf-list">
              {answers.map(([question, answer]) => (
                <li key={question}>
                  <span>{question.replace(/_/g, " ")}</span>
                  <strong>{Array.isArray(answer) ? answer.join(", ") : String(answer ?? "—")}</strong>
                </li>
              ))}
            </ul>
          )}
        </Box>
      )}

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

    </div>
  );
}

// Read-only value in the details grid.
function Info({ label, value }) {
  return (
    <div className="wf-field">
      <label>{label}</label>
      <input className="wf-input" value={value || "—"} readOnly />
    </div>
  );
}

// A history list (useApiData of /status-history or /assignment-history).
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
function StatusForm({ lead, master, onChanged }) {
  const [status, setStatus] = useState("");
  const [remark, setRemark] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const statuses = (master?.lead_statuses || []).filter((s) => s.id !== lead.status);

  async function handleSave(e) {
    e.preventDefault();
    const next = statuses.find((s) => s.id === status);
    if (
      next &&
      !(await confirm({
        title: `Mark ${lead.full_name} as ${next.name}?`,
        message: `The lead's status changes from ${lead.status_name || "none"} to ${next.name}. The change is kept in the status history.`,
        confirmLabel: `Mark as ${next.name}`,
        tone: "primary",
      }))
    ) {
      return;
    }
    const updated = await save.post(LEAD_API.updateStatus, { id: lead.id, status, remark: remark.trim() || null }, { branchId: ALL_BRANCHES });
    if (updated) {
      setStatus("");
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
                  {s.name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.status}</FieldError>
          </div>
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
            {save.submitting ? "Saving…" : "Change Status"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
