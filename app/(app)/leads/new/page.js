"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LeadForm from "@/components/LeadForm";

// New Lead. ?branch=<id> preselects the branch (link from the Leads list's
// branch tab). After saving, the new lead opens; Cancel goes back to the list.
export default function NewLeadPage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading…</div>}>
      <NewLead />
    </Suspense>
  );
}

function NewLead() {
  const router = useRouter();
  const branchId = useSearchParams().get("branch") || "";

  return (
    <div>
      <div className="wf-crumb">
        Pre-Sales / <Link href="/leads">Leads</Link>
      </div>
      <h1 className="wf-h1">New Lead</h1>
      <p className="wf-sub">Step 1 — Lead Creation. A lead enters the system from any of several sources (Marketing / Sales).</p>

      <LeadForm
        defaults={{ branch_id: branchId }}
        onSaved={(lead) => router.push(`/leads/${lead.id}`)}
        onCancel={() => router.push("/leads")}
      />
    </div>
  );
}
