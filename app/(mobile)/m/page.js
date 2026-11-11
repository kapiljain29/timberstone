"use client";

import Link from "next/link";
import { LoadError } from "@/components/ui";
import { MSiteCard, MSectionTitle, MEmpty } from "@/components/MobileUI";
import { initials } from "@/lib/format";
import { useMyUser } from "@/lib/roles";
import { ALL_BRANCHES, SUPERVISOR_SITE_API } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

const TODAY = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });

function greeting(date) {
  const hour = date.getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

// Supervisor app home: the signed-in supervisor's sites (POST
// /api/mobile/sites/list, every branch they work in) — the ones still
// waiting for their measurement first.
export default function MobileHomePage() {
  const user = useMyUser();
  const list = useApiData(SUPERVISOR_SITE_API.list, { page: 1, limit: 100 }, { branchId: ALL_BRANCHES });
  const sites = list.data?.items || [];
  const toMeasure = sites.filter((s) => !s.latest_measurement);
  const now = new Date();

  return (
    <div>
      <div className="wf-mhero">
        <div className="wf-mhero-top">
          <div>
            <div className="wf-mhero-date">{TODAY.format(now)}</div>
            <h1 className="wf-mhero-title">{`${greeting(now)}${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}</h1>
          </div>
          <span className="wf-mhero-avatar">{initials(user?.name)}</span>
        </div>
        <div className="wf-mhero-stats">
          <div>
            <div className="wf-mhero-num">{list.data ? list.data.pagination.total : "…"}</div>
            <div className="wf-mhero-label">My sites</div>
          </div>
          <div>
            <div className="wf-mhero-num accent">{list.data ? toMeasure.length : "…"}</div>
            <div className="wf-mhero-label">To measure</div>
          </div>
          <div>
            <div className="wf-mhero-num">{list.data ? sites.length - toMeasure.length : "…"}</div>
            <div className="wf-mhero-label">Measured</div>
          </div>
        </div>
      </div>

      <LoadError error={list.error} onRetry={list.reload} />
      {!list.data ? (
        !list.error && <div className="wf-empty">Loading your sites…</div>
      ) : (
        <>
          <MSectionTitle right={<span className="wf-mcount">{toMeasure.length}</span>}>Needs your action</MSectionTitle>
          {toMeasure.length === 0 ? (
            <MEmpty title="All caught up" sub="Every site of yours has its measurement uploaded." />
          ) : (
            toMeasure.map((site) => <MSiteCard key={site.id} site={site} href={`/m/sites/${site.id}/measurement`} />)
          )}

          <MSectionTitle
            right={
              <Link href="/m/sites" className="wf-msection-link">
                See all
              </Link>
            }
          >
            All my sites
          </MSectionTitle>
          {sites.length === 0 ? (
            <MEmpty icon="sites" title="No sites yet" sub="Sites appear here once a manager assigns you as their supervisor." />
          ) : (
            sites.map((site) => <MSiteCard key={site.id} site={site} href={`/m/sites/${site.id}`} />)
          )}
        </>
      )}
    </div>
  );
}
