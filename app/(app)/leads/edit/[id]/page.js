"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import LeadForm from "@/components/LeadForm";
import { LoadError } from "@/components/ui";
import { ALL_BRANCHES, LEAD_API } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

// Edit Lead — opened from Edit on the lead detail page. Loads the lead
// (POST /api/admin/leads/details, across all the user's branches) so the
// page also works when opened directly or refreshed; after saving or
// cancelling, back to the lead.
export default function EditLeadPage() {
  const router = useRouter();
  const { id } = useParams();
  const lead = useApiData(LEAD_API.details, { id }, { branchId: ALL_BRANCHES });
  const backToLead = () => router.push(`/leads/${id}`);

  return (
    <div>
      <div className="wf-crumb">
        Pre-Sales / <Link href="/leads">Leads</Link>
      </div>
      <h1 className="wf-h1">Edit Lead{lead.data ? ` — ${lead.data.full_name}` : ""}</h1>
      <p className="wf-sub">Change the lead&apos;s contact, source and requirement. Status and assignees change on the lead page.</p>

      <LoadError error={lead.error} onRetry={lead.reload} />

      {lead.data ? (
        <LeadForm key={lead.data.id} lead={lead.data} onSaved={backToLead} onCancel={backToLead} />
      ) : (
        !lead.error && <div className="wf-empty">Loading lead…</div>
      )}
    </div>
  );
}
