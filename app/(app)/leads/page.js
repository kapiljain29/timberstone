"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Box, Badge, BranchFilter, DataTable, leadStatusTone } from "@/components/ui";
import { getLeads } from "@/lib/store";
import { BRANCHES, branchName } from "@/lib/data";
import { useRole } from "@/lib/roles";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [branch, setBranch] = useState("all");
  const role = useRole();
  const ownOnly = role?.id === "Sales";

  useEffect(() => {
    // Reads from localStorage, which is unavailable during SSR — must load post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeads(getLeads());
  }, []);

  const scopedLeads = useMemo(
    () =>
      leads
        .filter((l) => !ownOnly || l.assignedRep === role.user)
        .filter((l) => branch === "all" || l.branch === branch),
    [leads, branch, ownOnly, role]
  );

  return (
    <div>
      <div className="wf-crumb">Pre-Sales</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="wf-h1">Leads</h1>
          <p className="wf-sub">
            Steps 1–3: Lead Creation, Initial Contact &amp; Rough Estimate, Measurement Booking &amp;
            Advance Payment.
          </p>
        </div>
        <Link href="/leads/new" className="wf-btn primary" style={{ marginBottom: 18 }}>
          + New Lead
        </Link>
      </div>

      <BranchFilter branches={BRANCHES} value={branch} onChange={setBranch} />

      <Box title={`${ownOnly ? "My Leads" : "All Leads"} (${scopedLeads.length})`}>
        <DataTable
          columns={["Lead", "Branch", "Project / Reference", "Source", "Budget", "Rough Estimate", "Status", ""]}
          rows={scopedLeads.map((l) => [
            l.name,
            branchName(l.branch),
            l.projectRef,
            l.source,
            l.budgetSize || "—",
            l.roughEstimate || l.estCost || "—",
            <Badge key={l.id + "b"} tone={leadStatusTone(l.status)}>
              {l.status}
            </Badge>,
            <Link key={l.id + "v"} href={`/leads/${l.id}`} className="wf-link-btn">
              Open →
            </Link>,
          ])}
        />
      </Box>
    </div>
  );
}
