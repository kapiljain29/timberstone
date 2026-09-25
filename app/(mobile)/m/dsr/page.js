"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getProjects, getDsrEntries } from "@/lib/store";

const DSR_SLUG = "daily-supervision-report";

export default function MobileDsrQuickPage() {
  const [projects, setProjects] = useState(null);
  const [countMap, setCountMap] = useState({});

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const list = getProjects();
    setProjects(list);
    const map = {};
    list.forEach((p) => {
      map[p.id] = getDsrEntries(p.id).length;
    });
    setCountMap(map);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!projects) {
    return <div className="wf-empty">Loading…</div>;
  }

  return (
    <div>
      <h1 className="wf-h1">Daily Supervision Report</h1>
      <p className="wf-sub">Pick a site to submit today&apos;s DSR entry per contractor.</p>

      {projects.map((project) => (
        <Link key={project.id} href={`/m/projects/${project.id}/step/${DSR_SLUG}`} className="wf-mcard">
          <div className="wf-mcard-title">{project.projectName}</div>
          <div className="wf-mcard-sub">{project.customer}</div>
          <div className="wf-mcard-row">
            <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
              {countMap[project.id] || 0} DSR entr{(countMap[project.id] || 0) === 1 ? "y" : "ies"} logged
            </span>
            <span className="wf-btn primary" style={{ padding: "6px 12px", fontSize: 11 }}>
              + Add DSR
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
