"use client";

// First-run flow for the Supervisor app (/m): detect the phone, offer the
// install, then sign in inside the installed app. The wireframe has no real
// login, so "onboarded" (installed or skipped + signed in) is a localStorage
// flag; every /m screen except /m/install and /m/login sends the user back
// to the install screen until it is set.

import { useSyncExternalStore } from "react";

// iPhone "Add to Home Screen" steps (no install popup on iOS) — shown by
// the install screen and the web panel's notification prompt. icon = MIcon
// name (components/MobileUI.js).
export const IOS_INSTALL_STEPS = [
  { icon: "share", title: "Tap the Share button", sub: "At the bottom of Safari" },
  { icon: "plusSquare", title: "Tap “Add to Home Screen”", sub: "Scroll down the menu to find it" },
  { icon: "check", title: "Tap “Add”", sub: "Top-right corner" },
];

// ---------- platform ----------

// "ios" | "android" | "desktop"
export function detectPlatform() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for touch.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
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

function subscribeDisplayMode(callback) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function useStandalone() {
  return useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);
}

// ---------- Android install prompt ----------

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
    notifyPrompt();
  });
}

function subscribePrompt(callback) {
  promptListeners.add(callback);
  return () => promptListeners.delete(callback);
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
