"use client";

import { useState } from "react";
import { Alert, Box, FieldError } from "@/components/ui";
import { api } from "@/lib/api";
import { useRole } from "@/lib/roles";
import { useSubmit } from "@/lib/useApi";

const EMPTY = { current_password: "", new_password: "", confirm_password: "" };

// Any signed-in user changes their own password
// (POST /api/admin/account/change-password). This device stays signed in;
// the API signs out every other device.
export default function ChangePasswordPage() {
  const role = useRole();
  const [form, setForm] = useState(EMPTY);
  const [done, setDone] = useState(false);
  const save = useSubmit();

  function set(key, value) {
    setDone(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setDone(false);
    const changed = await save.submit(() => api.post("/api/admin/account/change-password", form).then(() => true));
    if (changed) {
      setForm(EMPTY);
      setDone(true);
    }
  }

  function field(key, label, autoComplete, hint) {
    return (
      <div className="wf-field" style={{ marginBottom: 16 }}>
        <label htmlFor={`pwd-${key}`}>{label}</label>
        <input
          id={`pwd-${key}`}
          className="wf-input"
          type="password"
          required
          autoComplete={autoComplete}
          value={form[key]}
          onChange={(e) => set(key, e.target.value)}
          disabled={save.submitting}
        />
        {hint && !save.fieldErrors[key] && <p className="wf-login-field-hint">{hint}</p>}
        <FieldError>{save.fieldErrors[key]}</FieldError>
      </div>
    );
  }

  return (
    <div>
      <div className="wf-crumb">My Account</div>
      <h1 className="wf-h1">Change Password</h1>
      <p className="wf-sub">Choose a new password for signing in to Timberstone.</p>

      {role && !role.fromApi ? (
        <Alert tone="info">Sign in with your own account to change its password.</Alert>
      ) : (
        <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 560 }}>
          <Box title="New Password">
            {done && (
              <Alert tone="info">
                Your password has been changed. You&apos;re still signed in here, and you&apos;ve been signed out on
                your other devices.
              </Alert>
            )}
            <Alert>{save.error}</Alert>
            {field("current_password", "Current Password", "current-password")}
            {field("new_password", "New Password", "new-password", "At least 8 characters, with a letter and a number.")}
            {field("confirm_password", "Confirm New Password", "new-password")}
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => { setForm(EMPTY); save.reset(); }} disabled={save.submitting}>
                Clear
              </button>
              <button type="submit" className="wf-btn primary" disabled={save.submitting}>
                {save.submitting ? "Changing…" : "Change Password"}
              </button>
            </div>
          </Box>
        </form>
      )}
    </div>
  );
}
