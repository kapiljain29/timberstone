"use client";

// Chrome for the Supervisor Mobile App wireframe: a phone-frame + bottom
// tab bar, used by every route under /m. On a real phone (viewport <=
// 480px) the decorative bezel/notch/status-bar disappear via CSS so it
// behaves like an installed full-screen app; on desktop it renders as a
// phone mockup so the client can review the design in a normal browser.

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/m", label: "Home", icon: "🏠" },
  { href: "/m/projects", label: "Projects", icon: "📁" },
  { href: "/m/dsr", label: "DSR", icon: "📝" },
  { href: "/m/notifications", label: "Alerts", icon: "🔔" },
  { href: "/m/profile", label: "Profile", icon: "👤" },
];

export default function PhoneShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="wf-phone-page">
      <div className="wf-phone">
        <div className="wf-phone-notch" />
        <div className="wf-phone-statusbar">
          <span>9:41</span>
          <span>●●● 🔋</span>
        </div>
        <div className="wf-phone-appbar">
          <span className="wf-phone-appbar-logo">T</span>
          <div>
            <div className="wf-phone-appbar-title">Timberstone Field</div>
            <div className="wf-phone-appbar-sub">Supervisor App</div>
          </div>
          <Link href="/" className="wf-phone-exit" title="Exit to Role Hub">
            ⇦
          </Link>
        </div>
        <div className="wf-phone-content">{children}</div>
        <nav className="wf-phone-tabbar">
          {TABS.map((tab) => {
            const active = tab.href === "/m" ? pathname === "/m" : pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href} className={`wf-phone-tab${active ? " active" : ""}`}>
                <span className="wf-phone-tab-icon">{tab.icon}</span>
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
