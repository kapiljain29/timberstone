"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Badge, DataTable, leadStatusTone } from "@/components/ui";
import { getLeads } from "@/lib/store";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    // Reads from localStorage, which is unavailable during SSR — must load post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeads(getLeads());
  }, []);

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

      <Box title={`All Leads (${leads.length})`}>
        <DataTable
          columns={["Lead", "Project / Reference", "Source", "Rough Estimate", "Status", ""]}
          rows={leads.map((l) => [
            l.name,
            l.projectRef,
            l.source,
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
