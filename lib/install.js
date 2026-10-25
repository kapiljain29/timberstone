"use client";

// First-run flow for the Supervisor app (/m): detect the phone, offer the
// install, then sign in inside the installed app. The wireframe has no real
// login, so "onboarded" (installed or skipped + signed in) is a localStorage
// flag; every /m screen except /m/install and /m/login sends the user back
// to the install screen until it is set.

import { useSyncExternalStore } from "react";

// iPhone "Add to Home Screen" steps (no install popup on iOS) — shown by
// the install screen and the install bar. icon = MIcon name
// (components/MobileUI.js).
export const IOS_INSTALL_STEPS = [
  { icon: "share", title: "Tap the Share button", sub: "At the bottom of Safari" },
  { icon: "plusSquare", title: "Tap “Add to Home Screen”", sub: "Scroll down the menu to find it" },
  { icon: "check", title: "Tap “Add”", sub: "Top-right corner" },
];

// Manual install steps for browsers without a one-click install (or once
// it was dismissed): { steps: [{ title, sub?, icon? }], note? } for a
// platform + browser (detectPlatform / detectBrowser).
export function installGuide(platform, browser) {
  if (platform === "ios") {
    return {
      steps: IOS_INSTALL_STEPS,
      note: browser === "safari" ? null : "Don't see “Add to Home Screen”? Open this page in Safari.",
    };
  }
  if (platform === "android") {
    if (browser === "samsung") {
      return { steps: [{ title: "Tap the menu ≡", sub: "Bottom-right of the screen" }, { title: "Tap “Add page to”", sub: "Then “Home screen”" }] };
    }
    return {
      steps: [
        { title: "Tap the browser menu ⋮", sub: "Top-right of the screen" },
        { title: "Tap “Install app” or “Add to Home screen”" },
        { title: "Tap “Install”" },
      ],
    };
  }
  if (browser === "firefox") {
    return { steps: [], note: "Firefox can't install web apps — open this page in Chrome, Edge or Safari to install it." };
  }
  if (browser === "safari") {
    return {
      steps: [{ title: "Open the File menu", sub: "In the menu bar at the top" }, { title: "Click “Add to Dock…”", sub: "macOS Sonoma or later" }, { title: "Click “Add”" }],
    };
  }
  if (browser === "edge") {
    return {
      steps: [{ title: "Click “App available” in the address bar", sub: "Or menu … → Apps → Install this site as an app" }, { title: "Click “Install”" }],
    };
  }
  return {
    steps: [
      { title: "Click the install icon at the right end of the address bar", sub: "Or menu ⋮ → Cast, save and share → Install page as app" },
      { title: "Click “Install”" },
    ],
  };
}

// ---------- platform ----------

// "ios" | "android" | "desktop"
export function detectPlatform() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

// "chrome" | "edge" | "safari" | "firefox" | "samsung" | "other"
export function detectBrowser() {
  const ua = navigator.userAgent;
  if (/SamsungBrowser/.test(ua)) return "samsung";
  if (/Firefox|FxiOS/.test(ua)) return "firefox";
  if (/Edg(A|iOS)?\//.test(ua)) return "edge";
  if (/OPR\/|OPiOS/.test(ua)) return "other";
  if (/Chrome|CriOS/.test(ua)) return "chrome";
  if (/Safari/.test(ua)) return "safari";
  return "other";
}

// Chrome/Firefox/Edge on iOS may not offer "Add to Home Screen"; Safari always does.
export function isIosSafari() {
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

// True when running as the installed app (opened from the home-screen icon).
export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function noopSubscribe() {
  return () => {};
}

// Platform string, or null during server render / hydration.
export function usePlatform() {
  return useSyncExternalStore(noopSubscribe, detectPlatform, () => null);
}

// Browser string (detectBrowser), or null during server render / hydration.
export function useBrowser() {
  return useSyncExternalStore(noopSubscribe, detectBrowser, () => null);
}

function subscribeDisplayMode(callback) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function useStandalone() {
  return useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);
}

// ---------- Android install prompt ----------

// Set when the app was installed from this browser (appinstalled), so the
// install bar stops asking here.
const INSTALLED_KEY = "ts_app_installed_v1";

// Chrome fires `beforeinstallprompt` once, often before the install screen
// mounts, so it is captured here at module load and kept until used.
let deferredPrompt = null;
const promptListeners = new Set();

function notifyPrompt() {
  promptListeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notifyPrompt();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    try {
      window.localStorage.setItem(INSTALLED_KEY, "1");
    } catch {
      // Storage blocked — the install bar just shows again next visit.
    }
    notifyPrompt();
  });
}

function subscribePrompt(callback) {
  promptListeners.add(callback);
  return () => promptListeners.delete(callback);
}

function installedHere() {
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

// True once the app was installed from this browser (false while hydrating).
export function useInstalledHere() {
  return useSyncExternalStore(subscribePrompt, installedHere, () => false);
}

// Whether the browser's real install popup is available right now.
export function useCanPromptInstall() {
  return useSyncExternalStore(subscribePrompt, () => !!deferredPrompt, () => false);
}

// Shows the browser's install popup. Resolves "accepted", "dismissed", or
// "unavailable" when the browser has not offered one (desktop preview, iOS,
// already installed).
export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  const prompt = deferredPrompt;
  deferredPrompt = null;
  notifyPrompt();
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  return outcome;
}

// ---------- install bar (components/InstallBar.js) ----------

// "open" | "steps" (showing How to Install) | "closed" (× — kept for this
// tab in sessionStorage). openInstallBar() — the permanent "Install App"
// links (InstallAppLink) — brings it back from anywhere.
const BAR_KEY = "ts_install_bar_closed";
const BAR_EVENT = "ts-install-bar-change";
let barState = null; // null = not read from sessionStorage yet

function getBarState() {
  if (barState === null) {
    try {
      barState = window.sessionStorage.getItem(BAR_KEY) === "1" ? "closed" : "open";
    } catch {
      barState = "open";
    }
  }
  return barState;
}

function setBarState(next) {
  barState = next;
  try {
    if (next === "closed") window.sessionStorage.setItem(BAR_KEY, "1");
    else window.sessionStorage.removeItem(BAR_KEY);
  } catch {
    // Storage blocked — the state just isn't kept across pages.
  }
  window.dispatchEvent(new Event(BAR_EVENT));
}

function subscribeBar(callback) {
  window.addEventListener(BAR_EVENT, callback);
  return () => window.removeEventListener(BAR_EVENT, callback);
}

// The install bar's state, or null while hydrating.
export function useInstallBarState() {
  return useSyncExternalStore(subscribeBar, getBarState, () => null);
}

export function closeInstallBar() {
  setBarState("closed");
}

// Re-opens the bar; withSteps = with How to Install expanded.
export function openInstallBar(withSteps = false) {
  setBarState(withSteps ? "steps" : "open");
}

// ---------- onboarded flag (localStorage + change event) ----------

const KEY = "wf_field_onboarded_v1";
const EVENT = "wf-field-onboarded-change";

function getOnboarded() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setOnboarded(value) {
  try {
    if (value) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage blocked — the user will just see the install screen again.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribeOnboarded(callback) {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// true / false, or null during server render / hydration.
export function useOnboarded() {
  return useSyncExternalStore(subscribeOnboarded, getOnboarded, () => null);
}
