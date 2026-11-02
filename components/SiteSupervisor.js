"use client";

// The site page's Supervisors card (Sites → Assign). A site can have
// several supervisors: the list shows them with Remove (confirmed —
// POST /sites/remove-supervisor), and the form adds one — a member whose
// role has Sites → Supervise and who can work in the site's branch
// (`supervisors` from /sites/master) → POST /sites/assign-supervisor.
// Adding is confirmed too: the supervisor is notified.

import { useState } from "react";
import { Box, FieldError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDate } from "@/lib/format";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, SITE_API, useSiteMaster } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

/**
 * site — /sites/details; onChanged() reloads it after a supervisor is
 * added or removed.
 */
export default function SiteSupervisor({ site, onChanged }) {
  const can = useCan();
  if (!can("sites.assign")) return null;
  return <SupervisorsCard site={site} onChanged={onChanged} />;
}

function SupervisorsCard({ site, onChanged }) {
  const [supervisorId, setSupervisorId] = useState("");
  const save = useSubmit();
  const remove = useSubmit({ fieldErrorsInToast: true });
  const [confirm, confirmDialog] = useConfirm();
  const { master } = useSiteMaster(site.branch_id || ALL_BRANCHES);
  const current = site.supervisors || [];
  const options = (master?.supervisors || []).filter((u) => !current.some((c) => c.id === u.id));
  const busy = save.submitting || remove.submitting;

  async function handleAdd(e) {
    e.preventDefault();
    const picked = options.find((u) => u.id === supervisorId);
    if (
      picked &&
      !(await confirm({
        title: `Add ${picked.name} as a supervisor of ${site.site_code}?`,
        message: `${picked.name} is notified and can then see this site and its lead.`,
        confirmLabel: "Add Supervisor",
        tone: "primary",
      }))
    ) {
      return;
    }
    const saved = await save.post(SITE_API.assignSupervisor, { id: site.id, supervisor_id: supervisorId }, { branchId: ALL_BRANCHES });
    if (saved) {
      setSupervisorId("");
      onChanged();
    }
  }

  async function handleRemove(supervisor) {
    if (
      !(await confirm({
        title: `Remove ${supervisor.name} from ${site.site_code}?`,
        message: `${supervisor.name} is no longer a supervisor of this site. You can add them again later.`,
        confirmLabel: "Remove",
      }))
    ) {
      return;
    }
    const saved = await remove.post(SITE_API.removeSupervisor, { id: site.id, supervisor_id: supervisor.id }, { branchId: ALL_BRANCHES });
    if (saved) onChanged();
  }

  return (
    <form onSubmit={handleAdd} noValidate>
      <Box title={`Supervisors (${current.length})`}>
        <ul className="wf-list">
          {current.length ? (
            current.map((u) => (
              <li key={u.id}>
                <span>
                  <strong>{u.name}</strong>
                  <span className="wf-list-muted"> · since {formatDate(u.assigned_at)}</span>
                </span>
                <button type="button" className="wf-link-btn" onClick={() => handleRemove(u)} disabled={busy}>
                  Remove
                </button>
              </li>
            ))
          ) : (
            <li className="wf-list-muted">No supervisor assigned yet.</li>
          )}
        </ul>
        <div className="wf-grid wf-grid-3">
          <div className="wf-field">
            <label htmlFor="site-supervisor">Add Supervisor</label>
            <select
              id="site-supervisor"
              required
              className="wf-select"
              value={supervisorId}
              onChange={(e) => setSupervisorId(e.target.value)}
              disabled={busy || !master}
            >
              <option value="">{!master ? "Loading…" : options.length ? "Select Supervisor" : "No other supervisor for this branch"}</option>
              {options.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.supervisor_id}</FieldError>
          </div>
        </div>
        <div className="wf-actions-end">
          <button type="submit" className="wf-btn primary" disabled={busy}>
            {save.submitting ? "Adding…" : "Add Supervisor"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
