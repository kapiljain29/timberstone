"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSite, getProgress } from "@/lib/store";
import { STAGES, getStage, ownsStep } from "@/lib/stages";
import { MIcon, MProgress, MSectionTitle, sitePercent } from "@/components/MobileUI";

export default function MobileSiteDetailPage() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [progress, setProgress] = useState(null);

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSite(getSite(id));
    setProgress(getProgress(id));
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!site || !progress) {
    return <div className="wf-empty">Loading site…</div>;
  }

  const pct = sitePercent(progress);
  const currentStage = getStage(progress.current) || STAGES[STAGES.length - 1];
  const isClosed = progress.completed.length === STAGES.length;

  return (
    <div>
      <Link href="/m/sites" className="wf-mback">
        <MIcon name="back" size={16} /> My Sites
      </Link>

      <div className="wf-mproj-hero">
        <div className="wf-mproj-hero-id">{site.id}</div>
        <h1 className="wf-mproj-hero-title">{site.siteName}</h1>
        <div className="wf-mproj-hero-meta">
          <span>
            <MIcon name="pin" size={13} /> {site.customer}
          </span>
          <span>
            <MIcon name="rupee" size={13} /> {site.value}
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
          <MIcon name="check" /> Site closed
        </div>
      ) : (
        <Link href={`/m/sites/${site.id}/step/${currentStage.slug}`} className="wf-mnext">
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
            <Link key={stage.slug} href={`/m/sites/${id}/step/${stage.slug}`} className={`wf-mtimeline-row ${cls}`}>
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
