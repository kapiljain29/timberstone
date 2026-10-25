"use client";

import { usePathname } from "next/navigation";
import { MIcon } from "@/components/MobileUI";
import {
  closeInstallBar,
  installGuide,
  openInstallBar,
  promptInstall,
  useBrowser,
  useCanPromptInstall,
  useInstallBarState,
  useInstalledHere,
  usePlatform,
  useStandalone,
} from "@/lib/install";

// "Install the app" bar across the top of every page (app/layout.js), on
// the sign-in pages and the panel alike, so installing is never hidden:
//   - one-click "Install App" where the browser offers it (Chrome / Edge),
//   - otherwise "How to Install" with the steps for this phone / browser
//     (iPhone, Samsung Internet, Mac Safari, …).
// Not shown inside the installed app, after installing from this browser,
// or on the Supervisor screens (/m — their own install flow). × hides it
// for this tab; InstallAppLink (sidebar, sign-in page) brings it back.

// True where installing still makes sense: not in the installed app and
// not already installed from this browser (null while hydrating).
function useNeedsInstall() {
  const platform = usePlatform();
  const standalone = useStandalone();
  const installedHere = useInstalledHere();
  if (!platform) return null;
  return !standalone && !installedHere;
}

export default function InstallBar() {
  const pathname = usePathname();
  const platform = usePlatform();
  const browser = useBrowser();
  const needsInstall = useNeedsInstall();
  const canInstall = useCanPromptInstall();
  const state = useInstallBarState();

  const supervisorApp = pathname === "/m" || pathname.startsWith("/m/");
  if (!needsInstall || !state || state === "closed" || supervisorApp) return null;

  const guide = installGuide(platform, browser);
  const showSteps = state === "steps" && !canInstall;

  return (
    <div className="wf-install-bar" role="region" aria-label="Install the app">
      <div className="wf-install-bar-row">
        <span className="wf-install-bar-icon">
          <MIcon name="download" size={18} />
        </span>
        <p className="wf-install-bar-text">
          <b>Install the Timberstone ERP app</b>{" "}
          <span>
            {platform === "ios"
              ? "Add it to your Home Screen to open it like an app and get notifications."
              : "Open it like an app from your home screen or desktop, with notifications."}
          </span>
        </p>
        <div className="wf-install-bar-actions">
          {canInstall ? (
            <button type="button" className="wf-btn primary" onClick={() => promptInstall()}>
              Install App
            </button>
          ) : (
            <button type="button" className="wf-btn" onClick={() => openInstallBar(!showSteps)} aria-expanded={showSteps}>
              {showSteps ? "Hide Steps" : "How to Install"}
            </button>
          )}
          <button
            type="button"
            className="wf-install-bar-close"
            onClick={closeInstallBar}
            aria-label="Hide (Install App in the menu brings it back)"
            title="Hide (Install App in the menu brings it back)"
          >
            ×
          </button>
        </div>
      </div>
      {showSteps && (
        <div className="wf-install-bar-steps">
          {guide.steps.length > 0 && (
            <ol>
              {guide.steps.map((step) => (
                <li key={step.title}>
                  {step.icon && <MIcon name={step.icon} size={16} />} {step.title}
                  {step.sub && <span> — {step.sub}</span>}
                </li>
              ))}
            </ol>
          )}
          {guide.note && <p>{guide.note}</p>}
          <p>Already installed? Open Timberstone ERP from your home screen or apps.</p>
        </div>
      )}
    </div>
  );
}

// Permanent "Install App" link (sidebar footer, sign-in page), so the app
// can always be installed even after the bar was closed: the browser's
// install popup where there is one, otherwise the bar again with its
// steps open. Hidden once installed. `label` = false shows only the icon
// (collapsed sidebar).
export function InstallAppLink({ className, label = true, onClick }) {
  const needsInstall = useNeedsInstall();
  const canInstall = useCanPromptInstall();
  if (!needsInstall) return null;

  function handleClick() {
    onClick?.();
    if (canInstall) {
      promptInstall();
      return;
    }
    openInstallBar(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button type="button" className={className} onClick={handleClick} title="Install App" aria-label="Install App">
      <MIcon name="download" size={16} />
      {label && <span>Install App</span>}
    </button>
  );
}
