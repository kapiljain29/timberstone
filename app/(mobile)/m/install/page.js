"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MIcon } from "@/components/MobileUI";
import { IOS_INSTALL_STEPS, isIosSafari, promptInstall, useCanPromptInstall, usePlatform, useStandalone } from "@/lib/install";

const PERKS = [
  { icon: "home", title: "Opens like an app", sub: "One tap from your home screen, full screen" },
  { icon: "bolt", title: "Fast on site", sub: "Loads quickly even on weak signal" },
  { icon: "bell", title: "Task alerts", sub: "Know when a site needs you" },
];

export default function MobileInstallPage() {
  const router = useRouter();
  const platform = usePlatform();
  const standalone = useStandalone();
  const canPrompt = useCanPromptInstall();

  const [choice, setChoice] = useState(null); // tab picked by the viewer
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mockPrompt, setMockPrompt] = useState(false);

  // Already opened from the home-screen icon — nothing to install, go sign in.
  useEffect(() => {
    if (standalone) router.replace("/m/login");
  }, [standalone, router]);

  if (!platform || standalone) {
    return <div className="wf-empty">Loading…</div>;
  }

  const tab = choice || (platform === "ios" ? "ios" : "android");

  async function handleAndroidInstall() {
    if (!canPrompt) {
      // No real popup here (desktop preview / no service worker yet) —
      // show a mock of Chrome's install sheet instead.
      setMockPrompt(true);
      return;
    }
    setBusy(true);
    const outcome = await promptInstall();
    setBusy(false);
    if (outcome === "accepted") setDone(true);
  }

  return (
    <div className="wf-minstall">
      <div className="wf-minstall-hero">
        <span className="wf-minstall-logo">T</span>
        <h1 className="wf-minstall-title">Timberstone Field</h1>
        <p className="wf-minstall-sub">Supervisor app for site work</p>
      </div>

      <div className="wf-minstall-body">
        {done ? (
          <div className="wf-minstall-done">
            <span className="wf-minstall-done-icon">
              <MIcon name="check" size={26} />
            </span>
            <h2 className="wf-minstall-h2">App installed</h2>
            <p className="wf-minstall-text">
              Close this browser and open <b>Timberstone Field</b> from your home screen.
            </p>
            <div className="wf-minstall-homeicon">
              <span className="wf-minstall-homeicon-tile">T</span>
              <span>Timberstone Field</span>
            </div>
            {tab === "ios" && (
              <p className="wf-minstall-note">
                iPhone keeps the app separate from Safari, so you will sign in once inside the app.
              </p>
            )}
            <Link href="/m/login" className="wf-btn primary">
              Open the app
            </Link>
            <p className="wf-minstall-hint">Demo: on a real phone the supervisor taps the home-screen icon.</p>
          </div>
        ) : (
          <>
            <h2 className="wf-minstall-h2">Install the app on your phone</h2>
            <div className="wf-minstall-perks">
              {PERKS.map((p) => (
                <div key={p.title} className="wf-minstall-perk">
                  <span className="wf-minstall-perk-icon">
                    <MIcon name={p.icon} size={18} />
                  </span>
                  <span>
                    <span className="wf-minstall-perk-title">{p.title}</span>
                    <span className="wf-minstall-perk-sub">{p.sub}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="wf-mseg" role="tablist" aria-label="Phone type">
              {[
                ["android", "Android"],
                ["ios", "iPhone"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={`wf-mseg-btn${tab === id ? " active" : ""}`}
                  onClick={() => setChoice(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {platform === "desktop" && (
              <p className="wf-minstall-hint">Desktop preview — switch tabs to see each phone&apos;s flow.</p>
            )}

            {tab === "android" ? (
              <div className="wf-minstall-panel">
                <button type="button" className="wf-btn primary wf-minstall-cta" onClick={handleAndroidInstall} disabled={busy}>
                  <MIcon name="download" size={18} /> {busy ? "Installing…" : "Install App"}
                </button>
                <p className="wf-minstall-hint">Takes a few seconds · No Play Store needed</p>
                <p className="wf-minstall-note">
                  If no popup appears, tap the <b>⋮</b> menu in Chrome and choose <b>Install app</b>.
                </p>
              </div>
            ) : (
              <div className="wf-minstall-panel">
                {platform === "ios" && !isIosSafari() && (
                  <p className="wf-minstall-warn">
                    <MIcon name="alert" size={16} /> Open this link in <b>Safari</b> to install.
                  </p>
                )}
                <ol className="wf-minstall-steps">
                  {IOS_INSTALL_STEPS.map((s, i) => (
                    <li key={s.title} className="wf-minstall-step">
                      <span className="wf-minstall-step-n">{i + 1}</span>
                      <span className="wf-minstall-step-text">
                        <span className="wf-minstall-perk-title">{s.title}</span>
                        <span className="wf-minstall-perk-sub">{s.sub}</span>
                      </span>
                      <span className="wf-minstall-step-icon">
                        <MIcon name={s.icon} size={20} />
                      </span>
                    </li>
                  ))}
                </ol>
                <button type="button" className="wf-btn primary wf-minstall-cta" onClick={() => setDone(true)}>
                  I&apos;ve added it
                </button>
              </div>
            )}

            <Link href="/m/login" className="wf-minstall-skip">
              Not now, continue in browser
            </Link>
          </>
        )}
      </div>

      {mockPrompt && (
        <div className="wf-msheet-backdrop" onClick={() => setMockPrompt(false)}>
          <div className="wf-msheet" role="dialog" aria-label="Install app" onClick={(e) => e.stopPropagation()}>
            <div className="wf-msheet-title">Install app?</div>
            <div className="wf-msheet-app">
              <span className="wf-minstall-homeicon-tile small">T</span>
              <span>
                <span className="wf-minstall-perk-title">Timberstone Field</span>
                <span className="wf-minstall-perk-sub">erp.timberstone.in</span>
              </span>
            </div>
            <div className="wf-msheet-actions">
              <button type="button" className="wf-msheet-btn" onClick={() => setMockPrompt(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="wf-msheet-btn primary"
                onClick={() => {
                  setMockPrompt(false);
                  setDone(true);
                }}
              >
                Install
              </button>
            </div>
            <div className="wf-msheet-caption">Mock of Chrome&apos;s install popup (wireframe)</div>
          </div>
        </div>
      )}
    </div>
  );
}
