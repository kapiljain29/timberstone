"use client";

import Link from "next/link";
import { PHASES, STAGES } from "@/lib/stages";

export default function Stepper({ projectId, completed, current, basePath }) {
  return (
    <div>
      {PHASES.map((phase) => {
        const stages = STAGES.filter((s) => s.phase === phase.key);
        return (
          <div key={phase.key}>
            <div className="wf-phase-label">{phase.label}</div>
            <div className="wf-stepper">
              {stages.map((stage) => {
                const isDone = completed.includes(stage.slug);
                const isCurrent = stage.slug === current;
                const unlocked = isDone || isCurrent;
                const cls = isDone ? "done" : isCurrent ? "current" : "locked";
                const content = (
                  <>
                    <span className="n">{isDone ? "✓" : stage.number}</span>
                    {stage.title}
                  </>
                );
                return unlocked ? (
                  <Link key={stage.slug} href={`${basePath}/${stage.slug}`} className={`wf-step ${cls}`}>
                    {content}
                  </Link>
                ) : (
                  <span key={stage.slug} className={`wf-step ${cls}`} title="Complete previous stages first">
                    {content}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
