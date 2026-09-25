"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import { getStage, ownsStep } from "@/lib/stages";
import { getProjects, getProgress } from "@/lib/store";

export default function MobileHomePage() {
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

  const withCurrentStage = projects.map((p) => ({
    project: p,
    progress: progressMap[p.id],
    currentStage: progressMap[p.id] ? getStage(progressMap[p.id].current) : null,
  }));

  const needsAction = withCurrentStage.filter(
    (x) => x.currentStage && ownsStep(x.currentStage, "Supervisor")
  );
  const siteReadyPending = withCurrentStage.filter(
    (x) => x.currentStage && x.currentStage.slug === "site-readiness-checklist"
  ).length;

  return (
    <div>
      <div className="wf-mgreeting">
        <h1>Hi, Ramesh 👋</h1>
        <p>Supervisor · Field App · Today, 25 Sep 2026</p>
      </div>

      <div className="wf-mstats">
        <div className="wf-mstat">
          <div className="wf-mstat-num">{projects.length}</div>
          <div className="wf-mstat-label">My Sites</div>
        </div>
        <div className="wf-mstat">
          <div className="wf-mstat-num">{needsAction.length}</div>
          <div className="wf-mstat-label">Need Action</div>
        </div>
        <div className="wf-mstat">
          <div className="wf-mstat-num">{siteReadyPending}</div>
          <div className="wf-mstat-label">Site Checks</div>
        </div>
      </div>

      <div className="wf-crumb" style={{ marginTop: 4 }}>
        Needs your action
      </div>
      {needsAction.length === 0 ? (
        <div className="wf-empty">Nothing pending — all caught up.</div>
      ) : (
        needsAction.map(({ project, currentStage }) => (
          <Link key={project.id} href={`/m/projects/${project.id}/step/${currentStage.slug}`} className="wf-mcard">
            <div className="wf-mcard-title">{project.projectName}</div>
            <div className="wf-mcard-sub">{project.customer}</div>
            <div className="wf-mcard-row">
              <Badge tone="current">
                Step {currentStage.number}: {currentStage.title}
              </Badge>
              <span style={{ color: "var(--idle)" }}>›</span>
            </div>
          </Link>
        ))
      )}

      <div className="wf-crumb" style={{ marginTop: 18 }}>
        All my projects
      </div>
      {withCurrentStage.map(({ project, currentStage }) => (
        <Link key={project.id} href={`/m/projects/${project.id}`} className="wf-mcard">
          <div className="wf-mcard-title">{project.projectName}</div>
          <div className="wf-mcard-sub">
            {project.customer} · {project.value}
          </div>
          <div className="wf-mcard-row">
            <Badge tone={currentStage && ownsStep(currentStage, "Supervisor") ? "current" : "idle"}>
              {currentStage ? currentStage.title : "—"}
            </Badge>
            <span style={{ color: "var(--idle)" }}>›</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
