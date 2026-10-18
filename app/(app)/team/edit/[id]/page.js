"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import TeamMemberForm from "@/components/TeamMemberForm";
import { LoadError } from "@/components/ui";
import { TEAM_API, useTeamMaster } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

// Edit Team Member — opened from Edit on the Team Members list. Loads the
// member (POST /api/admin/team/details) so the page also works when opened
// directly or refreshed; after saving or cancelling, back to the list.
export default function EditTeamMemberPage() {
  const router = useRouter();
  const { id } = useParams();
  const member = useApiData(TEAM_API.details, { id });
  const { master, error: masterError, reload: reloadMaster } = useTeamMaster();
  const backToList = () => router.push("/team");

  return (
    <div>
      <div className="wf-crumb">
        Admin / <Link href="/team">Team Members</Link>
      </div>
      <h1 className="wf-h1">Edit Team Member{member.data ? ` — ${member.data.name}` : ""}</h1>
      <p className="wf-sub">Change the member&apos;s details, role, department and branches.</p>

      <LoadError error={member.error} onRetry={member.reload} />
      <LoadError error={masterError} onRetry={reloadMaster} />

      {member.data ? (
        <TeamMemberForm key={member.data.id} member={member.data} master={master} onSaved={backToList} onCancel={backToList} />
      ) : (
        !member.error && <div className="wf-empty">Loading team member…</div>
      )}
    </div>
  );
}
