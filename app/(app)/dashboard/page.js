"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Badge, DataTable, leadStatusTone } from "@/components/ui";
import { getLeads, getProjects } from "@/lib/store";
import { NOTIFICATIONS, DASHBOARD_STAGE_COUNTS } from "@/lib/data";
import { STAGES } from "@/lib/stages";

export default function DashboardPage() {
  const [leads, setLeads] = useState([]);
  const [projects, setProjects] = useState([]);

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLeads(getLeads());
    setProjects(getProjects());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeProjects = projects.length;
  const openLeads = leads.filter((l) => !l.convertedProjectId).length;
  const pendingApprovals = 5;
  const dsrDue = 1;

  return (
    <div>
      <div className="wf-crumb">Overview</div>
      <h1 className="wf-h1">Management Dashboard</h1>
      <p className="wf-sub">
        Section 10 of the proposal — lead pipeline, project stages, pending approvals and
        at-risk projects at a glance.
      </p>

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
            {DASHBOARD_STAGE_COUNTS.map((s) => (
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
          columns={["Project", "Customer", "Value", "Current Stage", "Status"]}
          rows={projects.map((p) => {
            const stage = STAGES.find((s) => s.slug === p.currentStageSlug);
            return [
              <Link key={p.id} href={`/projects/${p.id}`} className="wf-link-btn">
                {p.id}
              </Link>,
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
          columns={["Lead", "Company / Project", "Source", "Rough Estimate", "Status"]}
          rows={leads.map((l) => [
            <Link key={l.id} href={`/leads/${l.id}`} className="wf-link-btn">
              {l.name}
            </Link>,
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
