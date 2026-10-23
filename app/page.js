import { redirect } from "next/navigation";

// The demo role hub is switched off for now — the app opens on sign-in.
export default function HomePage() {
  redirect("/login");
}
