"use client";

// Add / edit form for a lead — used by the New Lead page (/leads/new) and
// the Edit Lead page (/leads/edit/[id]). Saves through the API and calls
// onSaved(lead); onCancel() runs after the user confirms discarding
// unsaved changes. The branch, first status and assignee are set on add
// only: later they change on the lead detail page (/update-status,
// /assign), never through /update.

import { useState } from "react";
import { Box, CheckboxGroup, FieldError, PhoneField } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { getSession } from "@/lib/api";
import { defaultCountryCode, phonePlaceholder } from "@/lib/phone";
import { useMyBranches } from "@/lib/roles";
import { ALL_BRANCHES, LEAD_API, useCategoryOptions, useLeadMaster } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

const EMPTY = {
  full_name: "",
  country_code: "",
  mobile_number: "",
  email: "",
  company_name: "",
  lead_source_id: "",
  lead_sub_source_id: "",
  architect_id: "",
  requirement_in_cladding: [],
  project_type: "",
  planning_to_start: "",
  budget: "",
  work_type: "",
  estimated_area: "",
};

// Add only: "" = the user's first branch / the default status / the
// person entering the lead.
const EMPTY_NEW = { ...EMPTY, branch_id: "", status: "", assigned_to: "" };

// Form values for an existing lead (/leads/details).
function fromLead(lead) {
  const values = { ...EMPTY };
  for (const key of Object.keys(EMPTY)) values[key] = lead[key] || EMPTY[key];
  return values;
}

/**
 * lead     — the lead to edit (/leads/details), or null to add one.
 * defaults — initial values on add (e.g. { branch_id } from the list's tab).
 */
export default function LeadForm({ lead = null, defaults = {}, onSaved, onCancel }) {
  const [initial] = useState(() => (lead ? fromLead(lead) : { ...EMPTY_NEW, ...defaults }));
  const [form, setForm] = useState(initial);
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  // A new lead is saved in the picked branch (sent as x-branch-id); an
  // existing one stays in its branch.
  const myBranches = useMyBranches().branches;
  const branchId = lead
    ? lead.branch_id || ALL_BRANCHES
    : myBranches.some((b) => b.id === form.branch_id)
      ? form.branch_id
      : myBranches[0]?.id || ALL_BRANCHES;

  // Lead sources, statuses and options, the sub-sources of the chosen
  // source, and who can work leads in the branch (Assigned To).
  const { master, error: masterError, stale: masterStale } = useLeadMaster(branchId, form.lead_source_id || null);
  const { options: categories } = useCategoryOptions();

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const countryCodes = master?.country_codes || [];
  const countryCode = form.country_code || defaultCountryCode(countryCodes);
  const leadSources = master?.lead_sources || [];
  const subSources = masterStale ? [] : master?.lead_sub_sources || [];
  // The lead's current source / sub-source may since have been
  // deactivated: keep it selectable so saving doesn't drop it.
  const sourceMissing = form.lead_source_id && master && !leadSources.some((s) => s.id === form.lead_source_id);
  const subMissing =
    form.lead_sub_source_id && master && !masterStale && !subSources.some((s) => s.id === form.lead_sub_source_id);
  // Same for the architect (deactivated since, or no longer listed).
  const architects = master?.architects || [];
  const architectMissing = form.architect_id && master && !masterStale && !architects.some((a) => a.id === form.architect_id);
  // Same for deactivated requirement categories.
  const categoryOptions = (categories || []).map((c) => ({ value: c.id, label: c.category_name }));
  for (const c of lead?.requirement_in_cladding_categories || []) {
    if (!categoryOptions.some((o) => o.value === c.id)) categoryOptions.push({ value: c.id, label: c.category_name });
  }
  // "" (Me) = the person entering the lead, so they aren't listed twice.
  const myId = getSession()?.user?.id;
  const assignees = (master?.assignees || []).filter((a) => a.id !== myId);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCancel() {
    if (
      dirty &&
      !(await confirm({
        title: lead ? "Discard your changes?" : "Discard this new lead?",
        message: "What you've entered will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      }))
    ) {
      return;
    }
    onCancel();
  }

  async function handleSave(e) {
    e.preventDefault();
    // The branch goes as x-branch-id, not in the body.
    const fields = { ...form };
    delete fields.branch_id;
    const body = {
      ...fields,
      country_code: countryCode,
      lead_sub_source_id: fields.lead_sub_source_id || null,
      architect_id: fields.architect_id || null,
    };
    if (lead) {
      const saved = await save.post(LEAD_API.update, { id: lead.id, ...body }, { branchId });
      if (saved) onSaved(saved);
      return;
    }
    const saved = await save.post(
      LEAD_API.create,
      { ...body, status: body.status || null, assigned_to: body.assigned_to || null },
      { branchId }
    );
    if (saved) onSaved(saved);
  }

  // Text input bound to form[key], with its API validation message.
  function input(key, label, props = {}) {
    return (
      <div className="wf-field">
        <label htmlFor={`lead-${key}`}>{label}</label>
        <input
          id={`lead-${key}`}
          className="wf-input"
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          disabled={save.submitting}
          {...props}
        />
        <FieldError>{save.fieldErrors[key]}</FieldError>
      </div>
    );
  }

  // Select of a configured option list from the master ([{ value, label }]).
  function optionSelect(key, label, options) {
    return (
      <div className="wf-field">
        <label htmlFor={`lead-${key}`}>{label}</label>
        <select
          id={`lead-${key}`}
          className="wf-select"
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          disabled={save.submitting || !master}
        >
          <option value="">{master ? "Not set" : "Loading…"}</option>
          {/* A value no longer configured stays selectable. */}
          {form[key] && master && !(options || []).some((o) => o.value === form[key]) && (
            <option value={form[key]}>{form[key]}</option>
          )}
          {(options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldError>{save.fieldErrors[key]}</FieldError>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <Box title="Contact">
        <div className="wf-grid wf-grid-3">
          {input("full_name", "Full Name", { required: true, placeholder: "e.g. Ankit Verma", autoFocus: !lead, maxLength: 150 })}
          <PhoneField
            id="lead-mobile_number"
            label="Mobile Number"
            required
            countryCodes={countryCodes}
            code={countryCode}
            number={form.mobile_number}
            onCodeChange={(value) => set("country_code", value)}
            onNumberChange={(value) => set("mobile_number", value)}
            codeError={save.fieldErrors.country_code}
            numberError={save.fieldErrors.mobile_number}
            placeholder={phonePlaceholder(countryCodes, countryCode)}
            disabled={save.submitting}
          />
          {input("email", "Email", { type: "email", placeholder: "Optional", maxLength: 255 })}
          {input("company_name", "Company / Household", { placeholder: "e.g. Verma Residence", maxLength: 150 })}
        </div>
      </Box>

      <Box title="Source & Assignment">
        <div className="wf-grid wf-grid-3">
          <div className="wf-field">
            <label htmlFor="lead-source">Lead Source</label>
            <select
              id="lead-source"
              required
              className="wf-select"
              value={form.lead_source_id}
              onChange={(e) => setForm((f) => ({ ...f, lead_source_id: e.target.value, lead_sub_source_id: "" }))}
              disabled={save.submitting || !master}
            >
              <option value="">{master ? "Select lead source" : "Loading…"}</option>
              {sourceMissing && <option value={form.lead_source_id}>{lead?.lead_source_name || "Current lead source"}</option>}
              {leadSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lead_source_name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.lead_source_id || (masterError && masterError.message)}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="lead-sub-source">Sub-Source</label>
            <select
              id="lead-sub-source"
              className="wf-select"
              value={form.lead_sub_source_id}
              onChange={(e) => set("lead_sub_source_id", e.target.value)}
              disabled={save.submitting || !form.lead_source_id || masterStale}
            >
              <option value="">
                {!form.lead_source_id ? "Select a lead source first" : masterStale ? "Loading…" : subSources.length ? "None" : "No sub-sources"}
              </option>
              {subMissing && <option value={form.lead_sub_source_id}>{lead?.lead_sub_source_name || "Current sub-source"}</option>}
              {subSources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lead_source_name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.lead_sub_source_id}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="lead-architect">Architect</label>
            <select
              id="lead-architect"
              className="wf-select"
              value={form.architect_id}
              onChange={(e) => set("architect_id", e.target.value)}
              disabled={save.submitting || !master || masterStale}
            >
              <option value="">{!master || masterStale ? "Loading…" : architects.length ? "None" : "No architects yet"}</option>
              {architectMissing && <option value={form.architect_id}>{lead?.architect_name || "Current architect"}</option>}
              {architects.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firm_name ? `${a.architect_name} — ${a.firm_name}` : a.architect_name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.architect_id}</FieldError>
          </div>
          {lead ? (
            <div className="wf-field">
              <label htmlFor="lead-branch">Branch</label>
              <input id="lead-branch" className="wf-input" value={lead.branch_name || "No branch"} readOnly disabled />
            </div>
          ) : (
            <>
              <div className="wf-field">
                <label htmlFor="lead-branch">Branch</label>
                <select
                  id="lead-branch"
                  required
                  className="wf-select"
                  value={branchId}
                  // The assignee and architect lists are per branch — pick again.
                  onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value, assigned_to: "", architect_id: "" }))}
                  disabled={save.submitting || !myBranches.length}
                >
                  {!myBranches.length && <option value={ALL_BRANCHES}>No branch</option>}
                  {myBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="wf-field">
                <label htmlFor="lead-assigned_to">Assigned To</label>
                <select
                  id="lead-assigned_to"
                  className="wf-select"
                  value={form.assigned_to}
                  onChange={(e) => set("assigned_to", e.target.value)}
                  disabled={save.submitting || !master || masterStale}
                >
                  <option value="">Me</option>
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <FieldError>{save.fieldErrors.assigned_to}</FieldError>
              </div>
              <div className="wf-field">
                <label htmlFor="lead-status">Lead Status</label>
                <select
                  id="lead-status"
                  className="wf-select"
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  disabled={save.submitting || !master}
                >
                  <option value="">{master ? "Default status" : "Loading…"}</option>
                  {(master?.lead_statuses || []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <FieldError>{save.fieldErrors.status}</FieldError>
              </div>
            </>
          )}
        </div>
      </Box>

      <Box title="Requirement">
        <div className="wf-grid wf-grid-3">
          {optionSelect("project_type", "Project Type", master?.project_types)}
          {optionSelect("work_type", "Type of Property", master?.work_types)}
          {optionSelect("estimated_area", "Estimated Area", master?.estimated_areas)}
          {optionSelect("budget", "Budget", master?.budgets)}
          {optionSelect("planning_to_start", "Planning to Start", master?.planning_to_start)}
        </div>
        <CheckboxGroup
          label="Requirement in Cladding"
          options={categoryOptions}
          values={form.requirement_in_cladding}
          onChange={(values) => set("requirement_in_cladding", values)}
          disabled={save.submitting}
          error={save.fieldErrors.requirement_in_cladding}
        />
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={handleCancel} disabled={save.submitting}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : lead ? "Save Changes" : "Add Lead"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
