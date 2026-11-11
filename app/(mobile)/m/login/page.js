"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FieldError } from "@/components/ui";
import { MIcon } from "@/components/MobileUI";
import { login } from "@/lib/api";
import { setOnboarded } from "@/lib/install";
import { useMyUser } from "@/lib/roles";
import { useSubmit } from "@/lib/useApi";

// Sign-in inside the installed Supervisor app (POST /api/public/auth/login,
// the same account as the web panel). Already signed in → home.
export default function MobileLoginPage() {
  const router = useRouter();
  const user = useMyUser();
  const form = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      setOnboarded(true);
      router.replace("/m");
    }
  }, [user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    // The session change sends the user home (effect above).
    await form.submit(() => login(email.trim(), password));
  }

  return (
    <div className="wf-minstall">
      <div className="wf-minstall-hero compact">
        <span className="wf-minstall-logo">T</span>
        <h1 className="wf-minstall-title">Sign in</h1>
        <p className="wf-minstall-sub">Use the email and password from your manager</p>
      </div>

      <form className="wf-minstall-body" onSubmit={handleSubmit} noValidate>
        <div className="wf-field">
          <label htmlFor="m-email">Email</label>
          <input
            id="m-email"
            className="wf-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={form.submitting}
            required
          />
          <FieldError>{form.fieldErrors.email}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor="m-password">Password</label>
          <input
            id="m-password"
            className="wf-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={form.submitting}
            required
          />
          <FieldError>{form.fieldErrors.password}</FieldError>
        </div>
        <button type="submit" className="wf-btn primary wf-minstall-cta" disabled={form.submitting}>
          <MIcon name="lock" size={17} /> {form.submitting ? "Signing in…" : "Sign in"}
        </button>
        <p className="wf-minstall-note">
          Forgot your password? Ask your branch manager to reset it from the web panel.
        </p>
        <p className="wf-minstall-hint">You stay signed in on this phone until you sign out.</p>
      </form>
    </div>
  );
}
