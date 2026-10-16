"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Box, DataTable, FieldError, LoadError, Pagination, StatusBadge } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { api } from "@/lib/api";
import { BRANCH_API, STATUS } from "@/lib/team";
import { useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const EMPTY = { code: "", name: "", city: "", phone: "", email: "", address: "" };

function fromBranch(b) {
  return { code: b.code, name: b.name, city: b.city || "", phone: b.phone || "", email: b.email || "", address: b.address || "" };
}

export default function BranchesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null = closed; { branch, initial, values }
  const debouncedSearch = useDebouncedValue(search.trim());

  const list = useApiData(BRANCH_API.list, { page, limit: PAGE_SIZE, search: debouncedSearch || undefined });
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const statusToggle = useStatusToggle(BRANCH_API.status, list.reload);

  const items = list.data?.items || [];
  const values = form?.values;
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
    const saved = await save.submit(() =>
      branch ? api.post(BRANCH_API.update, { id: branch.id, ...values }) : api.post(BRANCH_API.create, values)
    );
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
        <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => openForm(null)}>
          + Add Branch
        </button>
      </div>

      {form && (
        <form onSubmit={handleSave} noValidate>
          <Box title={form.branch ? `Edit Branch — ${form.branch.name}` : "New Branch"}>
            <Alert>{save.error}</Alert>
            <div className="wf-grid wf-grid-3">
              {input("name", "Branch Name", { placeholder: "e.g. Jaipur", autoFocus: true })}
              {input("code", "Branch Code", { placeholder: "e.g. JPR", style: { textTransform: "uppercase" }, maxLength: 20 })}
              {input("city", "City", { placeholder: "e.g. Jaipur" })}
              {input("phone", "Phone", { type: "tel", placeholder: "10–15 digits, e.g. 9829010001" })}
              {input("email", "Email", { type: "email", placeholder: "branch@timberstone.in" })}
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
        title={`Branches (${list.data?.pagination.total ?? "…"})`}
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
        <Alert>{statusToggle.error}</Alert>
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading branches…</div>
        ) : (
          !list.error && (
            <DataTable
              columns={["Branch", "Code", "City", "Phone", "Email", "Members", "Status", ""]}
              emptyLabel={debouncedSearch ? "No branches match this search." : "No branches yet. Add the first one."}
              rows={items.map((b) => [
                <strong key="n">{b.name}</strong>,
                b.code,
                b.city || "—",
                b.phone || "—",
                b.email || "—",
                <Link key="m" href={`/team?branch=${b.id}`} className="wf-link-btn">
                  {b.member_count} active
                </Link>,
                <StatusBadge key="s" active={b.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  <button type="button" className="wf-link-btn" onClick={() => openForm(b)}>
                    Edit
                  </button>
                  <button type="button" className="wf-link-btn" onClick={() => toggleBranch(b)} disabled={statusToggle.submitting}>
                    {b.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
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
