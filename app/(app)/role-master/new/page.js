"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import RoleForm from "@/components/RoleForm";

// Add Role — opened from + Add Role on the Roles & Permissions list; after
// saving or cancelling, back to the list.
export default function NewRolePage() {
  const router = useRouter();
  const backToList = () => router.push("/role-master");

  return (
    <div>
      <div className="wf-crumb">
        Admin / <Link href="/role-master">Roles &amp; Permissions</Link>
      </div>
      <h1 className="wf-h1">Add Role</h1>
      <p className="wf-sub">Name the role, choose whose records its members see, and tick what they can do.</p>

      <RoleForm onSaved={backToList} onCancel={backToList} />
    </div>
  );
}
