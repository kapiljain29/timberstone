"use client";

import Link from "next/link";
import { useState } from "react";
import AuthCard, { AuthInput } from "@/components/AuthCard";
import { ApiError, api } from "@/lib/api";

// Forgot password (POST /api/public/auth/forgot-password). The API answers
// the same way whether or not the email is registered, so this screen does too.

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (!email.trim()) {
      setFieldErrors({ email: "Enter your email" });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/public/auth/forgot-password", { email: email.trim() }, { auth: false });
      setSentTo(email.trim());
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(err.generalMessage);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <AuthCard>
        <h1 className="wf-login-title">Check your email</h1>
        <p className="wf-login-sub">
          If an account exists for <b>{sentTo}</b>, we&apos;ve sent it a link to reset your password. The link
          works once and expires in a short while.
        </p>
        <p className="wf-login-note">
          Didn&apos;t get it? Check your spam folder, or{" "}
          <button type="button" className="wf-login-link" onClick={() => setSentTo("")}>
            try again
          </button>
          .
        </p>
        <Link href="/login" className="wf-btn primary wf-login-submit">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="wf-login-title">Forgot password</h1>
        <p className="wf-login-sub">Enter your work email and we&apos;ll send you a link to reset your password.</p>

        {error && (
          <div className="wf-login-alert error" role="alert">
            {error}
          </div>
        )}

        <AuthInput
          id="forgot-email"
          label="Email"
          type="email"
          autoComplete="username"
          placeholder="name@timberstone.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          disabled={submitting}
          autoFocus
        />

        <button type="submit" className="wf-btn primary wf-login-submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send reset link"}
        </button>
        <p className="wf-login-back">
          <Link href="/login" className="wf-login-link">
            ← Back to sign in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
