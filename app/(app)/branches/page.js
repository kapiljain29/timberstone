"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Box, DataTable, FieldError, LoadError, Pagination, PhoneField, StatusBadge } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { defaultCountryCode, formatPhone, phonePlaceholder } from "@/lib/phone";
import { BRANCH_API, STATUS } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
// phone_country_code "" = the list's default code.
const EMPTY = { code: "", name: "", city: "", phone_country_code: "", phone: "", email: "", gst_number: "", lead_manager_id: "", address: "" };

function fromBranch(b) {
  return {
    code: b.code,
    name: b.name,
    city: b.city || "",
    phone_country_code: b.phone_country_code || "",
    phone: b.phone || "",
    email: b.email || "",
    gst_number: b.gst_number || "",
    lead_manager_id: b.lead_manager_id || "",
    address: b.address || "",
  };
}

export default function BranchesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null = closed; { branch, initial, values }
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiData(BRANCH_API.list, { page, limit: PAGE_SIZE, search: debouncedSearch || undefined });
  const master = useApiData(BRANCH_API.master);
  const countryCodes = master.data?.country_codes || [];
  const leadManagers = master.data?.lead_managers || [];
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const statusToggle = useStatusToggle(BRANCH_API.status, list);
  const can = useCan();

  const items = list.data?.items || [];
  const values = form?.values;
  const phoneCode = values?.phone_country_code || defaultCountryCode(countryCodes);

  // Lead Manager options: people with Leads → Assign who work in this
  // branch (a new branch has nobody assigned yet → all-branch roles only).
  // The current manager stays listed even if no longer eligible.
  const editingId = form?.branch?.id;
  const managerOptions = leadManagers.filter((u) => u.all_branches || (editingId && u.branch_ids.includes(editingId)));
  if (form?.branch?.lead_manager_id && !managerOptions.some((u) => u.id === form.branch.lead_manager_id)) {
    managerOptions.unshift({ id: form.branch.lead_manager_id, name: `${form.branch.lead_manager_name} (no longer eligible)` });
  }
  const dirty = form && JSON.stringify(form.values) !== JSON.stringify(form.initial);

  function set(key, value) {
    setForm((f) => ({ ...f, values: { ...f.values, [key]: value } }));
  }

  function openForm(branch) {
    save.reset();
    const initial = branch ? fromBranch(branch) : EMPTY;
    setForm({ branch, initial, values: initial });
  }

  async function closeForm() {
    if (
      dirty &&
      !(await confirm({
        title: form.branch ? "Discard your changes?" : "Discard this new branch?",
        message: "What you've entered will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      }))
    ) {
      return;
    }
    setForm(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    const { branch } = form;
    const body = { ...values, phone_country_code: phoneCode, lead_manager_id: values.lead_manager_id || null };
    const saved = await save.post(branch ? BRANCH_API.update : BRANCH_API.create, branch ? { id: branch.id, ...body } : body);
    if (saved) {
      setForm(null);
      list.reload();
    }
  }

  function toggleBranch(b) {
    statusToggle.run(b, {
      name: `${b.name} (${b.code})`,
      deactivate: `Everyone assigned to this branch loses access to it right away, and it disappears from branch dropdowns. Its ${b.member_count} member(s), leads and other records are kept and come back when you activate it again.`,
      activate: "It will appear in branch dropdowns again, and members assigned to it get their access back.",
    });
  }

  // Text input bound to values[key], with its API validation message.
  function input(key, label, props = {}) {
    return (
      <div className="wf-field">
        <label htmlFor={`branch-${key}`}>{label}</label>
        <input
          id={`branch-${key}`}
          className="wf-input"
          value={values[key]}
          onChange={(e) => set(key, e.target.value)}
          disabled={save.submitting}
          {...props}
        />
        <FieldError>{save.fieldErrors[key]}</FieldError>
      </div>
    );
  }

  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Branches</h1>
          <p className="wf-sub">The branches Timberstone works from. Team members get access to the branches they are assigned to.</p>
        </div>
        {can("branches.add") && (
          <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
            + Add Branch
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.branch ? `Edit Branch — ${form.branch.name}` : "New Branch"}>
            <div className="wf-grid wf-grid-3">
              {input("name", "Branch Name", { required: true, placeholder: "e.g. Jaipur", autoFocus: true })}
              {input("code", "Branch Code", { required: true, placeholder: "e.g. JPR", style: { textTransform: "uppercase" }, maxLength: 20 })}
              {input("city", "City", { placeholder: "e.g. Jaipur" })}
              <PhoneField
                id="branch-phone"
                label="Phone"
                countryCodes={countryCodes}
                code={phoneCode}
                number={values.phone}
                onCodeChange={(value) => set("phone_country_code", value)}
                onNumberChange={(value) => set("phone", value)}
                codeError={save.fieldErrors.phone_country_code}
                numberError={save.fieldErrors.phone}
                placeholder={phonePlaceholder(countryCodes, phoneCode)}
                disabled={save.submitting}
              />
              {input("email", "Email", { type: "email", placeholder: "branch@timberstone.in" })}
              {input("gst_number", "GST Number", {
                placeholder: "15 characters, e.g. 08AABCT1234F1Z5",
                style: { textTransform: "uppercase" },
                maxLength: 15,
              })}
              <div className="wf-field">
                <label htmlFor="branch-lead_manager_id">Lead Manager</label>
                <select
                  id="branch-lead_manager_id"
                  className="wf-select"
                  value={values.lead_manager_id}
                  onChange={(e) => set("lead_manager_id", e.target.value)}
                  disabled={save.submitting || !master.data}
                >
                  <option value="">No lead manager</option>
                  {managerOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <FieldError>{save.fieldErrors.lead_manager_id}</FieldError>
              </div>
            </div>
            <div className="wf-field" style={{ marginTop: 14 }}>
              <label htmlFor="branch-address">Address</label>
              <textarea
                id="branch-address"
                className="wf-textarea"
                rows={2}
                value={values.address}
                onChange={(e) => set("address", e.target.value)}
                disabled={save.submitting}
                placeholder="Shown on challans and quotations"
              />
              <FieldError>{save.fieldErrors.address}</FieldError>
            </div>
            <Alert tone="info">
              The <strong>Lead Manager</strong> receives this branch&apos;s unassigned leads (e.g. new Meta leads in the head
              branch) and assigns them to their team. Only people with Leads → Assign who work in this branch can be picked.
            </Alert>
            <Alert tone="info">
              The branch code is the prefix for this branch&apos;s document numbers (quotations, work orders, challans).
              Changing it only affects documents numbered afterwards.
            </Alert>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={closeForm} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Saving…" : form.branch ? "Save Changes" : "Add Branch"}
              </button>
            </div>
          </Box>
        </form>
      )}

      <Box
        title={`Branches (${listTotal(list)})`}
        right={
          <input
            className="wf-input"
            style={{ width: 220 }}
            type="search"
            placeholder="Search name, code, city"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        }
      >
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading branches…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Branch", "Code", "City", "GST No.", "Phone", "Email", "Lead Manager", "Members", "Status", ""]}
              emptyLabel={debouncedSearch ? "No branches match this search." : "No branches yet. Add the first one."}
              rows={items.map((b) => [
                <strong key="n">{b.name}</strong>,
                b.code,
                b.city || "—",
                b.gst_number || "—",
                formatPhone(b.phone_country_code, b.phone),
                b.email || "—",
                b.lead_manager_name || "—",
                can("team.view") ? (
                  <Link key="m" href={`/team?branch=${b.id}`} className="wf-link-btn">
                    {b.member_count} active
                  </Link>
                ) : (
                  `${b.member_count} active`
                ),
                <StatusBadge key="s" active={b.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  {can("branches.edit") && (
                    <button type="button" className="wf-link-btn" onClick={() => openForm(b)}>
                      Edit
                    </button>
                  )}
                  {can("branches.status") && (
                    <button type="button" className="wf-link-btn" onClick={() => toggleBranch(b)} disabled={statusToggle.submitting}>
                      {b.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>,
              ])}
            />
          )
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
      {confirmDialog}
      {statusToggle.confirmDialog}
    </div>
  );
}
