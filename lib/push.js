"use client";

// Push notifications and the service worker (public/sw.js) — the one place
// the browser side of push lives. The whole site is one installable app;
// every signed-in role can turn notifications on for the device they use.
//
//   registerServiceWorker() — once per page load (PwaSetup, app/layout.js).
//   enablePush()            — from a click ("Turn on notifications"): asks
//                             the browser's permission, then subscribes.
//   syncPush()              — on every load / sign-in when permission is
//                             already granted: re-sends this device's
//                             subscription for the signed-in user.
//   stopPushForDevice()     — before sign-out (signOut in lib/roles.js).
//
// The API keeps one subscription per device (endpoint) and pushes every
// notify() to it (timberstone-api services/push.service.js). iPhone only
// supports push in the installed app (Add to Home Screen, iOS 16.4+).

import { useSyncExternalStore } from "react";
import { api, getSession } from "./api";
import { notificationsChanged } from "./notifications";

export const PUSH_API = {
  config: "/api/admin/notifications/push/config",
  subscribe: "/api/admin/notifications/push/subscribe",
  unsubscribe: "/api/admin/notifications/push/unsubscribe",
};

// Sign-out waits at most this long for the unsubscribe call.
const UNSUBSCRIBE_TIMEOUT_MS = 4000;

export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

// ---------- service worker ----------

let registering = null;

// Registers /sw.js for the whole site (once). Resolves the registration,
// or null where service workers aren't available.
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  if (!registering) {
    // A push arriving while the app is open reloads the bell.
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "push-received") notificationsChanged();
    });
    registering = navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((err) => {
      console.warn("[push] service worker not registered:", err.message);
      return null;
    });
  }
  return registering;
}

async function currentSubscription() {
  const registration = await registerServiceWorker();
  return registration ? registration.pushManager.getSubscription() : null;
}

// ---------- permission (for the "Turn on notifications" prompt) ----------

const PERMISSION_EVENT = "ts-push-permission-change";

function permissionSnapshot() {
  return isPushSupported() ? Notification.permission : "unsupported";
}

function subscribePermission(callback) {
  window.addEventListener(PERMISSION_EVENT, callback);
  return () => window.removeEventListener(PERMISSION_EVENT, callback);
}

// "default" | "granted" | "denied" | "unsupported", or null while hydrating.
export function usePushPermission() {
  return useSyncExternalStore(subscribePermission, permissionSnapshot, () => null);
}

// ---------- subscribe / unsubscribe ----------

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function sameKey(buffer, key) {
  if (!buffer) return false;
  const a = new Uint8Array(buffer);
  return a.length === key.length && a.every((byte, i) => byte === key[i]);
}

// Subscribes this browser with the API's VAPID key (replacing a
// subscription made with an old key) and saves it for the signed-in user.
async function subscribeDevice(publicKey) {
  const registration = await registerServiceWorker();
  if (!registration) throw new Error("Service worker unavailable");
  await navigator.serviceWorker.ready;

  const key = urlBase64ToUint8Array(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameKey(subscription.options.applicationServerKey, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  await api.post(PUSH_API.subscribe, subscription.toJSON());
}

/**
 * Asks for permission (call it from a click) and turns push on for this
 * device. Resolves "granted", "denied", "default" (closed the prompt) or
 * "off" (push is turned off in Site Settings). API errors reject.
 */
export async function enablePush() {
  const config = await api.post(PUSH_API.config);
  if (!config.enabled) return "off";
  const permission = await Notification.requestPermission();
  window.dispatchEvent(new Event(PERMISSION_EVENT));
  if (permission !== "granted") return permission;
  await subscribeDevice(config.public_key);
  return "granted";
}

/**
 * Re-sends this device's subscription for the signed-in user when they
 * already allowed notifications — it may be new, use a new key, or this
 * device may have been used by someone else. Silent; never rejects.
 */
export async function syncPush() {
  if (!isPushSupported() || Notification.permission !== "granted" || !getSession()?.accessToken) return;
  try {
    const config = await api.post(PUSH_API.config);
    if (config.enabled) await subscribeDevice(config.public_key);
  } catch (err) {
    console.warn("[push] sync failed:", err.message);
  }
}

/**
 * Stops push to this device: tells the API (while the session still
 * exists, so call it before logout) and drops the browser's
 * subscription. Never rejects; gives up on the API after a few seconds.
 */
export async function stopPushForDevice() {
  if (!isPushSupported()) return;
  try {
    const subscription = await currentSubscription();
    if (!subscription) return;
    if (getSession()?.accessToken) {
      const call = api.post(PUSH_API.unsubscribe, { endpoint: subscription.endpoint }).catch(() => {});
      await Promise.race([call, new Promise((resolve) => setTimeout(resolve, UNSUBSCRIBE_TIMEOUT_MS))]);
    }
    await subscription.unsubscribe();
  } catch (err) {
    console.warn("[push] unsubscribe failed:", err.message);
  }
}
