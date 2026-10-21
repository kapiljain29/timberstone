"use client";

// The signed-in user's notifications (POST /api/admin/notifications/*):
// the bell in AppShell and the Notifications page share this, so marking
// one read on the page updates the bell at once.

import { useEffect } from "react";
import { useApiData } from "./useApi";

export const NOTIFICATION_API = {
  list: "/api/admin/notifications/list",
  unreadCount: "/api/admin/notifications/unread-count",
  markRead: "/api/admin/notifications/mark-read",
};

const CHANGED = "wf-notifications-change";
// How often the bell checks for new notifications.
const POLL_MS = 60 * 1000;

// Call after marking notifications read, so every bell / list reloads.
export function notificationsChanged() {
  window.dispatchEvent(new Event(CHANGED));
}

/**
 * The latest notifications for the bell: { data: { items, unread,
 * pagination }, … } from /notifications/list. Reloads every minute and
 * after notificationsChanged(). Pass enabled = false (no API session) to
 * skip it.
 */
export function useBellNotifications(enabled) {
  const list = useApiData(enabled ? NOTIFICATION_API.list : null, { page: 1, limit: 5 });
  const { reload } = list;

  useEffect(() => {
    if (!enabled) return undefined;
    const timer = setInterval(reload, POLL_MS);
    window.addEventListener(CHANGED, reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener(CHANGED, reload);
    };
  }, [enabled, reload]);

  return list;
}
