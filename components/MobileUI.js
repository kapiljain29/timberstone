// Presentational building blocks for the Supervisor mobile app (/m).
// No hooks, so they work from both server and client components.

import Link from "next/link";
import { STAGES } from "@/lib/stages";

const PATHS = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-5v6h-4A1.5 1.5 0 0 1 4 19v-8.5Z" />,
  projects: <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h4.2l1.6 2h9.2a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" />,
  dsr: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 3.5h6v2.5H9zM8.5 11h7M8.5 15h4.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13.5 6 9.5Z" />
      <path d="M10.2 19a1.9 1.9 0 0 0 3.6 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.75" />
      <path d="M4.5 20c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  checklist: (
    <>
      <path d="m4 6.5 1.5 1.5L8 5.5M4 12.5 5.5 14 8 11.5M4 18.5 5.5 20 8 17.5" />
      <path d="M11 7h9M11 13h9M11 19h9" />
    </>
  ),
  ruler: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="1.5" />
      <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" />
      <circle cx="7" cy="17.5" r="1.75" />
      <circle cx="17" cy="17.5" r="1.75" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </>
  ),
  chevron: <path d="m9 5.5 6.5 6.5L9 18.5" />,
  back: <path d="M15 5.5 8.5 12l6.5 6.5" />,
  exit: <path d="M14 4.5h4.5A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h10" />,
  alert: (
    <>
      <path d="M12 4 2.8 19.5h18.4L12 4Z" />
      <path d="M12 10v4M12 17v.01" />
    </>
  ),
  rupee: <path d="M7 5h10M7 9h10M7 5h3.5a4 4 0 0 1 0 8H7l7 6.5" />,
};

export function MIcon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function MSectionTitle({ children, right }) {
  return (
    <div className="wf-msection">
      <span>{children}</span>
      {right}
    </div>
  );
}

export function MProgress({ percent }) {
  return (
    <div className="wf-mprogress">
      <div className="wf-mprogress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function projectPercent(progress) {
  if (!progress) return 0;
  return Math.round((progress.completed.length / STAGES.length) * 100);
}

// Site card used on Home and My Projects: name, customer, current step
// chip, and a progress bar. `action` highlights steps the supervisor owns.
export function MProjectCard({ project, progress, currentStage, href, action = false }) {
  const pct = projectPercent(progress);
  const done = progress ? progress.completed.length : 0;
  return (
    <Link href={href} className={`wf-mproj${action ? " action" : ""}`}>
      <div className="wf-mproj-top">
        <div className="wf-mproj-text">
          <div className="wf-mproj-title">{project.projectName}</div>
          <div className="wf-mproj-sub">
            <MIcon name="pin" size={12} /> {project.customer}
          </div>
        </div>
        <span className="wf-mproj-chev">
          <MIcon name="chevron" size={16} />
        </span>
      </div>
      {currentStage && (
        <div className={`wf-mproj-step${action ? " action" : ""}`}>
          <span className="wf-mproj-step-n">{currentStage.number}</span>
          <span className="wf-mproj-step-t">{currentStage.title}</span>
          {action && <span className="wf-mproj-step-tag">Your task</span>}
        </div>
      )}
      <div className="wf-mproj-foot">
        <MProgress percent={pct} />
        <span className="wf-mproj-pct">
          {done}/{STAGES.length}
        </span>
      </div>
    </Link>
  );
}

export function MEmpty({ icon = "check", title, sub }) {
  return (
    <div className="wf-mempty">
      <span className="wf-mempty-icon">
        <MIcon name={icon} size={22} />
      </span>
      <div className="wf-mempty-title">{title}</div>
      {sub && <div className="wf-mempty-sub">{sub}</div>}
    </div>
  );
}
