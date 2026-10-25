"use client";

import { useState } from "react";
import { toast } from "@/components/Toast";
import { MIcon } from "@/components/MobileUI";
import { usePlatform, useStandalone } from "@/lib/install";
import { PUSH_API, enablePush, usePushPermission } from "@/lib/push";
import { useApiData } from "@/lib/useApi";

// Web panel banner (AppShell, signed-in API users): "Turn on
// notifications" while this browser hasn't been asked yet — the permission
// prompt must come from a click. Not shown on iPhone outside the installed
// app (push only works there; the install bar, components/InstallBar.js,
// covers that), when push is off in Site Settings, once answered, or for
// two weeks after "Not now" (kept per browser).

const DISMISS_KEY = "ts_push_prompt_dismissed_at";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return Boolean(at) && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function rememberDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Storage blocked — the banner just comes back next visit.
  }
}

export default function PushPrompt() {
  const config = useApiData(PUSH_API.config, {});
  const permission = usePushPermission();
  const platform = usePlatform();
  const standalone = useStandalone();
  const [hidden, setHidden] = useState(() => typeof window !== "undefined" && dismissedRecently());
  const [busy, setBusy] = useState(false);

  if (hidden || !config.data?.enabled || !permission || !platform) return null;
  if (permission !== "default" || (platform === "ios" && !standalone)) return null;

  function dismiss() {
    rememberDismissed();
    setHidden(true);
  }

  async function handleEnable() {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result === "granted") toast.success("Notifications are on for this device.");
      else if (result === "denied") toast.error("Notifications are blocked. Allow them for this site in your browser settings.");
      else if (result === "off") toast.error("Push notifications are turned off in Site Settings.");
    } catch (err) {
      toast.error(err?.message || "Couldn't turn on notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wf-push-prompt" role="region" aria-label="Notifications">
      <span className="wf-push-prompt-icon">
        <MIcon name="bell" size={20} />
      </span>
      <div className="wf-push-prompt-body">
        <b>Turn on notifications</b>
        <span>Get alerts on this device for leads assigned to you, approvals and design requests.</span>
      </div>
      <div className="wf-push-prompt-actions">
        <button type="button" className="wf-btn ghost" onClick={dismiss} disabled={busy}>
          Not now
        </button>
        <button type="button" className="wf-btn primary" onClick={handleEnable} disabled={busy}>
          {busy ? "Turning On…" : "Turn On Notifications"}
        </button>
      </div>
    </div>
  );
}
