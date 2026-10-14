"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { WEB_ROLES, findRoleByEmail, setRoleId } from "@/lib/roles";

// Web panel sign-in for Management, Sales, Marketing, Design and Accounts.
// Supervisors are pointed to the Timberstone Field app instead.
// Wireframe only: the email picks a demo user and any password works; the
// real screen will call login() from lib/api.js.

const PANEL_ROLES = WEB_ROLES.filter((r) => r.id !== "Supervisor");

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [supervisor, setSupervisor] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  function fillDemo(role) {
    setEmail(role.email);
    setPassword("demo1234");
    setError("");
    setSupervisor(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSupervisor(false);

    const match = findRoleByEmail(email);
    if (!match || !password) {
      // Same message for unknown email and wrong password — don't reveal which accounts exist.
      setError("Email or password is incorrect.");
      return;
    }
    if (match.id === "Supervisor") {
      setSupervisor(true);
      return;
    }

    setRoleId(match.id);
    // Return to the page that sent the user here, if it was a panel page.
    const next = new URLSearchParams(window.location.search).get("next");
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : match.home);
  }

  return (
    <div className="wf-login">
      <div className="wf-login-card">
        <aside className="wf-login-brand">
          <span className="wf-login-logo">T</span>
          <h2 className="wf-login-brand-title">Timberstone ERP</h2>
          <p className="wf-login-brand-sub">Lead-to-Handover Platform</p>
          <p className="wf-login-brand-label">Web panel for</p>
          <ul className="wf-login-brand-roles">
            {PANEL_ROLES.map((r) => (
              <li key={r.id}>{r.label}</li>
            ))}
          </ul>
          <Link href="/m/install" className="wf-login-brand-app">
            <span>
              <b>Site supervisor?</b>
              <br />
              Use the Timberstone Field app on your phone
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </aside>

        <form className="wf-login-form" onSubmit={handleSubmit} noValidate>
          <h1 className="wf-login-title">Sign in</h1>
          <p className="wf-login-sub">Use your work email and password.</p>

          {error && (
            <div className="wf-login-alert error" role="alert">
              {error}
            </div>
          )}
          {supervisor && (
            <div className="wf-login-alert info" role="alert">
              Supervisors work from the <b>Timberstone Field</b> mobile app.{" "}
              <Link href="/m/install">Install the app →</Link>
            </div>
          )}

          <div className="wf-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="wf-input"
              type="email"
              autoComplete="username"
              placeholder="name@timberstone.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="wf-field">
            <label htmlFor="login-password">Password</label>
            <div className="wf-login-password">
              <input
                id="login-password"
                className="wf-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Any password works in the demo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="wf-login-reveal" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="wf-login-row">
            <label className="wf-login-remember">
              <input type="checkbox" defaultChecked /> Keep me signed in
            </label>
            <button type="button" className="wf-login-link" onClick={() => setShowForgot((v) => !v)}>
              Forgot password?
            </button>
          </div>
          {showForgot && (
            <p className="wf-login-note">
              Ask Management or your admin to reset it from <b>Team &amp; Departments</b>. You&apos;ll get a new
              temporary password by email.
            </p>
          )}

          <button type="submit" className="wf-btn primary wf-login-submit">
            Sign in
          </button>

          <div className="wf-login-demo">
            <p className="wf-login-demo-label">Demo accounts · click to fill</p>
            <div className="wf-login-demo-grid">
              {PANEL_ROLES.map((r) => (
                <button key={r.id} type="button" className="wf-login-demo-btn" onClick={() => fillDemo(r)}>
                  <b>{r.label}</b>
                  <span>{r.user}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
      <p className="wf-login-footer">
        <Link href="/">← Back to Role Hub</Link> · Timberstone ERP wireframe
      </p>
    </div>
  );
}
