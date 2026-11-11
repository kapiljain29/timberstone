"use client";

import { useState } from "react";
import { LoadError } from "@/components/ui";
import { MSiteCard } from "@/components/MobileUI";
import { ALL_BRANCHES, SUPERVISOR_SITE_API } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "To measure" },
  { id: "measured", label: "Measured" },
];

// The signed-in supervisor's sites (POST /api/mobile/sites/list, every
// branch they work in), filtered by whether the measurement is uploaded.
export default function MobileSitesPage() {
  const [filter, setFilter] = useState("all");
  const list = useApiData(SUPERVISOR_SITE_API.list, { page: 1, limit: 100 }, { branchId: ALL_BRANCHES });
  const sites = list.data?.items || [];
  const rows = sites.filter((s) => filter === "all" || (filter === "pending" ? !s.latest_measurement : !!s.latest_measurement));

  return (
    <div>
      <h1 className="wf-mtitle">My Sites</h1>
      <p className="wf-msub">{list.data ? `${list.data.pagination.total} sites assigned to you` : "Loading…"}</p>

      <div className="wf-mchips">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className={`wf-mchip${filter === f.id ? " active" : ""}`} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <LoadError error={list.error} onRetry={list.reload} />
      {list.data &&
        rows.map((site) => (
          <MSiteCard key={site.id} site={site} href={!site.latest_measurement ? `/m/sites/${site.id}/measurement` : `/m/sites/${site.id}`} />
        ))}
      {list.data && rows.length === 0 && (
        <div className="wf-empty">{sites.length ? "No sites in this filter." : "No sites yet — they appear once a manager assigns you as a supervisor."}</div>
      )}
    </div>
  );
}
