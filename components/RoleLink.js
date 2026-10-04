"use client";

import Link from "next/link";
import { setRoleId } from "@/lib/roles";

// A Link that "logs in" as a role before navigating (Role Hub cards).
export default function RoleLink({ roleId, ...props }) {
  return <Link {...props} onClick={() => setRoleId(roleId)} />;
}
