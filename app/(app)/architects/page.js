"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Badge, BranchFilter, DataTable, Annotation } from "@/components/ui";
import { getArchitects, addArchitect, updateArchitect, getLeads } from "@/lib/store";
import { BRANCHES, branchName, architectLabel } from "@/lib/data";

const emptyArchitect = { name: "", firm: "", city: "", branch: BRANCHES[0].id, phone: "", email: "" };

export default function ArchitectsPage() {
  const [architects, setArchitects] = useState([]);
  const [leads, setLeads] = useState([]);
  const [branch, setBranch] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyArchitect);

  useEffect(() => {
    // Reads from localStorage, which is unavailable during SSR — must load post-mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setArchitects(getArchitects());
    setLeads(getLeads());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const visible = useMemo(
    () => (branch === "all" ? architects : architects.filter((a) => a.branch === branch)),
    [architects, branch]
  );

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save(e) {
    e.preventDefault();
    setArchitects(addArchitect(form));
    setForm(emptyArchitect);
    setShowForm(false);
  }

  function toggleActive(a) {
    setArchitects(updateArchitect(a.id, { active: !a.active }));
  }

  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Architects</h1>
          <p className="wf-sub">Architects who refer projects. Active architects appear in the lead form&apos;s Architect dropdown.</p>
        </div>
        <button type="button" className="wf-btn primary" style={{ marginBottom: 18 }} onClick={() => setShowForm((v) => !v)}>
          + Add Architect
        </button>
      </div>

      {showForm && (
        <form onSubmit={save}>
          <Box title="New Architect">
            <div className="wf-grid wf-grid-3">
              <div className="wf-field">
                <label>Architect Name</label>
                <input className="wf-input" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Nikhil Bansal" />
              </div>
              <div className="wf-field">
                <label>Firm / Studio</label>
                <input className="wf-input" required value={form.firm} onChange={(e) => set("firm", e.target.value)} placeholder="e.g. Bansal Associates" />
              </div>
              <div className="wf-field">
                <label>City</label>
                <input className="wf-input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Jaipur" />
              </div>
              <div className="wf-field">
                <label>Handled by Branch</label>
                <select className="wf-select" value={form.branch} onChange={(e) => set("branch", e.target.value)}>
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.tag})
                    </option>
                  ))}
                </select>
              </div>
              <div className="wf-field">
                <label>Phone</label>
                <input className="wf-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91" />
              </div>
              <div className="wf-field">
                <label>Email</label>
                <input className="wf-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary">
                Save Architect
              </button>
            </div>
          </Box>
        </form>
      )}

      <BranchFilter branches={BRANCHES} value={branch} onChange={setBranch} />

      <Box title={`Architect List (${visible.length})`}>
        <DataTable
          columns={["Architect", "Firm", "City", "Branch", "Phone", "Leads Referred", "Booked", "Status", ""]}
          emptyLabel="No architects for this branch yet."
          rows={visible.map((a) => {
            const referred = leads.filter((l) => l.architect === architectLabel(a));
            const booked = referred.filter((l) => l.status === "Booked" || l.convertedProjectId).length;
            return [
              <strong key={a.id + "n"}>Ar. {a.name}</strong>,
              a.firm,
              a.city || "—",
              branchName(a.branch),
              a.phone || "—",
              referred.length,
              booked,
              <Badge key={a.id + "s"} tone={a.active ? "done" : "idle"}>
                {a.active ? "Active" : "Inactive"}
              </Badge>,
              <button key={a.id + "t"} type="button" className="wf-link-btn" onClick={() => toggleActive(a)}>
                {a.active ? "Deactivate" : "Activate"}
              </button>,
            ];
          })}
        />
        <Annotation>
          &quot;Leads Referred&quot; counts leads where this architect was picked on the lead form.
          Inactive architects stay on old leads but are hidden from the dropdown.
        </Annotation>
      </Box>
    </div>
  );
}
