"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MIcon } from "@/components/MobileUI";
import { setOnboarded } from "@/lib/install";
import { setRoleId } from "@/lib/roles";

// Sign-in inside the installed Supervisor app. Wireframe only: any
// password works; the real screen will call login() from lib/api.js.
export default function MobileLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ramesh.kadam@timberstone.in");
  const [password, setPassword] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setRoleId("Supervisor");
    setOnboarded(true);
    router.replace("/m");
  }

  return (
    <div className="wf-minstall">
      <div className="wf-minstall-hero compact">
        <span className="wf-minstall-logo">T</span>
        <h1 className="wf-minstall-title">Sign in</h1>
        <p className="wf-minstall-sub">Use the email and password from your manager</p>
      </div>

      <form className="wf-minstall-body" onSubmit={handleSubmit}>
        <div className="wf-field">
          <label htmlFor="m-email">Email</label>
          <input
            id="m-email"
            className="wf-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="wf-field">
          <label htmlFor="m-password">Password</label>
          <input
            id="m-password"
            className="wf-input"
            type="password"
            autoComplete="current-password"
            placeholder="Any password works in the demo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="wf-btn primary wf-minstall-cta">
          <MIcon name="lock" size={17} /> Sign in
        </button>
        <p className="wf-minstall-note">
          Forgot your password? Ask your branch manager to reset it from the web panel.
        </p>
        <p className="wf-minstall-hint">You stay signed in on this phone until you sign out.</p>
      </form>
    </div>
  );
}
