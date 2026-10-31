"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStage, ownsStep } from "@/lib/stages";
import { getSites, getProgress } from "@/lib/store";
import { MIcon, MSiteCard, MSectionTitle, MEmpty } from "@/components/MobileUI";

const DSR_SLUG = "daily-supervision-report";
const SITE_CHECK_SLUG = "site-readiness-checklist";

export default function MobileHomePage() {
  const [sites, setSites] = useState(null);
  const [progressMap, setProgressMap] = useState({});

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const list = getSites();
    setSites(list);
    const map = {};
    list.forEach((p) => {
      map[p.id] = getProgress(p.id);
    });
    setProgressMap(map);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!sites) {
    return <div className="wf-empty">Loading…</div>;
  }

  const withCurrentStage = sites.map((p) => ({
    site: p,
    progress: progressMap[p.id],
    currentStage: progressMap[p.id] ? getStage(progressMap[p.id].current) : null,
  }));

  const needsAction = withCurrentStage.filter(
    (x) => x.currentStage && ownsStep(x.currentStage, "Supervisor")
  );
  const siteReadyPending = withCurrentStage.filter(
    (x) => x.currentStage && x.currentStage.slug === SITE_CHECK_SLUG
  ).length;
  const firstDsr = withCurrentStage.find((x) => x.currentStage?.slug === DSR_SLUG) || withCurrentStage[0];
  const firstCheck = withCurrentStage.find((x) => x.currentStage?.slug === SITE_CHECK_SLUG) || withCurrentStage[0];

  return (
    <div>
      <div className="wf-mhero">
        <div className="wf-mhero-top">
          <div>
            <div className="wf-mhero-date">Thursday, 25 Sep 2026</div>
            <h1 className="wf-mhero-title">Good morning, Ramesh</h1>
          </div>
          <span className="wf-mhero-avatar">RK</span>
        </div>
        <div className="wf-mhero-stats">
          <div>
            <div className="wf-mhero-num">{sites.length}</div>
            <div className="wf-mhero-label">My sites</div>
          </div>
          <div>
            <div className="wf-mhero-num accent">{needsAction.length}</div>
            <div className="wf-mhero-label">Need action</div>
          </div>
          <div>
            <div className="wf-mhero-num">{siteReadyPending}</div>
            <div className="wf-mhero-label">Site checks</div>
          </div>
        </div>
      </div>

      {firstDsr && (
        <div className="wf-mquick">
          <Link href={`/m/sites/${firstDsr.site.id}/step/${DSR_SLUG}`} className="wf-mquick-btn">
            <span className="wf-mquick-icon green">
              <MIcon name="dsr" />
            </span>
            <span>Add DSR</span>
          </Link>
          <Link href={`/m/sites/${firstCheck.site.id}/step/${SITE_CHECK_SLUG}`} className="wf-mquick-btn">
            <span className="wf-mquick-icon amber">
              <MIcon name="checklist" />
            </span>
            <span>Site Check</span>
          </Link>
          <Link href="/m/sites" className="wf-mquick-btn">
            <span className="wf-mquick-icon blue">
              <MIcon name="ruler" />
            </span>
            <span>Measure</span>
          </Link>
        </div>
      )}

      <MSectionTitle right={<span className="wf-mcount">{needsAction.length}</span>}>Needs your action</MSectionTitle>
      {needsAction.length === 0 ? (
        <MEmpty title="All caught up" sub="Nothing is waiting on you right now." />
      ) : (
        needsAction.map(({ site, progress, currentStage }) => (
          <MSiteCard
            key={site.id}
            site={site}
            progress={progress}
            currentStage={currentStage}
            href={`/m/sites/${site.id}/step/${currentStage.slug}`}
            action
          />
        ))
      )}

      <MSectionTitle
        right={
          <Link href="/m/sites" className="wf-msection-link">
            See all
          </Link>
        }
      >
        All my sites
      </MSectionTitle>
      {withCurrentStage.map(({ site, progress, currentStage }) => (
        <MSiteCard
          key={site.id}
          site={site}
          progress={progress}
          currentStage={currentStage}
          href={`/m/sites/${site.id}`}
          action={!!currentStage && ownsStep(currentStage, "Supervisor")}
        />
      ))}
    </div>
  );
}
