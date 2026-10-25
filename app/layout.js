import "./globals.css";
import { Toaster } from "@/components/Toast";
import PwaSetup from "@/components/PwaSetup";
import InstallBar from "@/components/InstallBar";

export const metadata = {
  title: "Timberstone ERP — Clickable Wireframe",
  description:
    "Lead-to-Work Handover ERP wireframe for Timberstone (Next.js, installable as a PWA).",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Timberstone ERP",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#3e5743",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <InstallBar />
        {children}
        <Toaster />
        <PwaSetup />
      </body>
    </html>
  );
}
