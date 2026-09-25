"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import { getStage, ownsStep } from "@/lib/stages";
import { getProjects, getProgress } from "@/lib/store";

export default function MobileProjectsPage() {
  const [projects, setProjects] = useState(null);
  const [progressMap, setProgressMap] = useState({});

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

  return (
    <div>
      <h1 className="wf-h1">My Projects</h1>
      <p className="wf-sub">{projects.length} sites assigned to you</p>

      {projects.map((project) => {
        const progress = progressMap[project.id];
        const currentStage = progress ? getStage(progress.current) : null;
        return (
          <Link key={project.id} href={`/m/projects/${project.id}`} className="wf-mcard">
            <div className="wf-mcard-title">{project.projectName}</div>
            <div className="wf-mcard-sub">
              {project.customer} · {project.value}
            </div>
            <div className="wf-mcard-row">
              <Badge tone={currentStage && ownsStep(currentStage, "Supervisor") ? "current" : "idle"}>
                {currentStage ? `Step ${currentStage.number}: ${currentStage.title}` : "—"}
              </Badge>
              <span style={{ color: "var(--idle)" }}>›</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
