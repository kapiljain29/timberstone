"use client";

import Link from "next/link";
import { useState } from "react";
import { useBranding } from "@/lib/team";

// Shared layout and fields for the signed-out screens: /login,
// /forgot-password, /reset-password.

export default function AuthCard({ children }) {
  // The logo uploaded in Site Settings → General; the "T" mark until one is
  // uploaded (or while it loads).
  const branding = useBranding();
  return (
    <div className="wf-login">
      <div className="wf-login-card">
        <aside className="wf-login-brand">
          {branding?.logo_url ? (
            <>
              {/* Shown in cream on the dark panel (one-colour logo); it
                  already carries the name, so no title. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded file on the API server */}
              <img className="wf-login-logo-mark" src={branding.logo_url} alt={branding.app_name || "Timberstone ERP"} />
              <p className="wf-login-brand-sub wf-login-brand-tagline">ERP · Lead-to-Handover Platform</p>
            </>
          ) : (
            <>
              <span className="wf-login-logo">T</span>
              <h2 className="wf-login-brand-title">Timberstone ERP</h2>
              <p className="wf-login-brand-sub">Lead-to-Handover Platform</p>
            </>
          )}

          <div className="wf-login-brand-foot">
            <p className="wf-login-brand-label">One platform for</p>
            <ul className="wf-login-brand-roles">
              <li>Leads</li>
              <li>Call Queue</li>
              <li>Design</li>
              <li>Approvals</li>
              <li>Projects</li>
            </ul>
          </div>

          {/* <Link href="/m/install" className="wf-login-brand-app">
            <span>
              <b>Site supervisor?</b>
              <br />
              Use the Timberstone Field app on your phone
            </span>
            <span aria-hidden="true">→</span>
          </Link> */}
        </aside>

        <div className="wf-login-form">{children}</div>
      </div>
      <p className="wf-login-footer">Timberstone ERP</p>
    </div>
  );
}

// Labelled input with its validation message underneath. `hint` shows
// when there is no error.
export function AuthField({ id, label, error, hint, children }) {
  const messageId = `${id}-message`;
  return (
    <div className="wf-field">
      <label htmlFor={id}>{label}</label>
      {children({ "aria-invalid": !!error, "aria-describedby": error || hint ? messageId : undefined })}
      {error ? (
        <p id={messageId} className="wf-login-field-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="wf-login-field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function AuthInput({ id, label, error, hint, ...inputProps }) {
  return (
    <AuthField id={id} label={label} error={error} hint={hint}>
      {(aria) => <input id={id} className="wf-input" {...aria} {...inputProps} />}
    </AuthField>
  );
}

export function AuthPasswordInput({ id, label, error, hint, ...inputProps }) {
  const [show, setShow] = useState(false);
  return (
    <AuthField id={id} label={label} error={error} hint={hint}>
      {(aria) => (
        <div className="wf-login-password">
          <input id={id} className="wf-input" type={show ? "text" : "password"} {...aria} {...inputProps} />
          <button type="button" className="wf-login-reveal" onClick={() => setShow((v) => !v)}>
            {show ? "Hide" : "Show"}
          </button>
        </div>
      )}
    </AuthField>
  );
}
