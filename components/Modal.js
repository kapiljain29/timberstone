"use client";

// A dialog over the page: title, content, closed by Escape, a click on the
// backdrop or the content's own buttons. `wide` for forms (the default
// width suits short messages). The one frame for every dialog —
// ConfirmDialog renders its confirmation inside it.
//
//   {open && (
//     <Modal title="Upload Sample" onClose={() => setOpen(false)} wide>
//       <form>…</form>
//     </Modal>
//   )}

import { useEffect, useId, useRef } from "react";

// Open dialogs, newest last — Escape closes only the top one (e.g. a
// confirmation opened from a form dialog).
const open = [];

export default function Modal({ title, onClose, wide = false, role = "dialog", describedBy, children }) {
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const me = {};
    open.push(me);
    const onKey = (e) => e.key === "Escape" && open[open.length - 1] === me && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      open.splice(open.indexOf(me), 1);
    };
  }, []);

  return (
    <div className="wf-modal-backdrop" onClick={onClose}>
      <div
        className={`wf-modal${wide ? " wide" : ""}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="wf-modal-title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
