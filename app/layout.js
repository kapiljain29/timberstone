import "./globals.css";

export const metadata = {
  title: "Timberstone ERP — Clickable Wireframe",
  description:
    "Lead-to-Work Handover ERP wireframe for Timberstone (Next.js, installable as a PWA).",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Timberstone ERP",
  },
};

export const viewport = {
  themeColor: "#3e5743",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
