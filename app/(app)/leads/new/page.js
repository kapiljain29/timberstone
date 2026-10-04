"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Annotation, CheckboxGroup } from "@/components/ui";
import { addLead, getArchitects, getSalesReps } from "@/lib/store";
import { getRoleId, getWebRole } from "@/lib/roles";
import { BRANCHES, BUDGET_SIZES, LEAD_SOURCES, PRODUCT_TYPES, architectLabel } from "@/lib/data";

const initial = {
  name: "",
  company: "",
  branch: BRANCHES[0].id,
  source: LEAD_SOURCES[0],
  phone: "",
  email: "",
  projectRef: "",
  productTypes: [],
  budgetSize: "",
  designRequired: "",
  architect: "",
  assignedRep: "",
  notes: "",
};

export default function NewLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [reps, setReps] = useState([]);
  const [architects, setArchitects] = useState([]);

  useEffect(() => {
    // Reads from localStorage, which is unavailable during SSR — must load post-mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    const salesReps = getSalesReps();
    setReps(salesReps);
    setArchitects(getArchitects().filter((a) => a.active));
    // A Sales rep's new leads default to themselves.
    const me = getRoleId() === "Sales" ? getWebRole("Sales").user : null;
    setForm((f) => ({ ...f, assignedRep: f.assignedRep || (me && salesReps.includes(me) ? me : salesReps[0]) || "" }));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const lead = addLead({ ...form, designRequired: form.designRequired === "yes" });
    router.push(`/leads/${lead.id}`);
  }

  return (
    <div>
      <div className="wf-crumb">Leads</div>
      <h1 className="wf-h1">Step 1 — Lead Creation</h1>
      <p className="wf-sub">A lead enters the system from any of several sources (Marketing / Sales).</p>

      <form onSubmit={handleSubmit}>
        <Box title="Lead & Contact Information">
          <div className="wf-grid wf-grid-2">
            <div className="wf-field">
              <label>Lead / Customer Name</label>
              <input className="wf-input" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Ankit Verma" />
            </div>
            <div className="wf-field">
              <label>Company / Household</label>
              <input className="wf-input" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="e.g. Verma Residence" />
            </div>
            <div className="wf-field">
              <label>Lead Source</label>
              <select className="wf-select" value={form.source} onChange={(e) => set("source", e.target.value)}>
                {LEAD_SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="wf-field">
              <label>Branch</label>
              <select className="wf-select" value={form.branch} onChange={(e) => set("branch", e.target.value)}>
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.tag})
                  </option>
                ))}
              </select>
            </div>
            <div className="wf-field">
              <label>Assigned Sales Rep</label>
              <select className="wf-select" value={form.assignedRep} onChange={(e) => set("assignedRep", e.target.value)}>
                {reps.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="wf-field">
              <label>Project Reference</label>
              <input className="wf-input" value={form.projectRef} onChange={(e) => set("projectRef", e.target.value)} placeholder="e.g. Exterior Wall — Italian Paints" />
            </div>
            <div className="wf-field">
              <label>Phone</label>
              <input className="wf-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91" />
            </div>
            <div className="wf-field">
              <label>Email</label>
              <input className="wf-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="wf-field">
              <label>Budget Size</label>
              <select className="wf-select" value={form.budgetSize} onChange={(e) => set("budgetSize", e.target.value)}>
                <option value="">Select…</option>
                {BUDGET_SIZES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="wf-field">
              <label>Design Required?</label>
              <select className="wf-select" required value={form.designRequired} onChange={(e) => set("designRequired", e.target.value)}>
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div className="wf-field">
              <label>Architect</label>
              <select className="wf-select" value={form.architect} onChange={(e) => set("architect", e.target.value)}>
                <option value="">None / Direct Customer</option>
                {architects.map((a) => (
                  <option key={a.id}>{architectLabel(a)}</option>
                ))}
              </select>
            </div>
          </div>
          <CheckboxGroup
            label="Product Type(s) of Interest"
            options={PRODUCT_TYPES}
            values={form.productTypes}
            onChange={(v) => set("productTypes", v)}
          />
        </Box>

        <Box title="Initial Notes">
          <div className="wf-field">
            <label>Notes</label>
            <textarea className="wf-textarea" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Anything captured at first contact..." />
          </div>
          <Annotation>
            Lead status defaults to &quot;Prospect&quot; and the lead goes straight into the
            assigned rep&apos;s Call Queue. Rough estimate (Step 2) and measurement /
            advance payment / sales operator assignment (Step 3) are captured on the lead detail
            page after this record is created.
          </Annotation>
        </Box>

        <div className="wf-actions-end">
          <button type="button" className="wf-btn" onClick={() => router.push("/leads")}>
            Cancel
          </button>
          <button type="submit" className="wf-btn primary">
            Save Lead →
          </button>
        </div>
      </form>
    </div>
  );
}
