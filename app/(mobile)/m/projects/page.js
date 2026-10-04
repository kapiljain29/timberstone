"use client";

import { useEffect, useState } from "react";
import { getStage, ownsStep } from "@/lib/stages";
import { getProjects, getProgress } from "@/lib/store";
import { MProjectCard } from "@/components/MobileUI";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "mine", label: "My task" },
  { id: "waiting", label: "Waiting on others" },
];

export default function MobileProjectsPage() {
  const [projects, setProjects] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [filter, setFilter] = useState("all");

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const list = getProjects();
    setProjects(list);
    const map = {};
    list.forEach((p) => {
      map[p.id] = getProgress(p.id);
    });
    setProgressMap(map);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!projects) {
    return <div className="wf-empty">Loading…</div>;
  }

  const rows = projects
    .map((project) => {
      const progress = progressMap[project.id];
      const currentStage = progress ? getStage(progress.current) : null;
      return { project, progress, currentStage, mine: !!currentStage && ownsStep(currentStage, "Supervisor") };
    })
    .filter((r) => filter === "all" || (filter === "mine" ? r.mine : !r.mine));

  return (
    <div>
      <h1 className="wf-mtitle">My Sites</h1>
      <p className="wf-msub">{projects.length} sites assigned to you</p>

      <div className="wf-mchips">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`wf-mchip${filter === f.id ? " active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.map(({ project, progress, currentStage, mine }) => (
        <MProjectCard
          key={project.id}
          project={project}
          progress={progress}
          currentStage={currentStage}
          href={`/m/projects/${project.id}`}
          action={mine}
        />
      ))}
      {rows.length === 0 && <div className="wf-empty">No sites in this filter.</div>}
    </div>
  );
}
