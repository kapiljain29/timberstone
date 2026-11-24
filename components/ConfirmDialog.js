"use client";

// Confirmation dialog for actions that are hard to undo or affect other
// people (deactivate, delete, sign someone out, ...). Use the hook:
//
//   const [confirm, confirmDialog] = useConfirm();
//   if (!(await confirm({ title: "Deactivate Karan?", message: "...", confirmLabel: "Deactivate" }))) return;
//   ...
//   return <>{...}{confirmDialog}</>;
//
// `tone: "danger"` (default) styles the confirm button red; use "primary"
// for confirmations that aren't destructive.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Modal from "@/components/Modal";

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);
  const messageId = useId();

  // Focus Cancel for destructive actions (a reflex Enter must not delete /
  // deactivate), otherwise the confirm button. Escape / the backdrop cancel
  // (Modal).
  useEffect(() => {
    (tone === "danger" ? cancelRef : confirmRef).current?.focus();
  }, [tone]);

  return (
    <Modal title={title} onClose={onCancel} role="alertdialog" describedBy={messageId}>
      <div id={messageId} className="wf-modal-body">
        {message}
      </div>
      <div className="wf-modal-actions">
        <button ref={cancelRef} type="button" className="wf-btn" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button ref={confirmRef} type="button" className={`wf-btn ${tone}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Returns [confirm, dialog]. `confirm(options)` opens the dialog and
 * resolves true (confirmed) or false (cancelled / Escape / backdrop).
 * Render `dialog` once in the screen.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null); // { options, resolve }

  const confirm = useCallback((options) => new Promise((resolve) => setRequest({ options, resolve })), []);

  const close = useCallback(
    (result) => {
      request?.resolve(result);
      setRequest(null);
    },
    [request]
  );
  const onCancel = useCallback(() => close(false), [close]);

  const dialog = request ? <ConfirmDialog {...request.options} onConfirm={() => close(true)} onCancel={onCancel} /> : null;

  return [confirm, dialog];
}
