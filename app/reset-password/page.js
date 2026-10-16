"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthCard, { AuthPasswordInput } from "@/components/AuthCard";
import { ApiError, api } from "@/lib/api";

// Reset password from the emailed link: /reset-password?token=...
// Checks the link first (POST /api/public/auth/verify-reset-token), then
// sets the new password (POST /api/public/auth/reset-password). A reset
// signs the user out everywhere, so they sign in again afterwards.

const PASSWORD_HINT = "At least 8 characters, with a letter and a number.";

export default function ResetPasswordPage() {
  // "checking" | "invalid" | "form" | "done"
  const [stage, setStage] = useState("checking");
  const [token, setToken] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const started = useRef(false);

  useEffect(() => {
    // Run once — the token is removed from the URL below (StrictMode re-runs effects).
    if (started.current) return;
    started.current = true;

    const value = new URLSearchParams(window.location.search).get("token") || "";
    // Keep the token out of the address bar and browser history.
    window.history.replaceState(null, "", window.location.pathname);

    // No token in the link counts as an invalid link (same 400 path below).
    const check = value
      ? api.post("/api/public/auth/verify-reset-token", { token: value }, { auth: false })
      : Promise.reject(new ApiError(400, [{ param: "token", msg: "is required" }]));
    check
      .then((result) => {
        setToken(value);
        setAccountEmail(result.email);
        setStage("form");
      })
      .catch((err) => {
        // Network / server trouble isn't an invalid link — let them retry.
        if (err instanceof ApiError && (err.status === 400 || err.status === 422)) setStage("invalid");
        else {
          setToken(value);
          setError(err.message);
          setStage("form");
        }
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const errors = {};
    if (!password) errors.password = "Enter a new password";
    if (!confirmPassword) errors.confirmPassword = "Re-enter the new password";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords don't match";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/public/auth/reset-password", { token, password, confirmPassword }, { auth: false });
      setStage("done");
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.token) {
        setStage("invalid");
      } else if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(err.generalMessage);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (stage === "checking") {
    return (
      <AuthCard>
        <h1 className="wf-login-title">Reset password</h1>
        <p className="wf-login-sub">Checking your reset link…</p>
      </AuthCard>
    );
  }

  if (stage === "invalid") {
    return (
      <AuthCard>
        <h1 className="wf-login-title">Link expired</h1>
        <p className="wf-login-sub">
          This reset link is invalid, has expired or has already been used. Request a new one to reset your password.
        </p>
        <Link href="/forgot-password" className="wf-btn primary wf-login-submit">
          Request a new link
        </Link>
        <p className="wf-login-back">
          <Link href="/login" className="wf-login-link">
            ← Back to sign in
          </Link>
        </p>
      </AuthCard>
    );
  }

  if (stage === "done") {
    return (
      <AuthCard>
        <h1 className="wf-login-title">Password updated</h1>
        <p className="wf-login-sub">
          Your password has been reset and you&apos;ve been signed out on all devices. Sign in with your new password.
        </p>
        <Link href="/login" className="wf-btn primary wf-login-submit">
          Sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="wf-login-title">Choose a new password</h1>
        <p className="wf-login-sub">
          {accountEmail ? (
            <>
              For <b>{accountEmail}</b>
            </>
          ) : (
            "Enter your new password."
          )}
        </p>

        {error && (
          <div className="wf-login-alert error" role="alert">
            {error}
          </div>
        )}

        {/* Lets password managers save the new password against the account. */}
        <input type="hidden" autoComplete="username" value={accountEmail} readOnly />
        <AuthPasswordInput
          id="reset-password"
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          hint={PASSWORD_HINT}
          disabled={submitting}
          autoFocus
        />
        <AuthPasswordInput
          id="reset-confirm-password"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={fieldErrors.confirmPassword}
          disabled={submitting}
        />

        <button type="submit" className="wf-btn primary wf-login-submit" disabled={submitting}>
          {submitting ? "Saving…" : "Reset password"}
        </button>
      </form>
    </AuthCard>
  );
}
