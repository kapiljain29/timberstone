// Timberstone ERP service worker (registered for the whole site by
// lib/push.js). Makes the app installable and shows push notifications
// sent by the API (timberstone-api services/push.service.js).
//
// It caches nothing: business data (leads, payments, customers) must not
// be left on a lost or shared device. Served with no-cache headers
// (next.config.mjs) so a new version is picked up on the next visit.

const ICON = "/icons/icon-192.png";
const BADGE = "/icons/badge-96.png";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Payload: { title, body, link, type } — link is an app path such as
// /design-requests/<id>.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Timberstone ERP";
  const show = self.registration.showNotification(title, {
    body: data.body || "",
    icon: ICON,
    badge: BADGE,
    tag: data.type || undefined,
    renotify: Boolean(data.type),
    data: { link: data.link || "/notifications" },
  });

  // Open tabs reload their bell right away.
  const tell = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => clients.forEach((c) => c.postMessage({ type: "push-received" })));

  event.waitUntil(Promise.all([show, tell]));
});

// Tapping a notification opens its page — in an open app window if there
// is one, otherwise a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/notifications";
  const url = new URL(link, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        return client.focus().then((c) => (c && "navigate" in c ? c.navigate(url) : self.clients.openWindow(url)));
      }
      return self.clients.openWindow(url);
    })
  );
});
