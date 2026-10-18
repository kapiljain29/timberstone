"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import RoleForm from "@/components/RoleForm";
import { Alert, LoadError } from "@/components/ui";
import { ROLE_API } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

// Edit Role — opened from Edit on the Roles & Permissions list. Loads the
// role (POST /api/admin/roles/details) so the page also works when opened
// directly or refreshed; after saving or cancelling, back to the list. The
// Super Admin role always has full access and can't be edited.
export default function EditRolePage() {
  const router = useRouter();
  const { id } = useParams();
  const role = useApiData(ROLE_API.details, { id });
  const backToList = () => router.push("/role-master");

  return (
    <div>
      <div className="wf-crumb">
        Admin / <Link href="/role-master">Roles &amp; Permissions</Link>
      </div>
      <h1 className="wf-h1">Edit Role{role.data ? ` — ${role.data.role_name}` : ""}</h1>
      <p className="wf-sub">Changes apply to the role&apos;s team members right away.</p>

      <LoadError error={role.error} onRetry={role.reload} />

      {role.data ? (
        role.data.full_access ? (
          <Alert tone="info">
            The Super Admin role always has full access to every module and branch, so it can&apos;t be edited.{" "}
            <Link href="/role-master">Back to Roles &amp; Permissions</Link>
          </Alert>
        ) : (
          <RoleForm key={role.data.id} role={role.data} onSaved={backToList} onCancel={backToList} />
        )
      ) : (
        !role.error && <div className="wf-empty">Loading role…</div>
      )}
    </div>
  );
}
