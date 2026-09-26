"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Box, Badge, BranchFilter, DataTable, leadStatusTone } from "@/components/ui";
import { getLeads, getProjects } from "@/lib/store";
import { NOTIFICATIONS, BRANCHES, branchName } from "@/lib/data";
import { PHASES, STAGES } from "@/lib/stages";

export default function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);
  const [branch, setBranch] = useState("all");

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLeads(getLeads());
    setProjects(getProjects());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const scopedLeads = useMemo(
    () => (branch === "all" ? leads : leads.filter((l) => l.branch === branch)),
    [leads, branch]
  );
  const scopedProjects = useMemo(
    () => (branch === "all" ? projects : projects.filter((p) => p.branch === branch)),
    [projects, branch]
  );

  const activeProjects = scopedProjects.length;
  const openLeads = scopedLeads.filter((l) => !l.convertedProjectId).length;
  const pendingApprovals = 5;
  const dsrDue = 1;

  const stageCounts = useMemo(() => {
    return PHASES.map((phase) => ({
      phase: phase.label,
      count: scopedProjects.filter((p) => {
        const stage = STAGES.find((s) => s.slug === p.currentStageSlug);
        return stage?.phase === phase.key;
      }).length,
    }));
  }, [scopedProjects]);

  return (
    <div>
      <div className="wf-crumb">Overview</div>
      <h1 className="wf-h1">Management Dashboard</h1>
      <p className="wf-sub">
        Section 10 of the proposal — lead pipeline, project stages, pending approvals and
        at-risk projects at a glance.
      </p>

      <BranchFilter branches={BRANCHES} value={branch} onChange={setBranch} />

      <div className="wf-cards">
        <div className="wf-card">
          <div className="num">{openLeads}</div>
          <div className="label">Open Leads</div>
        </div>
        <div className="wf-card">
          <div className="num">{activeProjects}</div>
          <div className="label">Active Projects</div>
        </div>
        <div className="wf-card">
          <div className="num">{pendingApprovals}</div>
          <div className="label">Pending Approvals</div>
        </div>
        <div className="wf-card">
          <div className="num">{dsrDue}</div>
          <div className="label">DSR Not Submitted</div>
        </div>
      </div>

      <div className="wf-grid wf-grid-2">
        <Box title="Projects by Workflow Stage">
          <ul className="wf-list">
            {stageCounts.map((s) => (
              <li key={s.phase}>
                <span>{s.phase}</span>
                <Badge tone="idle">{s.count} projects</Badge>
              </li>
            ))}
          </ul>
        </Box>

        <Box
          title="Pending Approvals / Notifications"
          right={
            <Link href="/notifications" className="wf-link-btn">
              View all
            </Link>
          }
        >
          <ul className="wf-list">
            {NOTIFICATIONS.slice(0, 5).map((n, i) => (
              <li key={i}>
                <span>{n.text}</span>
                <span style={{ color: "var(--idle)" }}>{n.when}</span>
              </li>
            ))}
          </ul>
        </Box>
      </div>

      <Box
        title="Active Projects — Current Stage"
        right={
          <Link href="/projects" className="wf-link-btn">
            Go to Projects →
          </Link>
        }
      >
        <DataTable
          columns={["Project", "Branch", "Customer", "Value", "Current Stage", "Status"]}
          rows={scopedProjects.map((p) => {
            const stage = STAGES.find((s) => s.slug === p.currentStageSlug);
            return [
              <Link key={p.id} href={`/projects/${p.id}`} className="wf-link-btn">
                {p.id}
              </Link>,
              branchName(p.branch),
              p.customer,
              p.value,
              stage ? `${stage.number}. ${stage.title}` : "—",
              <Badge key={p.id + "b"} tone="pending">
                {stage?.status || "—"}
              </Badge>,
            ];
          })}
        />
      </Box>

      <Box
        title="Lead Pipeline & Conversion"
        right={
          <Link href="/leads" className="wf-link-btn">
            Go to Leads →
          </Link>
        }
      >
        <DataTable
          columns={["Lead", "Branch", "Company / Project", "Source", "Rough Estimate", "Status"]}
          rows={scopedLeads.map((l) => [
            <Link key={l.id} href={`/leads/${l.id}`} className="wf-link-btn">
              {l.name}
            </Link>,
            branchName(l.branch),
            l.projectRef,
            l.source,
            l.roughEstimate || l.estCost || "—",
            <Badge key={l.id + "b"} tone={leadStatusTone(l.status)}>
              {l.status}
            </Badge>,
          ])}
        />
      </Box>
    </div>
  );
}
