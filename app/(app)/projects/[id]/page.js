"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Badge, ProgressBar } from "@/components/ui";
import Stepper from "@/components/Stepper";
import { getProject, getProgress } from "@/lib/store";
import { STAGES, getStage } from "@/lib/stages";
import { branchName } from "@/lib/data";

export default function ProjectOverviewPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState({ completed: [], current: STAGES[0].slug });

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setProject(getProject(id));
    setProgress(getProgress(id));
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!project) {
    return <div className="wf-empty">Loading project…</div>;
  }

  const pct = Math.round((progress.completed.length / STAGES.length) * 100);
  const currentStage = getStage(progress.current) || STAGES[STAGES.length - 1];
  const isClosed = progress.completed.length === STAGES.length;

  return (
    <div>
      <div className="wf-crumb">
        <Link href="/projects" className="wf-link-btn">
          Projects
        </Link>{" "}
        / {project.id}
      </div>
      <h1 className="wf-h1">{project.projectName}</h1>
      <p className="wf-sub">
        Customer: {project.customer} · Branch: {branchName(project.branch)} · Value: {project.value} · Created{" "}
        {project.createdAt}
      </p>

      <Box title="Progress">
        <div className="wf-meta-row">
          <span>
            {progress.completed.length} / {STAGES.length} stages complete
          </span>
          <span>{pct}%</span>
        </div>
        <ProgressBar percent={pct} />
        <div style={{ marginTop: 14 }}>
          {isClosed ? (
            <Badge tone="done">Project Closed</Badge>
          ) : (
            <>
              <Badge tone="current">Current: {currentStage.title}</Badge>{" "}
              <Link href={`/projects/${project.id}/stage/${currentStage.slug}`} className="wf-btn primary" style={{ marginLeft: 10 }}>
                Continue Workflow →
              </Link>
            </>
          )}
        </div>
      </Box>

      <Box title="Full Workflow — click any unlocked stage">
        <Stepper
          projectId={project.id}
          completed={progress.completed}
          current={progress.current}
          basePath={`/projects/${project.id}/stage`}
        />
      </Box>
    </div>
  );
}
