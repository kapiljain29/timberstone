"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Badge, Annotation, leadStatusTone } from "@/components/ui";
import { getLead, updateLead, convertLeadToProject } from "@/lib/store";
import { LEAD_STATUSES, branchName } from "@/lib/data";

export default function LeadDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [step2, setStep2] = useState({ roughEstimate: "", status: "Prospect", notes: "" });
  const [step3, setStep3] = useState({ measurementRequired: "", advancePayment: "", salesOperator: "" });

  useEffect(() => {
    // Reads from localStorage, which is unavailable during SSR — must load post-mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    const found = getLead(id);
    setLead(found);
    if (found) {
      setStep2({
        roughEstimate: found.roughEstimate || "",
        status: found.status || "Prospect",
        notes: found.notes || "",
      });
      setStep3({
        measurementRequired: found.measurementRequired === true ? "yes" : found.measurementRequired === false ? "no" : "",
        advancePayment: found.advancePayment || "",
        salesOperator: found.salesOperator || "",
      });
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [id]);

  if (!lead) {
    return <div className="wf-empty">Loading lead…</div>;
  }

  function refresh() {
    setLead(getLead(id));
  }

  function saveStep2() {
    updateLead(lead.id, {
      roughEstimate: step2.roughEstimate,
      status: step2.status,
      notes: step2.notes,
    });
    refresh();
  }

  function saveStep3() {
    const measurementRequired = step3.measurementRequired === "yes";
    const patch = { measurementRequired };
    if (measurementRequired) {
      patch.advancePayment = step3.advancePayment;
      patch.salesOperator = step3.salesOperator;
      if (step3.advancePayment && step3.salesOperator) {
        patch.status = "Booked";
      }
    }
    updateLead(lead.id, patch);
    refresh();
  }

  function handleConvert() {
    const project = convertLeadToProject(lead.id);
    router.push(`/projects/${project.id}`);
  }

  const alreadyConverted = !!lead.convertedProjectId;
  const readyToConvert =
    lead.measurementRequired === true && !!lead.advancePayment && !!lead.salesOperator;

  return (
    <div>
      <div className="wf-crumb">
        <Link href="/leads" className="wf-link-btn">
          Leads
        </Link>{" "}
        / {lead.id}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="wf-h1">
            {lead.name} <Badge tone={leadStatusTone(lead.status)}>{lead.status}</Badge>
          </h1>
          <p className="wf-sub">
            {lead.company} · Lead ID {lead.id} · Branch: {branchName(lead.branch)} · Created {lead.createdAt}
            {lead.productTypes && lead.productTypes.length > 0 ? ` · ${lead.productTypes.join(", ")}` : ""}
          </p>
        </div>
        {alreadyConverted ? (
          <Link href={`/projects/${lead.convertedProjectId}`} className="wf-btn primary">
            View Project →
          </Link>
        ) : (
          <button className="wf-btn primary" onClick={handleConvert} disabled={!readyToConvert}>
            Convert to Project →
          </button>
        )}
      </div>

      <Box title="Step 1 — Lead Creation">
        <div className="wf-grid wf-grid-3">
          <div className="wf-field">
            <label>Contact Phone</label>
            <input className="wf-input" defaultValue={lead.phone} readOnly />
          </div>
          <div className="wf-field">
            <label>Contact Email</label>
            <input className="wf-input" defaultValue={lead.email} readOnly />
          </div>
          <div className="wf-field">
            <label>Lead Source</label>
            <input className="wf-input" defaultValue={lead.source} readOnly />
          </div>
          <div className="wf-field">
            <label>Project Reference</label>
            <input className="wf-input" defaultValue={lead.projectRef} readOnly />
          </div>
          <div className="wf-field">
            <label>Product Type(s)</label>
            <input className="wf-input" defaultValue={(lead.productTypes || []).join(", ") || "—"} readOnly />
          </div>
        </div>
      </Box>

      <Box title="Step 2 — Initial Contact & Rough Estimate" right={<span className="wf-role-tag">Marketing / Sales</span>}>
        <div className="wf-grid wf-grid-2">
          <div className="wf-field">
            <label>Rough Estimate (given on call)</label>
            <input
              className="wf-input"
              value={step2.roughEstimate}
              onChange={(e) => setStep2((s) => ({ ...s, roughEstimate: e.target.value }))}
              placeholder="₹"
            />
          </div>
          <div className="wf-field">
            <label>Lead Status</label>
            <select className="wf-select" value={step2.status} onChange={(e) => setStep2((s) => ({ ...s, status: e.target.value }))}>
              {LEAD_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="wf-field">
          <label>Discussion Notes</label>
          <textarea
            className="wf-textarea"
            value={step2.notes}
            onChange={(e) => setStep2((s) => ({ ...s, notes: e.target.value }))}
            placeholder="Requirement details discussed on call..."
          />
        </div>
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={saveStep2}>
            Save Step 2
          </button>
        </div>
      </Box>

      <Box title="Step 3 — Measurement Booking, Advance Payment & Sales Operator" right={<span className="wf-role-tag">Sales</span>}>
        <div className="wf-field">
          <label>Does the customer require an on-site measurement?</label>
          <select
            className="wf-select"
            value={step3.measurementRequired}
            onChange={(e) => setStep3((s) => ({ ...s, measurementRequired: e.target.value }))}
          >
            <option value="">Select…</option>
            <option value="yes">Yes — book measurement</option>
            <option value="no">No</option>
          </select>
        </div>
        {step3.measurementRequired === "yes" && (
          <div className="wf-grid wf-grid-2">
            <div className="wf-field">
              <label>Advance Payment Received</label>
              <input
                className="wf-input"
                value={step3.advancePayment}
                onChange={(e) => setStep3((s) => ({ ...s, advancePayment: e.target.value }))}
                placeholder="₹"
              />
            </div>
            <div className="wf-field">
              <label>Sales Operator Assigned</label>
              <input
                className="wf-input"
                value={step3.salesOperator}
                onChange={(e) => setStep3((s) => ({ ...s, salesOperator: e.target.value }))}
                placeholder="e.g. Vivek Rane"
              />
            </div>
          </div>
        )}
        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={saveStep3}>
            Save Step 3
          </button>
        </div>
        <Annotation>
          Once measurement is required, advance payment is recorded and a sales operator is
          assigned, the lead becomes eligible for conversion into a Project (Step 4 onward — the
          Supervisor-led execution flow).
        </Annotation>
      </Box>
    </div>
  );
}
