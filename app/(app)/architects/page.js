"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  BranchFilter,
  DataTable,
  FieldError,
  LoadError,
  Pagination,
  PhoneField,
  StatusBadge,
} from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { defaultCountryCode, formatPhone, phonePlaceholder } from "@/lib/phone";
import { ARCHITECT_API, STATUS, toBranchFilterOptions } from "@/lib/team";
import { useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
// country_code "" = the list's default code.
const EMPTY = { architect_name: "", firm_name: "", country_code: "", mobile_number: "", email: "", city: "", branch_id: "" };

function fromArchitect(a) {
  return {
    architect_name: a.architect_name,
    firm_name: a.firm_name || "",
    country_code: a.country_code || "",
    mobile_number: a.mobile_number || "",
    email: a.email || "",
    city: a.city || "",
    branch_id: a.branch_id || "",
  };
}

export default function ArchitectsPage() {
  const [branch, setBranch] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null = closed; { architect, initial, values }
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiData(ARCHITECT_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    branch_id: branch === "all" ? undefined : branch,
  });
  const master = useApiData(ARCHITECT_API.master);
  const branches = master.data?.branches || [];
  const countryCodes = master.data?.country_codes || [];
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const statusToggle = useStatusToggle(ARCHITECT_API.status, list.reload);

  const items = list.data?.items || [];
  const values = form?.values;
  const dirty = form && JSON.stringify(form.values) !== JSON.stringify(form.initial);
  const countryCode = values?.country_code || defaultCountryCode(countryCodes);

  // An architect's current branch stays selectable even if since deactivated.
  const branchOptions = [...branches];
  if (form?.architect?.branch_id && !branches.some((b) => b.id === form.architect.branch_id)) {
    branchOptions.unshift({ id: form.architect.branch_id, name: `${form.architect.branch_name} (inactive)` });
  }

  function set(key, value) {
    setForm((f) => ({ ...f, values: { ...f.values, [key]: value } }));
  }

  function openForm(architect) {
    save.reset();
    const initial = architect ? fromArchitect(architect) : { ...EMPTY, branch_id: branch === "all" ? "" : branch };
    setForm({ architect, initial, values: initial });
  }

  async function closeForm() {
    if (
      dirty &&
      !(await confirm({
        title: form.architect ? "Discard your changes?" : "Discard this new architect?",
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
    const { architect } = form;
    const body = { ...values, country_code: countryCode, branch_id: values.branch_id || null };
    const saved = await save.submit(() =>
      architect ? api.post(ARCHITECT_API.update, { id: architect.id, ...body }) : api.post(ARCHITECT_API.create, body)
    );
    if (saved) {
      setForm(null);
      list.reload();
    }
  }

  function toggleArchitect(a) {
    statusToggle.run(a, {
      name: `Ar. ${a.architect_name}`,
      deactivate: "They will be hidden from the lead form's Architect dropdown. Leads that already name them keep them.",
      activate: "They will appear in the lead form's Architect dropdown again.",
    });
  }

  // Text input bound to values[key], with its API validation message.
  function input(key, label, props = {}) {
    return (
      <div className="wf-field">
        <label htmlFor={`architect-${key}`}>{label}</label>
        <input
          id={`architect-${key}`}
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
          <h1 className="wf-h1">Architects</h1>
          <p className="wf-sub">Architects who refer projects. Active architects appear in the lead form&apos;s Architect dropdown.</p>
        </div>
        <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
          + Add Architect
        </button>
      </div>

      <LoadError error={master.error} onRetry={master.reload} />

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.architect ? `Edit Architect — Ar. ${form.architect.architect_name}` : "New Architect"}>
            <Alert>{save.error}</Alert>
            <div className="wf-grid wf-grid-3">
              {input("architect_name", "Architect Name", { required: true, placeholder: "e.g. Nikhil Bansal", autoFocus: true })}
              {input("firm_name", "Firm / Studio", { placeholder: "e.g. Bansal Associates" })}
              <PhoneField
                id="architect-mobile_number"
                label="Mobile Number"
                required
                countryCodes={countryCodes}
                code={countryCode}
                number={values.mobile_number}
                onCodeChange={(value) => set("country_code", value)}
                onNumberChange={(value) => set("mobile_number", value)}
                codeError={save.fieldErrors.country_code}
                numberError={save.fieldErrors.mobile_number}
                placeholder={phonePlaceholder(countryCodes, countryCode)}
                disabled={save.submitting}
              />
              {input("email", "Email", { type: "email", placeholder: "name@studio.in" })}
              {input("city", "City", { placeholder: "e.g. Jaipur" })}
              <div className="wf-field">
                <label htmlFor="architect-branch_id">Handled by Branch</label>
                <select
                  id="architect-branch_id"
                  className="wf-select"
                  value={values.branch_id}
                  onChange={(e) => set("branch_id", e.target.value)}
                  disabled={save.submitting || !master.data}
                >
                  <option value="">Not assigned</option>
                  {branchOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code ? `${b.name} (${b.code})` : b.name}
                    </option>
                  ))}
                </select>
                <FieldError>{save.fieldErrors.branch_id}</FieldError>
              </div>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={closeForm} disabled={save.submitting}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Saving…" : form.architect ? "Save Changes" : "Add Architect"}
              </button>
            </div>
          </Box>
        </form>
      )}

      {branches.length > 0 && (
        <BranchFilter
          branches={toBranchFilterOptions(branches)}
          value={branch}
          onChange={(value) => {
            setBranch(value);
            setPage(1);
          }}
        />
      )}

      <Box
        title={`Architect List (${list.data?.pagination.total ?? "…"})`}
        right={
          <input
            className="wf-input"
            style={{ width: 240 }}
            type="search"
            placeholder="Search name, firm, mobile, city"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        }
      >
        <LoadError error={list.error} onRetry={list.reload} />
        <Alert>{statusToggle.error}</Alert>
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading architects…</div>
        ) : (
          !list.error && (
            <DataTable
              columns={["Architect", "Firm", "City", "Branch", "Mobile", "Email", "Status", ""]}
              emptyLabel={debouncedSearch || branch !== "all" ? "No architects match these filters." : "No architects yet. Add the first one."}
              rows={items.map((a) => [
                <strong key="n">Ar. {a.architect_name}</strong>,
                a.firm_name || "—",
                a.city || "—",
                a.branch_name || "—",
                formatPhone(a.country_code, a.mobile_number),
                a.email || "—",
                <StatusBadge key="s" active={a.status === STATUS.ACTIVE} />,
                <div key="x" className="wf-btn-row">
                  <button type="button" className="wf-link-btn" onClick={() => openForm(a)}>
                    Edit
                  </button>
                  <button type="button" className="wf-link-btn" onClick={() => toggleArchitect(a)} disabled={statusToggle.submitting}>
                    {a.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
                  </button>
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
