export default function manifest() {
  return {
    name: "Timberstone ERP — Lead to Work Handover",
    short_name: "Timberstone ERP",
    description:
      "Centralized ERP workflow for Timberstone: Lead Creation through Work Handover & Project Closure.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ef",
    theme_color: "#3e5743",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
