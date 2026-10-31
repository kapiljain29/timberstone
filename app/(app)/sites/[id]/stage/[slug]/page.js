"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Alert } from "@/components/ui";

// Site stage forms (stages 4–12) aren't on the API yet; the site page no
// longer links here. An old link lands on this note instead of the mock
// form. (The Supervisor app's /m/sites screens still use the mock forms.)
export default function StagePage() {
  const { id } = useParams();
  return (
    <div>
      <div className="wf-crumb">
        Site Execution / <Link href="/sites">Sites</Link>
      </div>
      <h1 className="wf-h1">Site Workflow</h1>
      <Alert tone="info">The stage forms aren&apos;t live yet — they will open from the site page once each stage is built.</Alert>
      <Link href={`/sites/${id}`} className="wf-btn primary">
        Back to site
      </Link>
    </div>
  );
}
