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

import { useCallback, useEffect, useRef, useState } from "react";

export function ConfirmDialog({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "danger", onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const confirmRef = useRef(null);

  // Focus Cancel for destructive actions (a reflex Enter must not delete /
  // deactivate), otherwise the confirm button. Escape cancels.
  useEffect(() => {
    (tone === "danger" ? cancelRef : confirmRef).current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, tone]);

  return (
    <div className="wf-modal-backdrop" onClick={onCancel}>
      <div
        className="wf-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="wf-confirm-title"
        aria-describedby="wf-confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="wf-confirm-title" className="wf-modal-title">
          {title}
        </h2>
        <div id="wf-confirm-message" className="wf-modal-body">
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
      </div>
    </div>
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
