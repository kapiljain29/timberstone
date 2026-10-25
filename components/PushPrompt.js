"use client";

import { useState } from "react";
import { toast } from "@/components/Toast";
import { MIcon } from "@/components/MobileUI";
import { IOS_INSTALL_STEPS, promptInstall, useCanPromptInstall, usePlatform, useStandalone } from "@/lib/install";
import { PUSH_API, enablePush, usePushPermission } from "@/lib/push";
import { useApiData } from "@/lib/useApi";

// Web panel banner (AppShell, signed-in API users) that gets this device
// onto push notifications:
//   - iPhone in Safari: push only works in the installed app, so it shows
//     the Add to Home Screen steps;
//   - everywhere else, while the browser hasn't been asked yet: a "Turn on
//     notifications" button (the permission prompt must come from a click).
// Hidden when push is off in Site Settings, once answered, or for two
// weeks after "Not now" (kept per browser).

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
  const [showSteps, setShowSteps] = useState(false);

  if (hidden || !config.data?.enabled || !permission || !platform) return null;

  const iosBrowser = platform === "ios" && !standalone;
  const askPermission = !iosBrowser && permission === "default";
  if (!iosBrowser && !askPermission) return null;

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
        {iosBrowser ? (
          <>
            <b>Get notifications on your iPhone</b>
            <span>Install Timberstone ERP on your home screen, open it from there, then turn notifications on.</span>
            {showSteps && (
              <ol className="wf-push-prompt-steps">
                {IOS_INSTALL_STEPS.map((s) => (
                  <li key={s.title}>
                    <MIcon name={s.icon} size={16} /> {s.title} <span>— {s.sub}</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        ) : (
          <>
            <b>Turn on notifications</b>
            <span>Get alerts on this device for leads assigned to you, approvals and design requests.</span>
          </>
        )}
      </div>
      <div className="wf-push-prompt-actions">
        <button type="button" className="wf-btn ghost" onClick={dismiss} disabled={busy}>
          Not now
        </button>
        {iosBrowser ? (
          !showSteps && (
            <button type="button" className="wf-btn primary" onClick={() => setShowSteps(true)}>
              How to Install
            </button>
          )
        ) : (
          <button type="button" className="wf-btn primary" onClick={handleEnable} disabled={busy}>
            {busy ? "Turning On…" : "Turn On Notifications"}
          </button>
        )}
      </div>
    </div>
  );
}

// Top-bar "Install App" button — only where the browser offers to install
// (Chrome / Edge on Android and desktop) and the app isn't installed yet.
export function InstallAppButton() {
  const canInstall = useCanPromptInstall();
  const standalone = useStandalone();
  if (!canInstall || standalone) return null;
  return (
    <button type="button" className="wf-btn ghost wf-install-btn" onClick={() => promptInstall()}>
      <MIcon name="download" size={16} /> Install App
    </button>
  );
}
