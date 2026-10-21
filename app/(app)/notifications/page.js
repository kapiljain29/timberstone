"use client";

import Link from "next/link";
import { useState } from "react";
import { Box, BranchFilter, LoadError, Pagination } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { NOTIFICATION_API, notificationsChanged } from "@/lib/notifications";
import { useApiData, useSubmit } from "@/lib/useApi";

const PAGE_SIZE = 20;
const TABS = [{ id: "unread", name: "Unread" }];

// The signed-in user's notifications (POST /api/admin/notifications/list).
// Opening one marks it read; "Mark all read" clears the bell.
export default function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const list = useApiData(NOTIFICATION_API.list, { page, limit: PAGE_SIZE, unread_only: tab === "unread" });
  const markRead = useSubmit({ fieldErrorsInToast: true });
  const items = list.data?.items || [];
  const unread = list.data?.unread || 0;

  function changeTab(value) {
    setTab(value);
    setPage(1);
  }

  async function mark(ids) {
    const done = await markRead.post(NOTIFICATION_API.markRead, ids ? { ids } : {}, { notify: !ids });
    if (done) {
      list.reload();
      notificationsChanged();
    }
  }

  return (
    <div>
      <div className="wf-crumb">Reference</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Notifications</h1>
          <p className="wf-sub">Updates sent to you — e.g. a design request assigned to you, or a design ready for your review.</p>
        </div>
        <button type="button" className="wf-btn" style={{ marginBottom: 18 }} onClick={() => mark(null)} disabled={!unread || markRead.submitting}>
          Mark All Read
        </button>
      </div>

      <BranchFilter branches={TABS} value={tab} onChange={changeTab} allLabel="All" />

      <Box title={`${tab === "unread" ? "Unread" : "All"} Notifications (${list.data ? list.data.pagination.total : "…"})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data ? (
          !list.error && <div className="wf-empty">Loading notifications…</div>
        ) : !items.length ? (
          <div className="wf-empty">{tab === "unread" ? "You're all caught up." : "No notifications yet."}</div>
        ) : (
          <ul className="wf-list">
            {items.map((n) => (
              <li key={n.id}>
                <span>
                  {n.link ? (
                    <Link href={n.link} onClick={() => !n.read && mark([n.id])}>
                      {n.read ? n.title : <strong>{n.title}</strong>}
                    </Link>
                  ) : n.read ? (
                    n.title
                  ) : (
                    <strong>{n.title}</strong>
                  )}
                  {n.body && <span className="wf-sub" style={{ display: "block", whiteSpace: "pre-line" }}>{n.body}</span>}
                </span>
                <span style={{ textAlign: "right" }}>
                  <span style={{ color: "var(--idle)", fontSize: 11, display: "block" }}>{formatDateTime(n.created_at)}</span>
                  {!n.read && (
                    <button type="button" className="wf-link-btn" onClick={() => mark([n.id])} disabled={markRead.submitting}>
                      Mark read
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
    </div>
  );
}
