"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Badge, ProgressBar } from "@/components/ui";
import Stepper from "@/components/Stepper";
import { getSite, getProgress } from "@/lib/store";
import { STAGES, getStage } from "@/lib/stages";
import { branchName } from "@/lib/data";

export default function SiteOverviewPage() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [progress, setProgress] = useState({ completed: [], current: STAGES[0].slug });

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSite(getSite(id));
    setProgress(getProgress(id));
  }, [id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!site) {
    return <div className="wf-empty">Loading site…</div>;
  }

  const pct = Math.round((progress.completed.length / STAGES.length) * 100);
  const currentStage = getStage(progress.current) || STAGES[STAGES.length - 1];
  const isClosed = progress.completed.length === STAGES.length;

  return (
    <div>
      <div className="wf-crumb">
        <Link href="/sites" className="wf-link-btn">
          Sites
        </Link>{" "}
        / {site.id}
      </div>
      <h1 className="wf-h1">{site.siteName}</h1>
      <p className="wf-sub">
        Customer: {site.customer} · Branch: {branchName(site.branch)} · Value: {site.value} · Created{" "}
        {site.createdAt}
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
            <Badge tone="done">Site Closed</Badge>
          ) : (
            <>
              <Badge tone="current">Current: {currentStage.title}</Badge>{" "}
              <Link href={`/sites/${site.id}/stage/${currentStage.slug}`} className="wf-btn primary" style={{ marginLeft: 10 }}>
                Continue Workflow →
              </Link>
            </>
          )}
        </div>
      </Box>

      <Box title="Full Workflow — click any unlocked stage">
        <Stepper
          siteId={site.id}
          completed={progress.completed}
          current={progress.current}
          basePath={`/sites/${site.id}/stage`}
        />
      </Box>
    </div>
  );
}
