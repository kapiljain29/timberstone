"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TeamMemberForm from "@/components/TeamMemberForm";
import { LoadError } from "@/components/ui";
import { useTeamMaster } from "@/lib/team";

// Add Team Member. ?department=<id> preselects the department (link from
// the Departments page or a filtered Team Members list); after saving or
// cancelling, the list opens with that same department filter.
export default function NewTeamMemberPage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading…</div>}>
      <NewTeamMember />
    </Suspense>
  );
}

function NewTeamMember() {
  const router = useRouter();
  const departmentId = useSearchParams().get("department") || "";
  const { master, error, reload } = useTeamMaster();
  const listHref = departmentId ? `/team?department=${encodeURIComponent(departmentId)}` : "/team";

  return (
    <div>
      <div className="wf-crumb">
        Admin / <Link href={listHref}>Team Members</Link>
      </div>
      <h1 className="wf-h1">Add Team Member</h1>
      <p className="wf-sub">Create a sign-in account and set the member&apos;s role, department and branches.</p>

      <LoadError error={error} onRetry={reload} />

      <TeamMemberForm
        defaults={{ department_id: departmentId }}
        master={master}
        onSaved={() => router.push(listHref)}
        onCancel={() => router.push(listHref)}
      />
    </div>
  );
}
