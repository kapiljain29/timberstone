// Web app manifest: the whole site (web panel for every role) installs as
// one app, "Timberstone ERP". "/" opens sign-in, which sends a signed-in
// user straight to their home page. Icons: public/icons (maskable = full
// bleed, for Android's shaped icons). Push notifications: lib/push.js.
export default function manifest() {
  return {
    id: "/",
    name: "Timberstone ERP",
    short_name: "Timberstone",
    description: "Timberstone ERP — leads, projects, approvals and site work, from lead to handover.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f4ef",
    theme_color: "#3e5743",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
