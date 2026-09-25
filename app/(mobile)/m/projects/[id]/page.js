"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, ProgressBar, Box } from "@/components/ui";
import { getProject, getProgress } from "@/lib/store";
import { STAGES, getStage, ownsStep } from "@/lib/stages";

export default function MobileProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState(null);

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setProject(getProject(id));
    setProgress(getProgress(id));
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!project || !progress) {
    return <div className="wf-empty">Loading project…</div>;
  }

  const pct = Math.round((progress.completed.length / STAGES.length) * 100);
  const currentStage = getStage(progress.current) || STAGES[STAGES.length - 1];
  const isClosed = progress.completed.length === STAGES.length;

  return (
    <div>
      <div className="wf-crumb">
        <Link href="/m/projects" className="wf-link-btn">
          My Projects
        </Link>{" "}
        / {project.id}
      </div>
      <h1 className="wf-h1">{project.projectName}</h1>
      <p className="wf-sub">
        {project.customer} · {project.value}
      </p>

      <Box title="Progress">
        <div className="wf-meta-row">
          <span>
            {progress.completed.length} / {STAGES.length} steps complete
          </span>
          <span>{pct}%</span>
        </div>
        <ProgressBar percent={pct} />
        <div style={{ marginTop: 12 }}>
          {isClosed ? (
            <Badge tone="done">Project Closed</Badge>
          ) : (
            <>
              <Badge tone="current">Current: {currentStage.title}</Badge>
              <Link
                href={`/m/projects/${project.id}/step/${currentStage.slug}`}
                className="wf-btn primary"
                style={{ marginTop: 10 }}
              >
                Continue →
              </Link>
            </>
          )}
        </div>
      </Box>

      <div className="wf-crumb">Full step list</div>
      <div className="wf-mobile-steplist">
        {STAGES.map((stage) => {
          const isDone = progress.completed.includes(stage.slug);
          const isCurrent = stage.slug === progress.current;
          const unlocked = isDone || isCurrent;
          const mine = ownsStep(stage, "Supervisor");
          const cls = isDone ? "done" : isCurrent ? "current" : "locked";
          const row = (
            <>
              <span className="wf-mobile-step-num">{isDone ? "✓" : stage.number}</span>
              <span className="wf-mobile-step-body">
                <span className="wf-mobile-step-title">{stage.title}</span>
                <span className="wf-mobile-step-meta">{mine ? "Your task" : `Owned by ${stage.role}`}</span>
              </span>
              <span className="wf-mobile-step-chevron">›</span>
            </>
          );
          return unlocked ? (
            <Link key={stage.slug} href={`/m/projects/${id}/step/${stage.slug}`} className={`wf-mobile-step-row ${cls}`}>
              {row}
            </Link>
          ) : (
            <div key={stage.slug} className={`wf-mobile-step-row ${cls}`} title="Complete previous steps first">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}
