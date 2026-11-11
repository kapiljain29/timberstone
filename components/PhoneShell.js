"use client";

// Chrome for the Supervisor Mobile App wireframe: a phone-frame + bottom
// tab bar, used by every route under /m. On a real phone (viewport <=
// 480px) the decorative bezel/notch/status-bar disappear via CSS so it
// behaves like an installed full-screen app; on desktop it renders as a
// phone mockup so the client can review the design in a normal browser.
//
// First run: until the supervisor has been through the install screen
// (lib/install.js), every screen redirects to /m/install; after that,
// without an API session (signed out, or the refresh token was rejected)
// every screen redirects to /m/login. The install and login screens render
// "bare" — no app bar or tab bar. The profile and permissions are
// refreshed from the API once per load (refreshProfile).

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { MIcon } from "@/components/MobileUI";
import { refreshProfile } from "@/lib/api";
import { useOnboarded } from "@/lib/install";
import { useMyUser } from "@/lib/roles";

const ONBOARDING_ROUTES = ["/m/install", "/m/login"];

const TABS = [
  { href: "/m", label: "Home", icon: "home" },
  { href: "/m/sites", label: "Sites", icon: "sites" },
  { href: "/m/dsr", label: "DSR", icon: "dsr" },
  { href: "/m/notifications", label: "Alerts", icon: "bell" },
  { href: "/m/profile", label: "Profile", icon: "user" },
];

export default function PhoneShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const onboarded = useOnboarded();
  const user = useMyUser();
  const bare = ONBOARDING_ROUTES.includes(pathname);
  const blocked = !bare && (onboarded !== true || !user);
  const signedIn = Boolean(user);

  useEffect(() => {
    if (bare) return;
    if (onboarded === false) router.replace("/m/install");
    else if (onboarded === true && user === null) router.replace("/m/login");
  }, [bare, onboarded, user, router]);

  useEffect(() => {
    if (signedIn) refreshProfile().catch(() => {});
  }, [signedIn]);

  return (
    <div className="wf-phone-page">
      <div className="wf-phone">
        <div className="wf-phone-notch" />
        <div className="wf-phone-statusbar">
          <span>9:41</span>
          <span className="wf-phone-status-icons">
            <i className="sig" />
            <i className="bat" />
          </span>
        </div>
        {!bare && (
          <div className="wf-phone-appbar">
            <span className="wf-phone-appbar-logo">T</span>
            <div>
              <div className="wf-phone-appbar-title">Timberstone Field</div>
              <div className="wf-phone-appbar-sub">Supervisor App</div>
            </div>
            <Link href="/" className="wf-phone-exit" title="Exit to Role Hub" aria-label="Exit to Role Hub">
              <MIcon name="exit" size={18} />
            </Link>
          </div>
        )}
        <div className={`wf-phone-content${bare ? " bare" : ""}`}>
          {blocked ? <div className="wf-empty">Loading…</div> : children}
        </div>
        {!bare && (
          <nav className="wf-phone-tabbar">
            {TABS.map((tab) => {
              const active = tab.href === "/m" ? pathname === "/m" : pathname.startsWith(tab.href);
              return (
                <Link key={tab.href} href={tab.href} className={`wf-phone-tab${active ? " active" : ""}`}>
                  <span className="wf-phone-tab-icon">
                    <MIcon name={tab.icon} size={21} />
                    {!!tab.badge && <span className="wf-phone-tab-badge">{tab.badge}</span>}
                  </span>
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>
      <p className="wf-phone-caption">
        Supervisor Mobile App · clickable wireframe · same data model as the desktop app
        {bare && (
          <>
            {" · "}
            <Link href="/">Back to Role Hub</Link>
          </>
        )}
      </p>
    </div>
  );
}
