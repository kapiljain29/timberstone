"use client";

// Super Admin sets a team member's password from the Team list
// (POST /api/admin/team/set-password): new password twice, then a
// confirmation — the member is signed out on every device and told by
// email. Closing with something typed is confirmed too.

import { useState } from "react";
import { FieldError } from "@/components/ui";
import Modal from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { TEAM_API } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

const EMPTY = { new_password: "", confirm_password: "" };

/**
 * member — the team member ({ id, name }); onClose() — after saving or cancelling.
 */
export default function SetPasswordDialog({ member, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const typed = Boolean(form.new_password || form.confirm_password);

  async function close() {
    if (typed && !(await confirm({ title: "Discard the new password?", message: "What you've typed will be lost.", confirmLabel: "Discard", cancelLabel: "Keep editing" }))) return;
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await confirm({
      title: `Change ${member.name}'s password?`,
      message: `${member.name} is signed out on every device and must sign in with the new password. They are told by email. Give them the new password yourself — it isn't sent to them.`,
      confirmLabel: "Change Password",
    });
    if (!ok) return;
    if (await save.post(TEAM_API.setPassword, { id: member.id, ...form })) onClose();
  }

  const field = (key, label, hint) => (
    <div className="wf-field">
      <label htmlFor={`set-${key}`}>{label}</label>
      <input
        id={`set-${key}`}
        className="wf-input"
        type="password"
        required
        autoComplete="new-password"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        disabled={save.submitting}
      />
      {hint && !save.fieldErrors[key] && <p className="wf-login-field-hint">{hint}</p>}
      <FieldError>{save.fieldErrors[key]}</FieldError>
    </div>
  );

  return (
    <Modal title={`Change Password — ${member.name}`} onClose={close} wide>
      <form onSubmit={handleSubmit} noValidate>
        {field("new_password", "New Password", "At least 8 characters, with a letter and a number.")}
        {field("confirm_password", "Confirm New Password")}
        <FieldError>{save.fieldErrors.id}</FieldError>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={close} disabled={save.submitting}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Changing…" : "Change Password"}
          </button>
        </div>
      </form>
      {confirmDialog}
    </Modal>
  );
}
