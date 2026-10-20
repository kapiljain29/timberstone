"use client";

// "Assign to…" for one or more leads (POST /api/admin/leads/assign): adds
// the picked team member to each lead's assignees (existing ones stay),
// all or nothing. Used by the Leads list (ticked rows) and the lead detail
// page. Assigning hands the leads to someone else, so it is confirmed first.

import { useState } from "react";
import { Box, FieldError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { LEAD_API } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

/**
 * leadIds  — the leads to assign.
 * branchId — x-branch-id for the call (the list's tab, or ALL_BRANCHES).
 * master   — /leads/master (its `team_assignees` = who the user may pick).
 * exclude  — ids not to offer (e.g. the lead's current assignees).
 * onCancel — optional: shows a "Clear Selection" button.
 */
export default function LeadAssignForm({ leadIds, branchId, master, exclude = [], title, onCancel, onAssigned }) {
  const [assignedTo, setAssignedTo] = useState("");
  const [remark, setRemark] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const people = (master?.team_assignees || []).filter((p) => !exclude.includes(p.id));
  const one = leadIds.length === 1;
  const count = `${leadIds.length} lead${one ? "" : "s"}`;

  async function handleAssign(e) {
    e.preventDefault();
    const person = people.find((p) => p.id === assignedTo);
    if (
      person &&
      !(await confirm({
        title: `Assign ${one ? "this lead" : count} to ${person.name}?`,
        message: `${person.name} is added to the assignees of ${one ? "this lead" : "these leads"} and will see ${one ? "it" : "them"} in their list. Existing assignees stay.`,
        confirmLabel: "Assign",
        tone: "primary",
      }))
    ) {
      return;
    }
    const done = await save.post(LEAD_API.assign, { lead_ids: leadIds, assigned_to: assignedTo, remark: remark.trim() || null }, { branchId });
    if (done) {
      setAssignedTo("");
      setRemark("");
      onAssigned();
    }
  }

  return (
    <form onSubmit={handleAssign} noValidate>
      <Box title={title || `Assign ${count}`}>
        <div className="wf-grid wf-grid-2">
          <div className="wf-field">
            <label htmlFor="assign-to">Assign To</label>
            <select
              id="assign-to"
              required
              className="wf-select"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={save.submitting || !master}
            >
              <option value="">{!master ? "Loading…" : people.length ? "Select team member" : "No one else to assign"}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.assigned_to || save.fieldErrors.lead_ids}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="assign-remark">Remark</label>
            <input
              id="assign-remark"
              className="wf-input"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional"
              maxLength={1000}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.remark}</FieldError>
          </div>
        </div>
        <div className="wf-actions-end">
          {onCancel && (
            <button type="button" className="wf-btn" onClick={onCancel} disabled={save.submitting}>
              Clear Selection
            </button>
          )}
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Assigning…" : one ? "Assign" : `Assign ${count}`}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
