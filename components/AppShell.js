"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { NOTIFICATIONS } from "@/lib/data";
import { api, refreshProfile } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { NOTIFICATION_API, notificationsChanged, useBellNotifications } from "@/lib/notifications";
import { WEB_ROLES, canAccess, setRoleId, signOut, useRole, useRoleId } from "@/lib/roles";

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const ICONS = {
  design: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
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
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M17 6l3 3M15 8l2 2" />
    </svg>
  ),
  branches: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
  members: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" />
    </svg>
  ),
  architects: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 20M12 3l8 17M7.5 13h9" />
      <circle cx="12" cy="3.5" r="1" />
    </svg>
  ),
  categories: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.3 6.3a1.5 1.5 0 0 1-2.1 0Z" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  ),
  leadSources: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h18l-7 8.5V19l-4 1.5v-8L3 4Z" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
    </svg>
  ),
  colors: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16a5 5 0 0 0 5-5c0-4-4-7.2-9-7.2Z" />
      <circle cx="7.5" cy="11" r="1.2" />
      <circle cx="10.5" cy="7" r="1.2" />
      <circle cx="15.5" cy="7.5" r="1.2" />
    </svg>
  ),
  leadStatuses: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M7 12h3M14 12h3" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
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
      { href: "/design-requests", label: "Design Requests", icon: ICONS.design },
    ],
  },
  {
    group: "Project Execution",
    links: [{ href: "/projects", label: "Projects", icon: ICONS.projects }],
  },
  {
    group: "Admin",
    links: [
      { href: "/branches", label: "Branches", icon: ICONS.branches },
      { href: "/departments", label: "Departments", icon: ICONS.team },
      { href: "/team", label: "Team Members", icon: ICONS.members },
      { href: "/role-master", label: "Roles & Permissions", icon: ICONS.shield },
      { href: "/architects", label: "Architects", icon: ICONS.architects },
      { href: "/settings", label: "Site Settings", icon: ICONS.settings },
    ],
  },
  {
    group: "Masters",
    links: [
      { href: "/categories", label: "Categories", icon: ICONS.categories },
      { href: "/lead-sources", label: "Lead Sources", icon: ICONS.leadSources },
      { href: "/lead-statuses", label: "Lead Statuses", icon: ICONS.leadStatuses },
      { href: "/colors", label: "Colors", icon: ICONS.colors },
      { href: "/products", label: "Products", icon: ICONS.products },
    ],
  },
  {
    group: "Reference",
    links: [
      { href: "/notifications", label: "Notifications", icon: ICONS.notifications },
    ],
  },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const roleId = useRoleId();
  const role = useRole();
  const [showBell, setShowBell] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Only the menus this role may open; empty groups are dropped.
  const nav = role
    ? NAV.map((section) => ({ ...section, links: section.links.filter((l) => canAccess(role.id, l.href)) })).filter(
        (section) => section.links.length > 0
      )
    : [];
  const allowed = role ? canAccess(role.id, pathname) : false;

  // Signed-in API user: pick up role / permission / branch changes made
  // since sign-in (menus and buttons follow the refreshed permissions).
  const fromApi = Boolean(role?.fromApi);
  useEffect(() => {
    if (fromApi) refreshProfile().catch(() => {});
  }, [fromApi]);

  // The bell: the signed-in user's notifications from the API (demo roles
  // without a session keep the wireframe's sample list).
  const bell = useBellNotifications(fromApi);
  const unread = fromApi ? bell.data?.unread || 0 : NOTIFICATIONS.length;

  // Opening a notification from the bell marks it read.
  function openNotification(n) {
    setShowBell(false);
    if (!n.read) api.post(NOTIFICATION_API.markRead, { ids: [n.id] }).then(notificationsChanged, () => {});
  }

  // Signed out — send to the login page, then back here after sign-in.
  useEffect(() => {
    if (roleId === "") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [roleId, pathname, router]);

  function handleSignOut() {
    signOut();
    router.replace("/login");
  }

  function switchRole(id) {
    setRoleId(id);
    const next = WEB_ROLES.find((r) => r.id === id);
    router.push(next.home);
  }

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
          {nav.map((section) => (
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
                    {!collapsed && link.href === "/notifications" && unread > 0 && (
                      <span className="wf-sidebar-link-badge">{unread}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="wf-sidebar-footer">
          <div className="wf-sidebar-user">
            <span className="wf-sidebar-avatar">{role ? initials(role.user) : ""}</span>
            {!collapsed && role && (
              <div className="wf-sidebar-user-info">
                <p className="wf-sidebar-user-name">{role.user}</p>
                <p className="wf-sidebar-user-role">{role.label}</p>
              </div>
            )}
            {!collapsed && role?.fromApi && (
              <Link
                href="/account/change-password"
                className="wf-sidebar-switch"
                title="Change password"
                aria-label="Change password"
                onClick={() => setSidebarOpen(false)}
              >
                {ICONS.key}
              </Link>
            )}
            {!collapsed && (
              <button type="button" className="wf-sidebar-switch" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
                ⇦
              </button>
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
            {role?.fromApi && (
              <span className="wf-role-switch">
                <span>Logged in as</span>
                <b>
                  {role.user} · {role.label}
                </b>
              </span>
            )}
            {role && !role.fromApi && (
              <label className="wf-role-switch">
                <span>Logged in as</span>
                <select value={role.id} onChange={(e) => switchRole(e.target.value)} aria-label="Switch role">
                  {WEB_ROLES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.user} · {r.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div style={{ position: "relative" }}>
              <button className="wf-bell" onClick={() => setShowBell((v) => !v)}>
                🔔 {unread}
              </button>
              {showBell && (
                <div className="wf-bell-dropdown">
                  <ul className="wf-list">
                    {fromApi
                      ? (bell.data?.items || []).map((n) => (
                          <li key={n.id}>
                            {n.link ? (
                              <Link href={n.link} onClick={() => openNotification(n)}>
                                {n.read ? n.title : <strong>{n.title}</strong>}
                              </Link>
                            ) : (
                              <span>{n.read ? n.title : <strong>{n.title}</strong>}</span>
                            )}
                            <span style={{ color: "var(--idle)", fontSize: 11 }}>{formatDateTime(n.created_at)}</span>
                          </li>
                        ))
                      : NOTIFICATIONS.slice(0, 4).map((n, i) => (
                          <li key={i}>
                            <span>{n.text}</span>
                            <span style={{ color: "var(--idle)", fontSize: 11 }}>{n.when}</span>
                          </li>
                        ))}
                    {fromApi && bell.data && !bell.data.items.length && <li>No notifications yet.</li>}
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

        <main className="wf-main">
          {!role ? null : allowed ? (
            children
          ) : (
            <div className="wf-noaccess">
              <div className="wf-noaccess-icon">🔒</div>
              <h1 className="wf-h1" style={{ justifyContent: "center" }}>
                No access for {role.label}
              </h1>
              <p className="wf-sub">
                This page isn&apos;t part of the {role.label} role. Switch role from the top bar, or go
                back to your home page.
              </p>
              <Link href={role.home} className="wf-btn primary">
                Go to my home →
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
