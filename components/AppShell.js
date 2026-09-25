"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NOTIFICATIONS } from "@/lib/data";

const NAV = [
  { group: "Overview", links: [{ href: "/dashboard", label: "Dashboard", icon: "D" }] },
  {
    group: "Pre-Sales",
    links: [{ href: "/leads", label: "Leads", icon: "L" }],
  },
  {
    group: "Project Execution",
    links: [{ href: "/projects", label: "Projects", icon: "P" }],
  },
  {
    group: "Reference",
    links: [
      { href: "/notifications", label: "Notifications", icon: "N" },
      { href: "/roles", label: "Role-wise Workflow", icon: "R" },
    ],
  },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [showBell, setShowBell] = useState(false);

  return (
    <div className="wf-shell">
      <header className="wf-topbar">
        <Link href="/dashboard" className="wf-brand">
          <span className="wf-logo" />
          TIMBERSTONE ERP — Lead to Handover (Wireframe)
        </Link>
        <div className="wf-topbar-right">
          <span className="wf-role-pill">Logged in as: Rahul Sharma · Management</span>
          <Link href="/" className="wf-link-btn">
            Switch Role
          </Link>
          <div style={{ position: "relative" }}>
            <button className="wf-bell" onClick={() => setShowBell((v) => !v)}>
              🔔 {NOTIFICATIONS.length}
            </button>
            {showBell && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "36px",
                  width: 280,
                  background: "#fff",
                  border: "1.5px solid var(--ink)",
                  zIndex: 10,
                  padding: 10,
                }}
              >
                <ul className="wf-list">
                  {NOTIFICATIONS.slice(0, 4).map((n, i) => (
                    <li key={i}>
                      <span>{n.text}</span>
                      <span style={{ color: "var(--idle)", fontSize: 11 }}>{n.when}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/notifications" className="wf-btn ghost" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
                  View all
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="wf-sidebar">
        {NAV.map((section) => (
          <div key={section.group}>
            <div className="wf-nav-group">{section.group}</div>
            {section.links.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={`wf-nav-link ${active ? "active" : ""}`}>
                  <span className="wf-nav-icon" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <main className="wf-main">{children}</main>
    </div>
  );
}
