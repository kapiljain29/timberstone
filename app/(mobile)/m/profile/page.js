"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MIcon, MSectionTitle } from "@/components/MobileUI";
import { initials } from "@/lib/format";
import { signOut, useMyBranches, useMyUser } from "@/lib/roles";

// The steps the Supervisor app handles so far (the others come as they are
// built on the API).
const APP_STEPS = [{ title: "Measurement — site photos & measurement form", icon: "ruler" }];

// The signed-in supervisor (from the session) and Sign out.
export default function MobileProfilePage() {
  const router = useRouter();
  const user = useMyUser();
  const { allBranches, branches } = useMyBranches();

  async function handleSignOut() {
    await signOut();
    router.replace("/m/login");
  }

  if (!user) return <div className="wf-empty">Loading…</div>;

  return (
    <div>
      <div className="wf-mprofile">
        <span className="wf-mprofile-avatar">{initials(user.name)}</span>
        <div className="wf-mprofile-name">{user.name}</div>
        <div className="wf-mprofile-role">{[user.roleName, user.email].filter(Boolean).join(" · ")}</div>
        <div className="wf-mprofile-tags">
          {allBranches ? <span>All branches</span> : branches.map((b) => <span key={b.id}>{b.name}</span>)}
        </div>
      </div>

      <MSectionTitle>In this app</MSectionTitle>
      <div className="wf-mlist">
        {APP_STEPS.map((s) => (
          <div key={s.title} className="wf-mlist-row">
            <span className="wf-mlist-icon">
              <MIcon name={s.icon} size={18} />
            </span>
            <span className="wf-mlist-text">{s.title}</span>
          </div>
        ))}
      </div>

      <Link href="/m/install" className="wf-mexit neutral">
        <MIcon name="download" size={18} /> Replay install flow
      </Link>
      <button type="button" className="wf-mexit" style={{ width: "100%", border: 0, cursor: "pointer" }} onClick={handleSignOut}>
        <MIcon name="exit" size={18} /> Sign out
      </button>
    </div>
  );
}
