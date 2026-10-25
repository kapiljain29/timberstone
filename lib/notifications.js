"use client";

// The signed-in user's notifications (POST /api/admin/notifications/*):
// the bell in AppShell and the Notifications page share this, so marking
// one read on the page updates the bell at once.

import { useEffect, useRef } from "react";
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

  // Chime when a new unread notification arrives — not for the ones
  // already there when the page loaded.
  const seen = useRef(null);
  const items = list.data?.items;
  useEffect(() => {
    if (!items) return;
    const fresh = seen.current && items.some((n) => !n.read && !seen.current.has(n.id));
    seen.current = new Set([...(seen.current || []), ...items.map((n) => n.id)]);
    if (fresh) playChime();
  }, [items]);

  return list;
}

let audio;
let lastChimeAt = 0;

function audioContext() {
  audio ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  return audio;
}

// Browsers (Safari above all) only allow sound once the page has been
// clicked or typed on — open the audio then, so a later chime can play.
if (typeof window !== "undefined") {
  const unlock = () => {
    try {
      audioContext();
    } catch {
      // No audio support.
    }
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

/**
 * A short two-note chime (Web Audio, no sound file) for a new notification
 * — a push arriving or the bell finding a new unread one. Played at most
 * once in 2 s, as a push also reloads the bell.
 */
export function playChime() {
  if (Date.now() - lastChimeAt < 2000) return;
  lastChimeAt = Date.now();
  try {
    const ctx = audioContext();
    const start = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const at = start + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.2, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.4);
    });
  } catch {
    // No audio support — the bell badge still updates.
  }
}
