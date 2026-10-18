"use client";

// Short-lived messages after an action or form submit — the one place
// success / error feedback is shown (see CLAUDE.md "Success and error
// messages"). useSubmit().post shows them for API calls; call directly only
// for feedback that isn't an API call:
//   toast.success("Lead status created successfully");
//   toast.error("Cannot reach the server. Check your connection.");
// <Toaster /> is mounted once, in app/layout.js.

import { useSyncExternalStore } from "react";

const SUCCESS_MS = 4000;
const ERROR_MS = 8000;

let toasts = [];
let nextId = 1;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

function dismiss(id) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function show(tone, message, ms) {
  if (!message) return;
  const id = nextId++;
  toasts = [...toasts, { id, tone, message }];
  emit();
  setTimeout(() => dismiss(id), ms);
}

export const toast = {
  success: (message) => show("success", message, SUCCESS_MS),
  error: (message) => show("error", message, ERROR_MS),
};

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY = [];

export function Toaster() {
  const list = useSyncExternalStore(
    subscribe,
    () => toasts,
    () => EMPTY
  );
  return (
    <div className="wf-toasts">
      {list.map((t) => (
        <div key={t.id} className={`wf-toast ${t.tone}`} role={t.tone === "error" ? "alert" : "status"}>
          <span>{t.message}</span>
          <button type="button" className="wf-toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
