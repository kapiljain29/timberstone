"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AuthCard, { AuthInput, AuthPasswordInput } from "@/components/AuthCard";
import { InstallAppLink } from "@/components/InstallBar";
import { ApiError, login, logout } from "@/lib/api";
import { getWebRole, useRoleId, webRoleIdForApiUser } from "@/lib/roles";

// Web panel sign-in (POST /api/public/auth/login). Every role whose
// permissions open at least one panel section can sign in (lib/roles.js);
// a role with none sees a notice, and Supervisors are pointed to the
// Timberstone Field app instead.


// Only same-site paths, so ?next= can't send the user to another site.
function nextPath(fallback) {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export default function LoginPage() {
  const router = useRouter();
  const roleId = useRoleId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(""); // "supervisor" | "not-enabled"

  // Already signed in through the API — skip the form.
  useEffect(() => {
    if (roleId && getWebRole(roleId).fromApi) router.replace(nextPath(getWebRole(roleId).home));
  }, [roleId, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setNotice("");

    const errors = {};
    if (!email.trim()) errors.email = "Enter your email";
    if (!password) errors.password = "Enter your password";
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await login(email.trim(), password);
      const webRoleId = webRoleIdForApiUser(user);
      if (!webRoleId) {
        // Valid account, but this role's panel isn't on the API yet.
        await logout();
        setNotice(user.role === "supervisor" ? "supervisor" : "not-enabled");
        return;
      }
      router.replace(nextPath(getWebRole(webRoleId).home));
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

  return (
    <AuthCard>
      <form onSubmit={handleSubmit} noValidate>
        <h1 className="wf-login-title">Sign in</h1>
        <p className="wf-login-sub">Use your work email and password.</p>

        {error && (
          <div className="wf-login-alert error" role="alert">
            {error}
          </div>
        )}
        {notice === "supervisor" && (
          <div className="wf-login-alert info" role="alert">
            Supervisors work from the <b>Timberstone Field</b> mobile app.{" "}
            <Link href="/m/install">Install the app →</Link>
          </div>
        )}
        {notice === "not-enabled" && (
          <div className="wf-login-alert info" role="alert">
            Your role doesn&apos;t have access to the web panel yet. Ask your administrator to give it permissions
            under Roles &amp; Permissions.
          </div>
        )}

        <AuthInput
          id="login-email"
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
        <AuthPasswordInput
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          disabled={submitting}
        />

        <div className="wf-login-row">
          <Link href="/forgot-password" className="wf-login-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="wf-btn primary wf-login-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
        <InstallAppLink className="wf-login-install-link" />
      </form>
    </AuthCard>
  );
}
