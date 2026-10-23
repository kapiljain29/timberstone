"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Box, BranchFilter, DataTable, LoadError, StatCard, leadStatusTone } from "@/components/ui";
import { formatDateTime, startOfTodayIso } from "@/lib/format";
import { useBellNotifications } from "@/lib/notifications";
import { DASHBOARD_API, designStatusTone, useBranchTabs } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

// The signed-in user's overview. The API returns one section per module
// their role may see (leads, their own call queue, design requests — null
// otherwise), already limited to their branches and data scope, so the
// screen shows whatever comes back.
export default function DashboardPage() {
  const [branch, setBranch] = useState("all");
  // "Today" counts from midnight on this device.
  const [since] = useState(startOfTodayIso);
  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(branch);
  const summary = useApiData(DASHBOARD_API.summary, { since }, { branchId });
  const notifications = useBellNotifications(true);

  const { leads, call_queue: calls, designs } = summary.data || {};
  // Lead list links keep the selected branch tab.
  const leadsHref = (params = {}) => {
    const query = new URLSearchParams({ ...(branch !== "all" && { branch }), ...params }).toString();
    return query ? `/leads?${query}` : "/leads";
  };

  return (
    <div>
      <div className="wf-crumb">Overview</div>
      <h1 className="wf-h1">Dashboard</h1>
      <p className="wf-sub">Your leads, calls and design requests at a glance, for the branches and records you can see.</p>

      {branchTabs.show && (
        <BranchFilter branches={branchTabs.options} allLabel={branchTabs.allLabel} value={branch} onChange={setBranch} />
      )}

      <LoadError error={summary.error} onRetry={summary.reload} />

      {!summary.data && !summary.error && <div className="wf-empty">Loading…</div>}

      {summary.data && (
        <>
          {(leads || calls || designs) && (
            <div className="wf-cards">
              {leads && (
                <>
                  <StatCard value={leads.total} label="Total leads" href={leadsHref()} />
                  <StatCard value={leads.created_today} label="New leads today" color="var(--green-text)" />
                  {leads.unassigned !== null && (
                    <StatCard
                      value={leads.unassigned}
                      label="Unassigned leads"
                      color="var(--amber-text)"
                      href={leadsHref({ assigned: "unassigned" })}
                    />
                  )}
                </>
              )}
              {calls && (
                <>
                  <StatCard value={calls.due} label="To call now" href="/call-queue" />
                  <StatCard value={calls.calls} label="Calls today" />
                  <StatCard value={calls.connected} label="Connected today" color="var(--green-text)" />
                </>
              )}
              {designs && <StatCard value={designs.open} label="Open design requests" href="/design-requests" />}
            </div>
          )}

          <div className="wf-grid wf-grid-2">
            {leads && (
              <>
                <CountBox
                  title="Leads by Status"
                  rows={leads.by_status.map((s) => ({
                    key: s.id || "none",
                    label: s.name || "No status",
                    count: s.count,
                    href: s.id ? leadsHref({ status: s.id }) : null,
                  }))}
                  emptyLabel="No leads yet."
                />
                <CountBox
                  title="Leads by Source"
                  rows={leads.by_source.map((s) => ({
                    key: s.id || "none",
                    label: s.name || "No source",
                    count: s.count,
                    href: s.id ? leadsHref({ source: s.id }) : null,
                  }))}
                  emptyLabel="No leads yet."
                />
              </>
            )}
            {designs && (
              <CountBox
                title="Design Requests by Status"
                rows={designs.by_status.map((s) => ({
                  key: s.value,
                  label: s.label,
                  count: s.count,
                  href: `/design-requests?status=${s.value}`,
                }))}
              />
            )}
            <Box
              title="Latest Notifications"
              right={
                <Link href="/notifications" className="wf-link-btn">
                  View all
                </Link>
              }
            >
              <LoadError error={notifications.error} onRetry={notifications.reload} />
              {notifications.data?.items.length ? (
                <ul className="wf-list">
                  {notifications.data.items.map((n) => (
                    <li key={n.id}>
                      <span>{n.link ? <Link href={n.link}>{n.title}</Link> : n.title}</span>
                      <span style={{ color: "var(--idle)", whiteSpace: "nowrap" }}>{formatDateTime(n.created_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                !notifications.error && <div className="wf-empty">{notifications.data ? "No notifications yet." : "Loading…"}</div>
              )}
            </Box>
          </div>

          {leads && (
            <Box
              title="Latest Leads"
              right={
                <Link href={leadsHref()} className="wf-link-btn">
                  Go to Leads →
                </Link>
              }
            >
              <DataTable
                columns={["Lead", "Branch", "Source", "Status", "Assigned To", "Created"]}
                emptyLabel="No leads yet."
                busy={summary.stale}
                rows={leads.recent.map((l) => [
                  <Link key={l.id} href={`/leads/${l.id}`} className="wf-link-btn">
                    {l.full_name}
                    {l.company_name ? ` · ${l.company_name}` : ""}
                  </Link>,
                  l.branch_name || "No branch",
                  l.lead_source_name || "—",
                  l.lead_status_name ? (
                    <Badge key={l.id + "s"} tone={leadStatusTone(l.lead_status_name)}>
                      {l.lead_status_name}
                    </Badge>
                  ) : (
                    "—"
                  ),
                  l.assigned_to_names.join(", ") || "Unassigned",
                  formatDateTime(l.created_at),
                ])}
              />
            </Box>
          )}

          {designs && (
            <Box
              title="Latest Design Requests"
              right={
                <Link href="/design-requests" className="wf-link-btn">
                  Go to Design Requests →
                </Link>
              }
            >
              <DataTable
                columns={["Lead", "Branch", "Designer", "Status", "Round", "Last Activity"]}
                emptyLabel="No design requests yet."
                busy={summary.stale}
                rows={designs.recent.map((d) => [
                  <Link key={d.id} href={`/design-requests/${d.id}`} className="wf-link-btn">
                    {d.lead_name || "—"}
                  </Link>,
                  d.branch_name || "No branch",
                  d.designer_name || "—",
                  <Badge key={d.id + "s"} tone={designStatusTone(d.design_status)}>
                    {designs.by_status.find((s) => s.value === d.design_status)?.label || d.design_status}
                  </Badge>,
                  d.round,
                  formatDateTime(d.updated_at),
                ])}
              />
            </Box>
          )}
        </>
      )}
    </div>
  );
}

// A box listing counts, each row linking to the filtered list when it has
// an href.
function CountBox({ title, rows, emptyLabel = "Nothing yet." }) {
  return (
    <Box title={title}>
      {rows.length ? (
        <ul className="wf-list">
          {rows.map((r) => (
            <li key={r.key}>
              <span>{r.href ? <Link href={r.href}>{r.label}</Link> : r.label}</span>
              <Badge tone="idle">{r.count}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <div className="wf-empty">{emptyLabel}</div>
      )}
    </Box>
  );
}
