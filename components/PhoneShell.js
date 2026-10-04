"use client";

// Chrome for the Supervisor Mobile App wireframe: a phone-frame + bottom
// tab bar, used by every route under /m. On a real phone (viewport <=
// 480px) the decorative bezel/notch/status-bar disappear via CSS so it
// behaves like an installed full-screen app; on desktop it renders as a
// phone mockup so the client can review the design in a normal browser.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MIcon } from "@/components/MobileUI";
import { NOTIFICATIONS } from "@/lib/data";

const TABS = [
  { href: "/m", label: "Home", icon: "home" },
  { href: "/m/projects", label: "Projects", icon: "projects" },
  { href: "/m/dsr", label: "DSR", icon: "dsr" },
  { href: "/m/notifications", label: "Alerts", icon: "bell", badge: NOTIFICATIONS.length },
  { href: "/m/profile", label: "Profile", icon: "user" },
];

export default function PhoneShell({ children }) {
  const pathname = usePathname();

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
        <div className="wf-phone-content">{children}</div>
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
      </div>
      <p className="wf-phone-caption">
        Supervisor Mobile App · clickable wireframe · same data model as the desktop app
      </p>
    </div>
  );
}
