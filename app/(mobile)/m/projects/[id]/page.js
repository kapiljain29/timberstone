"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProject, getProgress } from "@/lib/store";
import { STAGES, getStage, ownsStep } from "@/lib/stages";
import { MIcon, MProgress, MSectionTitle, projectPercent } from "@/components/MobileUI";

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

  const pct = projectPercent(progress);
  const currentStage = getStage(progress.current) || STAGES[STAGES.length - 1];
  const isClosed = progress.completed.length === STAGES.length;

  return (
    <div>
      <Link href="/m/projects" className="wf-mback">
        <MIcon name="back" size={16} /> My Sites
      </Link>

      <div className="wf-mproj-hero">
        <div className="wf-mproj-hero-id">{project.id}</div>
        <h1 className="wf-mproj-hero-title">{project.projectName}</h1>
        <div className="wf-mproj-hero-meta">
          <span>
            <MIcon name="pin" size={13} /> {project.customer}
          </span>
          <span>
            <MIcon name="rupee" size={13} /> {project.value}
          </span>
        </div>
        <div className="wf-mproj-hero-progress">
          <MProgress percent={pct} />
          <span>{pct}%</span>
        </div>
        <div className="wf-mproj-hero-steps">
          {progress.completed.length} of {STAGES.length} steps complete
        </div>
      </div>

      {isClosed ? (
        <div className="wf-mnext done">
          <MIcon name="check" /> Project closed
        </div>
      ) : (
        <Link href={`/m/projects/${project.id}/step/${currentStage.slug}`} className="wf-mnext">
          <span className="wf-mnext-label">
            Up next · Step {currentStage.number}
            <strong>{currentStage.title}</strong>
          </span>
          <span className="wf-mnext-go">
            <MIcon name="chevron" size={18} />
          </span>
        </Link>
      )}

      <MSectionTitle>All steps</MSectionTitle>
      <div className="wf-mtimeline">
        {STAGES.map((stage) => {
          const isDone = progress.completed.includes(stage.slug);
          const isCurrent = stage.slug === progress.current;
          const unlocked = isDone || isCurrent;
          const mine = ownsStep(stage, "Supervisor");
          const cls = isDone ? "done" : isCurrent ? "current" : "locked";
          const row = (
            <>
              <span className="wf-mtimeline-dot">{isDone ? <MIcon name="check" size={14} /> : stage.number}</span>
              <span className="wf-mtimeline-body">
                <span className="wf-mtimeline-title">{stage.title}</span>
                <span className="wf-mtimeline-meta">
                  {mine ? <span className="wf-mtag">Your task</span> : `Owned by ${stage.role}`}
                </span>
              </span>
              {unlocked && (
                <span className="wf-mtimeline-chev">
                  <MIcon name="chevron" size={16} />
                </span>
              )}
            </>
          );
          return unlocked ? (
            <Link key={stage.slug} href={`/m/projects/${id}/step/${stage.slug}`} className={`wf-mtimeline-row ${cls}`}>
              {row}
            </Link>
          ) : (
            <div key={stage.slug} className={`wf-mtimeline-row ${cls}`} title="Complete previous steps first">
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
}
