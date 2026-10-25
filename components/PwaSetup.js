"use client";

import { useEffect, useRef } from "react";
import { getSession } from "@/lib/api";
import { registerServiceWorker, stopPushForDevice, syncPush } from "@/lib/push";
// Loaded on every page so it catches the browser's one-time install offer
// (beforeinstallprompt) for the install bar's Install App button.
import "@/lib/install";
import { useMyUserId } from "@/lib/roles";

// Mounted once in app/layout.js: registers the service worker (installable
// app + push) on every page, and keeps this device's push subscription in
// step with who is signed in — re-sent for the signed-in user, dropped
// when nobody is (e.g. the session expired).
export default function PwaSetup() {
  const userId = useMyUserId();
  const lastUser = useRef(undefined);

  useEffect(() => {
    // Read the session itself: during hydration the hook still says null.
    const current = getSession()?.user?.id ?? null;
    if (current === lastUser.current) return;
    lastUser.current = current;
    registerServiceWorker().then(() => (current ? syncPush() : stopPushForDevice()));
  }, [userId]);

  return null;
}
