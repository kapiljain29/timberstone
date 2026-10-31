"use client";

// The lead page's Site card. A Booked lead (`is_booked`) not yet moved
// shows "Move to Site" (Sites → Add): site name, address, expected start
// date, Operation Head (role Operation Head of the lead's branch — `operation_heads`
// from /sites/master) and a note → POST /sites/create. Confirmed first: it
// hands the lead to the Operation Head, who is notified. Once moved, the
// card shows the site's code, name and Operation Head (lead.site).

import { useState } from "react";
import { Box, Detail, DetailGroup, FieldError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDate, todayDate } from "@/lib/format";
import { useCan } from "@/lib/roles";
import { ALL_BRANCHES, SITE_API, useSiteMaster } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

/**
 * lead — /leads/details; onMoved() reloads it after the site is created.
 */
export default function LeadSite({ lead, onMoved }) {
  const can = useCan();

  if (lead.site) {
    return (
      <Box title={`Site ${lead.site.site_code}`}>
        <DetailGroup>
          <Detail label="Site Name">{lead.site.site_name}</Detail>
          <Detail label="Operation Head">{lead.site.operation_head_name || "—"}</Detail>
          <Detail label="Moved to Site On">{formatDate(lead.site.created_at)}</Detail>
        </DetailGroup>
      </Box>
    );
  }
  if (!lead.is_booked || !can("sites.add")) return null;
  return <MoveToSiteForm lead={lead} onMoved={onMoved} />;
}

function MoveToSiteForm({ lead, onMoved }) {
  const [form, setForm] = useState({ site_name: lead.company_name || lead.full_name, address: "", expected_start_date: "", operation_head_id: "", note: "" });
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const { master } = useSiteMaster(lead.branch_id || ALL_BRANCHES);
  const heads = master?.operation_heads || [];
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function handleSave(e) {
    e.preventDefault();
    const head = heads.find((h) => h.id === form.operation_head_id);
    if (
      head &&
      !(await confirm({
        title: `Move ${lead.full_name} to Site under ${head.name}?`,
        message: `A site is created for this lead and ${head.name} is notified to take it over. A lead is moved to Site only once.`,
        confirmLabel: "Move to Site",
        tone: "primary",
      }))
    ) {
      return;
    }
    const saved = await save.post(
      SITE_API.create,
      {
        lead_id: lead.id,
        site_name: form.site_name,
        address: form.address,
        expected_start_date: form.expected_start_date || null,
        operation_head_id: form.operation_head_id,
        note: form.note.trim() || null,
      },
      { branchId: ALL_BRANCHES }
    );
    if (saved) onMoved();
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <Box title="Move to Site">
        <div className="wf-grid wf-grid-3">
          <div className="wf-field">
            <label htmlFor="site-name">Site Name</label>
            <input
              id="site-name"
              required
              className="wf-input"
              value={form.site_name}
              onChange={(e) => set("site_name", e.target.value)}
              maxLength={150}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.site_name}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="site-head">Operation Head</label>
            <select
              id="site-head"
              required
              className="wf-select"
              value={form.operation_head_id}
              onChange={(e) => set("operation_head_id", e.target.value)}
              disabled={save.submitting || !master}
            >
              <option value="">{!master ? "Loading…" : heads.length ? "Select Operation Head" : "No Operation Head for this branch"}</option>
              {heads.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.operation_head_id || save.fieldErrors.lead_id}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="site-start">Expected Start Date</label>
            <input
              id="site-start"
              type="date"
              className="wf-input"
              min={todayDate()}
              value={form.expected_start_date}
              onChange={(e) => set("expected_start_date", e.target.value)}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.expected_start_date}</FieldError>
          </div>
        </div>
        <div className="wf-field">
          <label htmlFor="site-address">Site Address</label>
          <textarea
            id="site-address"
            required
            className="wf-textarea"
            rows={2}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="House / building, street, area, city, PIN"
            maxLength={1000}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.address}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="site-note">Note for the Operation Head</label>
          <textarea
            id="site-note"
            className="wf-textarea"
            rows={2}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Optional — e.g. customer's timeline, access to the site"
            maxLength={2000}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.note}</FieldError>
        </div>
        <div className="wf-actions-end">
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Moving…" : "Move to Site"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
