"use client";

// Activate / deactivate a record through its API `/status` endpoint, with
// the confirmation every status toggle needs (see CLAUDE.md "Confirm before
// impactful actions").
//
//   const statusToggle = useStatusToggle(DEPARTMENT_API.status, list);
//   <button onClick={() => statusToggle.run(d, { name: d.department_name, activate: "...", deactivate: "..." })}>
//   {statusToggle.confirmDialog}
//
// The API's success or error message is shown as a toast (useSubmit().post).
//
// `list` is the screen's useApiData list ({ items }): the row shows its new
// status as soon as the API accepts it, then the list reloads. `onDone`
// (optional) runs after that, e.g. to reload a master list too.

import { useConfirm } from "@/components/ConfirmDialog";
import { STATUS } from "./team";
import { useSubmit } from "./useApi";

export function useStatusToggle(path, list, onDone) {
  // No form fields here, so every error (incl. invalid id / status) is a toast.
  const submit = useSubmit({ fieldErrorsInToast: true });
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
    if (!(await submit.post(path, { id: record.id, status }))) return;
    list.patch((data) => ({ ...data, items: data.items.map((item) => (item.id === record.id ? { ...item, status } : item)) }));
    list.reload();
    onDone?.();
  }

  return { run, submitting: submit.submitting, confirmDialog };
}
