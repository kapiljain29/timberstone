"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Badge, DataTable, ProgressBar } from "@/components/ui";
import { getProjects, getProgress } from "@/lib/store";
import { STAGES } from "@/lib/stages";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Reads from localStorage, which is unavailable during SSR — must load post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjects(getProjects());
  }, []);

  return (
    <div>
      <div className="wf-crumb">Project Execution</div>
      <h1 className="wf-h1">Projects</h1>
      <p className="wf-sub">
        Steps 4–12: Product, Design &amp; Sample Selection through Final Measurement &amp; Closure.
        Open a project to view its clickable stage-by-stage stepper.
      </p>

      <Box title={`All Projects (${projects.length})`}>
        <DataTable
          columns={["Project", "Customer", "Value", "Current Stage", "Progress", ""]}
          rows={projects.map((p) => {
            const { completed } = getProgress(p.id);
            const pct = Math.round((completed.length / STAGES.length) * 100);
            const stage = STAGES.find((s) => s.slug === p.currentStageSlug);
            return [
              p.id,
              p.customer,
              p.value,
              stage ? (
                <Badge key={p.id + "s"} tone="pending">
                  {stage.number}. {stage.title}
                </Badge>
              ) : (
                <Badge key={p.id + "s"} tone="done">
                  Closed
                </Badge>
              ),
              <div key={p.id + "p"} style={{ width: 140 }}>
                <ProgressBar percent={pct} />
                <div style={{ fontSize: 10, color: "var(--idle)", marginTop: 3 }}>{pct}% complete</div>
              </div>,
              <Link key={p.id + "v"} href={`/projects/${p.id}`} className="wf-link-btn">
                Open →
              </Link>,
            ];
          })}
        />
      </Box>
    </div>
  );
}
