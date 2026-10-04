"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NOTIFICATIONS } from "@/lib/data";

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.5" />
      <rect x="3" y="15" width="7.5" height="6" rx="1.5" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" />
      <circle cx="17" cy="7.5" r="2.25" />
      <path d="M15.5 12.3c2.6.3 4.5 2.4 4.5 5.4" />
    </svg>
  ),
  callQueue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h3.2l1.6 4-2 1.3a10.5 10.5 0 0 0 5 5l1.3-2 4 1.6V17a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  ),
  projects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h4.2l1.6 2h9.2a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13.5 6 9.5Z" />
      <path d="M10.2 19a1.9 1.9 0 0 0 3.6 0" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="7.5" height="6" rx="1.5" />
      <rect x="13.5" y="14" width="7.5" height="6" rx="1.5" />
      <path d="M12 10v2M6.75 14v-2h10.5v2" />
    </svg>
  ),
  architects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 20M12 3l8 17M7.5 13h9" />
      <circle cx="12" cy="3.5" r="1" />
    </svg>
  ),
  roles: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="12" cy="18" r="2.5" />
      <path d="M8.2 7.4 10.5 16M15.8 7.4 13.5 16M8.4 6h7.2" />
    </svg>
  ),
};

const NAV = [
  {
    group: "Overview",
    links: [{ href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard }],
  },
  {
    group: "Pre-Sales",
    links: [
      { href: "/call-queue", label: "Call Queue", icon: ICONS.callQueue },
      { href: "/leads", label: "Leads", icon: ICONS.leads },
    ],
  },
  {
    group: "Project Execution",
    links: [{ href: "/projects", label: "Projects", icon: ICONS.projects }],
  },
  {
    group: "Admin",
    links: [
      { href: "/team", label: "Team & Departments", icon: ICONS.team },
      { href: "/architects", label: "Architects", icon: ICONS.architects },
    ],
  },
  {
    group: "Reference",
    links: [
      { href: "/notifications", label: "Notifications", icon: ICONS.notifications, badge: NOTIFICATIONS.length },
      { href: "/roles", label: "Role-wise Workflow", icon: ICONS.roles },
    ],
  },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [showBell, setShowBell] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="wf-shell">
      {sidebarOpen && (
        <div className="wf-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <nav className={`wf-sidebar${collapsed ? " collapsed" : ""}${sidebarOpen ? " open" : ""}`}>
        <button
          type="button"
          className="wf-sidebar-collapse"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>

        <div className="wf-sidebar-brand">
          <span className="wf-logo">T</span>
          {!collapsed && (
            <div className="wf-sidebar-brand-text">
              <p className="wf-sidebar-brand-title">Timberstone ERP</p>
              <p className="wf-sidebar-brand-sub">Lead to Handover</p>
            </div>
          )}
          <button
            type="button"
            className="wf-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="wf-sidebar-nav">
          {NAV.map((section) => (
            <div className="wf-sidebar-group" key={section.group}>
              {!collapsed && <p className="wf-sidebar-group-label">{section.group}</p>}
              {section.links.map((link) => {
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`wf-sidebar-link${active ? " active" : ""}${collapsed ? " collapsed" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                    title={collapsed ? link.label : undefined}
                  >
                    <span className="wf-sidebar-link-icon">{link.icon}</span>
                    {!collapsed && <span className="wf-sidebar-link-label">{link.label}</span>}
                    {!collapsed && !!link.badge && (
                      <span className="wf-sidebar-link-badge">{link.badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="wf-sidebar-footer">
          <div className="wf-sidebar-user">
            <span className="wf-sidebar-avatar">RS</span>
            {!collapsed && (
              <div className="wf-sidebar-user-info">
                <p className="wf-sidebar-user-name">Rahul Sharma</p>
                <p className="wf-sidebar-user-role">Management</p>
              </div>
            )}
            {!collapsed && (
              <Link href="/" className="wf-sidebar-switch" title="Switch role">
                ⇦
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="wf-shell-body">
        <header className="wf-topbar">
          <button
            type="button"
            className="wf-topbar-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="wf-topbar-right">
            <span className="wf-role-pill">Rahul Sharma · Management</span>
            <Link href="/" className="wf-link-btn">
              Switch Role
            </Link>
            <div style={{ position: "relative" }}>
              <button className="wf-bell" onClick={() => setShowBell((v) => !v)}>
                🔔 {NOTIFICATIONS.length}
              </button>
              {showBell && (
                <div className="wf-bell-dropdown">
                  <ul className="wf-list">
                    {NOTIFICATIONS.slice(0, 4).map((n, i) => (
                      <li key={i}>
                        <span>{n.text}</span>
                        <span style={{ color: "var(--idle)", fontSize: 11 }}>{n.when}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/notifications"
                    className="wf-btn ghost"
                    style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                    onClick={() => setShowBell(false)}
                  >
                    View all
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="wf-main">{children}</main>
      </div>
    </div>
  );
}
