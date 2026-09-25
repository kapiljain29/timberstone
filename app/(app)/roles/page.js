"use client";

import Link from "next/link";
import { Box, DataTable, Badge } from "@/components/ui";
import { ALL_STEPS, stepsOwnedBy, stepsSupportedBy } from "@/lib/stages";
import { DEPARTMENTS } from "@/lib/data";

const PHASE_LABEL = {
  lead: "Pre-Sales",
  design: "Design & Sample Approval",
  order: "Work Order & Delivery",
  execution: "Site Execution",
  closure: "Final Measurement & Closure",
};

export default function RolesPage() {
  return (
    <div>
      <div className="wf-crumb">Reference</div>
      <h1 className="wf-h1">Role-wise Workflow</h1>
      <p className="wf-sub">
        The full 12-step Lead-to-Handover process, organized by department so each team can see
        exactly what they own and where they hand off — as clarified by the client on 25 Sep 2026.
      </p>

      {DEPARTMENTS.map((dept) => {
        const owned = stepsOwnedBy(dept);
        const supporting = stepsSupportedBy(dept);
        if (owned.length === 0 && supporting.length === 0) return null;
        return (
          <Box
            key={dept}
            title={dept}
            right={
              <span style={{ display: "flex", gap: 6 }}>
                {dept === "Supervisor" && <span className="wf-role-tag">📱 Mobile App</span>}
                <span className="wf-role-tag">{owned.length} step(s) owned</span>
              </span>
            }
          >
            {owned.length === 0 ? (
              <p className="wf-sub" style={{ margin: 0 }}>
                No steps directly owned — supports other teams only.
              </p>
            ) : (
              <ul className="wf-list">
                {owned.map((s) => (
                  <li key={s.slug}>
                    <span>
                      <strong>Step {s.number}.</strong>{" "}
                      {s.href ? (
                        <Link href={s.href} className="wf-link-btn">
                          {s.title}
                        </Link>
                      ) : (
                        s.title
                      )}{" "}
                      <span style={{ color: "var(--ink-soft)" }}>— {s.description}</span>
                    </span>
                    <Badge tone="idle">{PHASE_LABEL[s.phase]}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {supporting.length > 0 && (
              <p className="wf-sub" style={{ marginTop: 10, marginBottom: 0 }}>
                Also collaborates on: Step{supporting.length > 1 ? "s" : ""}{" "}
                {supporting.map((s) => s.number).join(", ")} ({supporting.map((s) => s.title).join("; ")}).
              </p>
            )}
          </Box>
        );
      })}

      <Box title="Full Process — Step by Step (1 → 12)">
        <DataTable
          columns={["#", "Step", "Group", "Primary Role", "Collaborators", "Description"]}
          rows={ALL_STEPS.map((s) => [
            s.number,
            s.title,
            PHASE_LABEL[s.phase],
            s.role,
            (s.collaborators || []).join(", ") || "—",
            s.description,
          ])}
        />
      </Box>
    </div>
  );
}
