"use client";

// Contractors on a site, per item of its approved Final Quotation
// (POST /api/admin/sites/contractors): product, contractor's name, no. of
// people, tentative finishing date, remarks. The Operation Head (Sites →
// Assign — `can_edit`) adds them (/contractors/create — the site's
// supervisors are notified), edits (/update) and removes them (/remove,
// confirmed). Items come from the approved Final Quotation, so contractors
// can be added once the client approves it.

import { useState } from "react";
import { Alert, Box, DataTable, FieldError, LoadError } from "@/components/ui";
import Modal from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDate, todayDate } from "@/lib/format";
import { ALL_BRANCHES, SITE_API } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

const EMPTY = { quotation_item_id: "", contractor_name: "", people_required: "", tentative_finish_date: "", remarks: "" };

// "SPA Texture · Interior · As per client choice"
const itemLabel = (l) => `${l.product_name} · ${l.area_label} · ${l.colour_pattern}`;

export default function SiteContractors({ siteId }) {
  const data = useApiData(SITE_API.contractors, { id: siteId }, { branchId: ALL_BRANCHES });
  const remove = useSubmit({ fieldErrorsInToast: true });
  const [confirm, confirmDialog] = useConfirm();
  // null = closed; {} = adding; a contractor = editing it.
  const [editing, setEditing] = useState(null);
  const d = data.data;

  async function removeContractor(c) {
    const ok = await confirm({
      title: `Remove ${c.contractor_name} from the site?`,
      message: `They come off ${c.product_name} (${c.area_label}). The record is kept, but no longer shown here. To put them back, add them again.`,
      confirmLabel: "Remove",
    });
    if (ok && (await remove.post(SITE_API.removeContractor, { id: c.id, site_id: siteId }, { branchId: ALL_BRANCHES }))) data.reload();
  }

  if (data.error) return <LoadError error={data.error} onRetry={data.reload} />;
  if (!d) return <div className="wf-empty">Loading contractors…</div>;

  const canAdd = d.can_edit && d.lines.length > 0;
  const people = d.contractors.reduce((sum, c) => sum + c.people_required, 0);

  return (
    <Box
      title={`Contractors (${d.contractors.length})`}
      right={
        canAdd ? (
          <button type="button" className="wf-btn primary" onClick={() => setEditing({})}>
            + Add Contractor
          </button>
        ) : null
      }
    >
      {d.lines.length === 0 && <Alert tone="info">Contractors can be added for each item once the client approves the Final Quotation.</Alert>}
      {d.contractors.length > 0 ? (
        <DataTable
          columns={["Product", "Contractor", "People", "Tentative Finish", "Remarks", ""]}
          align={[null, null, "right", null, null, null]}
          rows={d.contractors.map((c) => [
            <div key="p">
              <strong>{c.product_name}</strong>
              <div className="wf-sub">{`${c.area_label} · ${c.colour_pattern}`}</div>
            </div>,
            c.contractor_name,
            c.people_required,
            <span key="f" className="wf-nowrap">
              {formatDate(c.tentative_finish_date)}
            </span>,
            c.remarks || "—",
            d.can_edit ? (
              <div key="a" className="wf-btn-row">
                <button type="button" className="wf-link-btn" onClick={() => setEditing(c)}>
                  Edit
                </button>
                <button type="button" className="wf-link-btn" onClick={() => removeContractor(c)} disabled={remove.submitting}>
                  Remove
                </button>
              </div>
            ) : (
              ""
            ),
          ])}
        />
      ) : (
        d.lines.length > 0 && <div className="wf-empty">No contractors on this site yet.</div>
      )}
      {d.contractors.length > 0 && <p className="wf-login-field-hint">{`${people} ${people === 1 ? "person" : "people"} in all.`}</p>}

      {editing && (
        <ContractorForm
          siteId={siteId}
          lines={d.lines}
          contractor={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            data.reload();
          }}
        />
      )}
      {confirmDialog}
    </Box>
  );
}

// Add / edit a contractor, in a dialog. Closing it with changes is confirmed.
function ContractorForm({ siteId, lines, contractor, onClose, onSaved }) {
  const [initial] = useState(() =>
    contractor
      ? {
          quotation_item_id: contractor.quotation_item_id,
          contractor_name: contractor.contractor_name,
          people_required: String(contractor.people_required),
          tentative_finish_date: contractor.tentative_finish_date,
          remarks: contractor.remarks || "",
        }
      : EMPTY
  );
  const [form, setForm] = useState(initial);
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  // The contractor's item may no longer be on a re-approved quotation.
  const missing = form.quotation_item_id && !lines.some((l) => l.id === form.quotation_item_id);

  async function close() {
    if (dirty && !(await confirm({ title: "Discard your changes?", message: "What you've entered will be lost.", confirmLabel: "Discard", cancelLabel: "Keep editing" }))) return;
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const body = {
      ...form,
      site_id: siteId,
      people_required: form.people_required === "" ? null : Number(form.people_required),
      remarks: form.remarks.trim() || undefined,
    };
    const saved = await save.post(contractor ? SITE_API.updateContractor : SITE_API.addContractor, contractor ? { ...body, id: contractor.id } : body, {
      branchId: ALL_BRANCHES,
    });
    if (saved) onSaved();
  }

  return (
    <Modal title={contractor ? `Edit Contractor — ${contractor.contractor_name}` : "Add Contractor"} onClose={close} wide>
      <form onSubmit={handleSubmit} noValidate>
        <div className="wf-field">
          <label htmlFor="ct-item">Product</label>
          <select id="ct-item" required className="wf-select" value={form.quotation_item_id} onChange={(e) => set("quotation_item_id", e.target.value)} disabled={save.submitting}>
            <option value="">Select the item</option>
            {missing && <option value={form.quotation_item_id}>{`${contractor.product_name} (not on the approved quotation any more)`}</option>}
            {lines.map((l) => (
              <option key={l.id} value={l.id}>
                {itemLabel(l)}
              </option>
            ))}
          </select>
          <FieldError>{save.fieldErrors.quotation_item_id}</FieldError>
        </div>
        <div className="wf-grid wf-grid-3">
          <div className="wf-field">
            <label htmlFor="ct-name">Contractor Name</label>
            <input
              id="ct-name"
              required
              className="wf-input"
              maxLength={150}
              value={form.contractor_name}
              onChange={(e) => set("contractor_name", e.target.value)}
              placeholder="e.g. Shree Ram Texture Works"
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.contractor_name}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="ct-people">No. of People Required</label>
            <input
              id="ct-people"
              required
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              className="wf-input"
              value={form.people_required}
              onChange={(e) => set("people_required", e.target.value)}
              placeholder="e.g. 6"
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.people_required}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="ct-date">Tentative Finishing Date</label>
            <input
              id="ct-date"
              required
              type="date"
              min={contractor ? undefined : todayDate()}
              className="wf-input"
              value={form.tentative_finish_date}
              onChange={(e) => set("tentative_finish_date", e.target.value)}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.tentative_finish_date}</FieldError>
          </div>
        </div>
        <div className="wf-field">
          <label htmlFor="ct-remarks">Remarks</label>
          <textarea
            id="ct-remarks"
            className="wf-textarea"
            rows={3}
            maxLength={2000}
            value={form.remarks}
            onChange={(e) => set("remarks", e.target.value)}
            placeholder="Optional — e.g. Two coats; start after the primer dries"
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.remarks}</FieldError>
        </div>
        <FieldError>{save.fieldErrors.site_id || save.fieldErrors.id}</FieldError>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={close} disabled={save.submitting}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : contractor ? "Save Changes" : "Add Contractor"}
          </button>
        </div>
      </form>
      {confirmDialog}
    </Modal>
  );
}
