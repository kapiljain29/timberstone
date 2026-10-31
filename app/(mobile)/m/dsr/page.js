"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSites, getDsrEntries } from "@/lib/store";
import { MIcon } from "@/components/MobileUI";

const DSR_SLUG = "daily-supervision-report";

export default function MobileDsrQuickPage() {
  const [sites, setSites] = useState(null);
  const [countMap, setCountMap] = useState({});

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const list = getSites();
    setSites(list);
    const map = {};
    list.forEach((p) => {
      map[p.id] = getDsrEntries(p.id).length;
    });
    setCountMap(map);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!sites) {
    return <div className="wf-empty">Loading…</div>;
  }

  return (
    <div>
      <h1 className="wf-mtitle">Daily Supervision Report</h1>
      <p className="wf-msub">Pick a site to submit today&apos;s DSR, one entry per contractor.</p>

      {sites.map((site) => {
        const count = countMap[site.id] || 0;
        return (
          <Link key={site.id} href={`/m/sites/${site.id}/step/${DSR_SLUG}`} className="wf-mdsr">
            <span className={`wf-mdsr-icon${count ? " done" : ""}`}>
              <MIcon name={count ? "check" : "dsr"} />
            </span>
            <span className="wf-mdsr-body">
              <span className="wf-mdsr-title">{site.siteName}</span>
              <span className="wf-mdsr-sub">
                {site.customer} · {count} entr{count === 1 ? "y" : "ies"} logged
              </span>
            </span>
            <span className="wf-mdsr-add">+ Add</span>
          </Link>
        );
      })}
    </div>
  );
}
