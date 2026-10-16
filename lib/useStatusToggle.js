"use client";

// Activate / deactivate a record through its API `/status` endpoint, with
// the confirmation every status toggle needs (see CLAUDE.md "Confirm before
// impactful actions").
//
//   const statusToggle = useStatusToggle(DEPARTMENT_API.status, list.reload);
//   <button onClick={() => statusToggle.run(d, { name: d.department_name, activate: "...", deactivate: "..." })}>
//   <Alert>{statusToggle.error}</Alert>
//   {statusToggle.confirmDialog}

import { useConfirm } from "@/components/ConfirmDialog";
import { api } from "./api";
import { STATUS } from "./team";
import { useSubmit } from "./useApi";

export function useStatusToggle(path, onDone) {
  const submit = useSubmit();
  const [confirm, confirmDialog] = useConfirm();

  /**
   * record: { id, status: 1 | 0 }. text: { name, activate, deactivate } —
   * the record's display name and what each change will do (dialog message).
   */
  async function run(record, text) {
    const status = record.status === STATUS.ACTIVE ? STATUS.INACTIVE : STATUS.ACTIVE;
    const activating = status === STATUS.ACTIVE;
    const confirmed = await confirm({
      title: `${activating ? "Activate" : "Deactivate"} ${text.name}?`,
      message: activating ? text.activate : text.deactivate,
      confirmLabel: activating ? "Activate" : "Deactivate",
      tone: activating ? "primary" : "danger",
    });
    if (!confirmed) return;
    if (await submit.submit(() => api.post(path, { id: record.id, status }))) onDone?.();
  }

  return { run, submitting: submit.submitting, error: submit.error, confirmDialog };
}
