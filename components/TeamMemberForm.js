"use client";

// Add / edit form for a team member — used by the Add Team Member page
// (/team/new) and the inline Edit on the Team Members list. Saves through
// the API and calls onSaved(member); onCancel() runs after the user
// confirms discarding unsaved changes.

import { useState } from "react";
import { Alert, Box, CheckboxGroup, FieldError, PhoneField } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { defaultCountryCode, phonePlaceholder } from "@/lib/phone";
import { TEAM_API } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

const EMPTY = {
  name: "",
  email: "",
  country_code: "", // "" = the list's default code
  mobile_number: "",
  role: "",
  department_id: "",
  designation: "",
  reporting_manager_id: "",
  branch_ids: [],
  password: "",
};

// Form values for an existing member (list row from the API).
function fromMember(member) {
  return {
    ...EMPTY,
    name: member.name,
    email: member.email,
    country_code: member.country_code || "",
    mobile_number: member.mobile_number || "",
    role: member.role,
    department_id: member.department_id || "",
    designation: member.designation || "",
    reporting_manager_id: member.reporting_manager_id || "",
    branch_ids: member.branches.map((b) => b.id),
  };
}

/**
 * member   — the member to edit (list row), or null to add one.
 * defaults — initial values when adding (e.g. { department_id }).
 * master   — the team master ({ departments, branches, roles, users }), null while loading.
 */
export default function TeamMemberForm({ member = null, defaults = {}, master, onSaved, onCancel }) {
  const [initial] = useState(() => (member ? fromMember(member) : { ...EMPTY, ...defaults }));
  const [form, setForm] = useState(initial);
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  const roles = master?.roles || [];
  const countryCodes = master?.country_codes || [];
  const countryCode = form.country_code || defaultCountryCode(countryCodes);
  const formRole = roles.find((r) => r.value === form.role);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  // Reporting Manager options: active members except this one. A current
  // manager who has since been deactivated stays listed so saving keeps them.
  const managers = (master?.users || []).filter((u) => u.id !== member?.id);
  if (member?.reporting_manager_id && !managers.some((u) => u.id === member.reporting_manager_id)) {
    managers.unshift({ id: member.reporting_manager_id, name: `${member.reporting_manager_name} (inactive)` });
  }

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCancel() {
    if (
      dirty &&
      !(await confirm({
        title: member ? "Discard your changes?" : "Discard this new team member?",
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
    const { password, ...fields } = form;
    const body = {
      ...fields,
      country_code: countryCode,
      department_id: fields.department_id || null,
      reporting_manager_id: fields.reporting_manager_id || null,
      branch_ids: formRole?.all_branches ? [] : fields.branch_ids,
    };

    if (member) {
      // The API signs the member out everywhere when their role changes or
      // a branch is removed — confirm first.
      const roleChanged = member.role !== body.role;
      const branchRemoved = member.branches.some((b) => !body.branch_ids.includes(b.id));
      if (
        (roleChanged || branchRemoved) &&
        !(await confirm({
          title: `Sign ${body.name || "this member"} out everywhere?`,
          message: `${roleChanged ? `Changing their role to ${formRole?.label || body.role}` : "Removing a branch"} signs them out on all devices. They'll need to sign in again to continue.`,
          confirmLabel: "Save and sign out",
          tone: "primary",
        }))
      ) {
        return;
      }
    }

    const saved = await save.submit(() =>
      member ? api.post(TEAM_API.update, { id: member.id, ...body }) : api.post(TEAM_API.create, { ...body, password })
    );
    if (saved) onSaved(saved);
  }

  // Text input bound to form[key], with its API validation message.
  function input(key, label, props = {}) {
    return (
      <div className="wf-field">
        <label htmlFor={`member-${key}`}>{label}</label>
        <input
          id={`member-${key}`}
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

  return (
    <form onSubmit={handleSave} noValidate>
      <Box title={member ? `Edit Team Member — ${member.name}` : "Member Details"}>
        <Alert>{save.error}</Alert>
        <div className="wf-grid wf-grid-3">
          {input("name", "Full Name", { required: true, placeholder: "e.g. Karan Mathur", autoFocus: !member })}
          {input("email", "Email", { required: true, type: "email", placeholder: "name@timberstone.in" })}
          <PhoneField
            id="member-mobile_number"
            label="Mobile Number"
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
          <div className="wf-field">
            <label htmlFor="member-role">Role</label>
            <select
              id="member-role"
              required
              className="wf-select"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              disabled={save.submitting || !master}
            >
              <option value="">{master ? "Select role…" : "Loading…"}</option>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.role}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="member-department">Department</label>
            <select
              id="member-department"
              className="wf-select"
              value={form.department_id}
              onChange={(e) => set("department_id", e.target.value)}
              disabled={save.submitting || !master}
            >
              <option value="">No department</option>
              {(master?.departments || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.department_id}</FieldError>
          </div>
          {input("designation", "Designation", { placeholder: "e.g. Sales Executive" })}
          <div className="wf-field">
            <label htmlFor="member-reporting_manager_id">Reporting Manager (optional)</label>
            <select
              id="member-reporting_manager_id"
              className="wf-select"
              value={form.reporting_manager_id}
              onChange={(e) => set("reporting_manager_id", e.target.value)}
              disabled={save.submitting || !master}
            >
              <option value="">No reporting manager</option>
              {managers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <FieldError>{save.fieldErrors.reporting_manager_id}</FieldError>
          </div>
          {!member &&
            input("password", "Password", {
              required: true,
              type: "password",
              autoComplete: "new-password",
              placeholder: "Min 8 chars, a letter and a number",
            })}
        </div>
        <div style={{ margin: "16px 0" }}>
          {formRole?.all_branches ? (
            <Alert tone="info">{formRole.label} can see every branch — no branch selection needed.</Alert>
          ) : (
            <CheckboxGroup
              label="Branches"
              required
              options={(master?.branches || []).map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
              values={form.branch_ids}
              onChange={(ids) => set("branch_ids", ids)}
              disabled={save.submitting}
              error={save.fieldErrors.branch_ids || (master && !master.branches.length ? "No active branches yet." : "")}
            />
          )}
        </div>
        <Alert tone="info">
          {member
            ? "Changing the role or removing a branch signs this member out on all devices. Passwords are changed through \"Forgot password\" on the sign-in page."
            : "The member signs in to the panel with this email and password. They can change the password later through \"Forgot password\"."}
        </Alert>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={handleCancel} disabled={save.submitting}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : member ? "Save Changes" : "Add Team Member"}
          </button>
        </div>
      </Box>
      {confirmDialog}
    </form>
  );
}
