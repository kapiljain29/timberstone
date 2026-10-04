"use client";

// Shared stage-form renderer used by BOTH the desktop stage screen
// (app/(app)/projects/[id]/stage/[slug]/page.js) and the Supervisor mobile
// app (app/(mobile)/m/projects/[id]/step/[slug]/page.js). Keeping the
// kind-based form logic in one place means the mobile app and the desktop
// wireframe can never drift out of sync — only the surrounding chrome
// (sidebar+topbar vs. phone frame+tab bar) differs between the two.
//
// `basePath` controls where "back to project" / "back to list" links point:
// "/projects" for desktop, "/m/projects" for the mobile app.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Badge, Field, DataTable, UploadBox, Annotation } from "@/components/ui";
import { getStage, getNextStage, getPrevStage, STAGES } from "@/lib/stages";
import {
  getProject,
  getProgress,
  markStageComplete,
  isStageUnlocked,
  getWorkOrderTerms,
  saveWorkOrderTerms,
  getMaterials,
  addMaterial,
  getContractors,
  addContractor,
  getDsrEntries,
  addDsrEntry,
  getClosure,
  saveClosure,
} from "@/lib/store";
import { canEditStep, useRole } from "@/lib/roles";

export default function StageForm({ id, slug, basePath = "/projects" }) {
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState(null);
  const [values, setValues] = useState({});
  const [checks, setChecks] = useState({});
  const [approval, setApproval] = useState(null); // null | "yes" | "no"

  // kind-specific working state
  const [terms, setTerms] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [newMaterial, setNewMaterial] = useState({ material: "", quantity: "", unit: "" });
  const [contractors, setContractors] = useState([]);
  const [newContractor, setNewContractor] = useState({ task: "", name: "", labour: "", finishDate: "", remark: "" });
  const [dsrEntries, setDsrEntries] = useState([]);
  const [showDsrForm, setShowDsrForm] = useState(false);
  const [newDsr, setNewDsr] = useState({ contractor: "", labour: "", daysToComplete: "", remark: "" });
  const [closure, setClosure] = useState(null);

  const stage = getStage(slug);
  const webRole = useRole();
  // The mobile app is the Supervisor's; on the web, use the logged-in role.
  const roleId = basePath.startsWith("/m") ? "Supervisor" : webRole?.id;

  // Reads from localStorage, which is unavailable during SSR — must load post-mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setProject(getProject(id));
    setProgress(getProgress(id));
    setValues({});
    setChecks({});
    setApproval(null);
    setShowDsrForm(false);
    setTerms(getWorkOrderTerms(id));
    setMaterials(getMaterials(id));
    setContractors(getContractors(id));
    setDsrEntries(getDsrEntries(id));
    setClosure(getClosure(id));
  }, [id, slug]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!stage) {
    return <div className="wf-empty">Unknown stage: {slug}</div>;
  }
  if (!project || !progress) {
    return <div className="wf-empty">Loading…</div>;
  }

  const unlocked = isStageUnlocked(id, slug);
  const canEdit = !!roleId && canEditStep(roleId, stage);
  const isComplete = progress.completed.includes(slug);
  const next = getNextStage(slug);
  const prev = getPrevStage(slug);

  function goToStage(targetSlug) {
    router.push(`${basePath}/${id}/${basePath.startsWith("/m") ? "step" : "stage"}/${targetSlug}`);
  }

  function handleComplete() {
    markStageComplete(id, slug);
    const updated = getProgress(id);
    setProgress(updated);
    if (next) {
      goToStage(next.slug);
    } else {
      router.push(`${basePath}/${id}`);
    }
  }

  function handleAddMaterial() {
    if (!newMaterial.material) return;
    setMaterials(addMaterial(id, newMaterial));
    setNewMaterial({ material: "", quantity: "", unit: "" });
  }

  function handleAddContractor() {
    if (!newContractor.name) return;
    addContractor(id, newContractor);
    setContractors(getContractors(id));
    setNewContractor({ task: "", name: "", labour: "", finishDate: "", remark: "" });
  }

  function handleAddDsr() {
    if (!newDsr.contractor) return;
    addDsrEntry(id, newDsr);
    setDsrEntries(getDsrEntries(id));
    setNewDsr({ contractor: "", labour: "", daysToComplete: "", remark: "" });
    setShowDsrForm(false);
  }

  function handleSaveClosure(patch) {
    const merged = { ...closure, ...patch };
    setClosure(merged);
    saveClosure(id, merged);
  }

  const completedAmount = parseFloat(String(closure?.completedAmount || "").replace(/[^0-9.]/g, "")) || 0;
  const receivedAmount = parseFloat(String(closure?.receivedAmount || "").replace(/[^0-9.]/g, "")) || 0;
  const creditNoteDue = receivedAmount > completedAmount ? receivedAmount - completedAmount : 0;

  return (
    <div>
      <div className="wf-crumb">
        <Link href={basePath} className="wf-link-btn">
          {basePath.startsWith("/m") ? "My Projects" : "Projects"}
        </Link>{" "}
        /{" "}
        <Link href={`${basePath}/${id}`} className="wf-link-btn">
          {id}
        </Link>{" "}
        / Step {stage.number}
      </div>

      <div className="wf-stage-head">
        <div className="wf-stage-head-main">
          <h1 className="wf-h1">
            <span className="wf-badge idle">Step {stage.number} / {STAGES[STAGES.length - 1].number}</span>
            {stage.title}
          </h1>
          <p className="wf-sub">{stage.description}</p>
        </div>
        <div className="wf-stage-head-side">
          <Badge tone={isComplete ? "done" : "current"}>{isComplete ? "Completed" : stage.status}</Badge>
          <div className="wf-stage-head-roles">
            <span className="wf-role-tag">{stage.role}</span>
            {stage.collaborators && stage.collaborators.length > 0 && (
              <span style={{ marginLeft: 6 }}>+ {stage.collaborators.join(", ")}</span>
            )}
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="wf-viewonly">
          👁 View only — this step is handled by {stage.role}
          {stage.collaborators?.length ? ` with ${stage.collaborators.join(", ")}` : ""}.
        </div>
      )}

      <fieldset className="wf-readonly" disabled={!canEdit}>
      {!unlocked && (
        <Annotation>
          This stage is shown for wireframe navigation purposes — normally it unlocks only after
          prior stages are completed.
        </Annotation>
      )}

      {stage.fields && stage.fields.length > 0 && (
        <Box title="Stage Details">
          <div className="wf-grid wf-grid-2">
            {stage.fields.map((f) => (
              <Field
                key={f.label}
                field={f}
                value={values[f.label]}
                onChange={(v) => setValues((s) => ({ ...s, [f.label]: v }))}
              />
            ))}
          </div>
        </Box>
      )}

      {/* kind: samples — Product, Design & Sample Selection */}
      {stage.kind === "samples" && (
        <>
          <Box title="Design Files">
            <div className="wf-grid wf-grid-2">
              <UploadBox label={stage.upload.jpegLabel} />
              <UploadBox label={stage.upload.dwgLabel} />
            </div>
          </Box>
          <Box title="Sample Photographs (Front &amp; Back) — up to ~10 samples">
            <DataTable columns={stage.samplesTable.columns} rows={stage.samplesTable.rows} />
            <button type="button" className="wf-btn ghost" style={{ marginTop: 12 }}>
              + Add Sample
            </button>
          </Box>
        </>
      )}

      {/* kind: form with an upload attached (measurement sheet) */}
      {stage.kind === "form" && stage.upload && (
        <Box title="Documents">
          <UploadBox label={stage.upload.label} />
          <div style={{ marginTop: 14 }}>
            <DataTable columns={stage.upload.table} rows={[]} emptyLabel="No files uploaded yet." />
          </div>
        </Box>
      )}

      {/* kind: workorder — Payment Terms */}
      {stage.kind === "workorder" && terms && (
        <Box title="Payment Terms" right={<span className="wf-role-tag">Default split shown — editing requires Management approval</span>}>
          <div className="wf-grid wf-grid-2">
            {[
              ["advance", "On Advance (%)"],
              ["dispatch", "On Dispatch (%)"],
              ["progress", "On Progress (%)"],
              ["handover", "On Handover (%)"],
            ].map(([key, label]) => (
              <div className="wf-field" key={key}>
                <label>{label}</label>
                <input
                  className="wf-input"
                  type="number"
                  value={terms[key]}
                  onChange={(e) => setTerms((t) => ({ ...t, [key]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
          <div className="wf-actions-end">
            <button type="button" className="wf-btn" onClick={() => setTerms(getWorkOrderTerms(id))}>
              Reset to Default
            </button>
            <button type="button" className="wf-btn primary" onClick={() => saveWorkOrderTerms(id, terms)}>
              Save Payment Terms
            </button>
          </div>
          <Annotation>
            Changing these from the default (50 / 30 / 10 / 10) requires Management approval before
            the Work Order is confirmed.
          </Annotation>
        </Box>
      )}

      {/* kind: delivery — Delivery Challan materials */}
      {stage.kind === "delivery" && (
        <Box title="Delivery Challan — Materials &amp; Quantities">
          <DataTable
            columns={stage.materialsTable.columns}
            rows={materials.map((m) => [m.material, m.quantity, m.unit])}
          />
          <div className="wf-grid wf-grid-3" style={{ marginTop: 14 }}>
            <div className="wf-field">
              <label>Material</label>
              <input className="wf-input" value={newMaterial.material} onChange={(e) => setNewMaterial((m) => ({ ...m, material: e.target.value }))} />
            </div>
            <div className="wf-field">
              <label>Quantity</label>
              <input className="wf-input" value={newMaterial.quantity} onChange={(e) => setNewMaterial((m) => ({ ...m, quantity: e.target.value }))} />
            </div>
            <div className="wf-field">
              <label>Unit</label>
              <input className="wf-input" value={newMaterial.unit} onChange={(e) => setNewMaterial((m) => ({ ...m, unit: e.target.value }))} placeholder="e.g. Litres" />
            </div>
          </div>
          <button type="button" className="wf-btn ghost" onClick={handleAddMaterial}>
            + Add Material Line
          </button>
        </Box>
      )}

      {/* kind: checklist — Daily Site Readiness */}
      {stage.kind === "checklist" && (
        <>
          <Box title="Site Readiness Checklist">
            <div className="wf-checklist">
              {stage.checklist.map((item) => (
                <label key={item}>
                  <input
                    type="checkbox"
                    checked={!!checks[item]}
                    onChange={(e) => setChecks((s) => ({ ...s, [item]: e.target.checked }))}
                  />
                  {item}
                </label>
              ))}
            </div>
          </Box>
          <Box title="Site Photos">
            <UploadBox label={stage.upload.label} />
            <div style={{ marginTop: 14 }}>
              <DataTable columns={stage.upload.table} rows={[]} emptyLabel="No photos uploaded yet." />
            </div>
          </Box>
        </>
      )}

      {/* kind: contractors — Contractor Allocation */}
      {stage.kind === "contractors" && (
        <Box title="Contractors Assigned">
          <DataTable
            columns={["Material Task", "Contractor", "Labour Count", "Tentative Finish Date", "Remark"]}
            rows={contractors.map((c) => [c.task, c.name, c.labour, c.finishDate, c.remark])}
            emptyLabel="No contractors allocated yet."
          />
          <div className="wf-grid wf-grid-2" style={{ marginTop: 14 }}>
            <div className="wf-field">
              <label>Material Task</label>
              <input className="wf-input" value={newContractor.task} onChange={(e) => setNewContractor((c) => ({ ...c, task: e.target.value }))} placeholder="e.g. Stone Cladding" />
            </div>
            <div className="wf-field">
              <label>Contractor Name</label>
              <input className="wf-input" value={newContractor.name} onChange={(e) => setNewContractor((c) => ({ ...c, name: e.target.value }))} />
            </div>
            <div className="wf-field">
              <label>Number of Labour</label>
              <input className="wf-input" value={newContractor.labour} onChange={(e) => setNewContractor((c) => ({ ...c, labour: e.target.value }))} />
            </div>
            <div className="wf-field">
              <label>Tentative Finish Date</label>
              <input className="wf-input" placeholder="dd/mm/yyyy" value={newContractor.finishDate} onChange={(e) => setNewContractor((c) => ({ ...c, finishDate: e.target.value }))} />
            </div>
            <div className="wf-field" style={{ gridColumn: "1 / -1" }}>
              <label>Remark</label>
              <textarea className="wf-textarea" value={newContractor.remark} onChange={(e) => setNewContractor((c) => ({ ...c, remark: e.target.value }))} />
            </div>
          </div>
          <button type="button" className="wf-btn ghost" onClick={handleAddContractor}>
            + Add Contractor
          </button>
        </Box>
      )}

      {/* kind: dsr — Daily Supervision Report per contractor */}
      {stage.kind === "dsr" && (
        <Box
          title="Daily Supervision Reports"
          right={
            <button className="wf-btn ghost" onClick={() => setShowDsrForm((v) => !v)}>
              {showDsrForm ? "Cancel" : "+ Add DSR Entry"}
            </button>
          }
        >
          {showDsrForm && (
            <div className="wf-grid wf-grid-2" style={{ marginBottom: 14 }}>
              <div className="wf-field">
                <label>Contractor</label>
                <select className="wf-select" value={newDsr.contractor} onChange={(e) => setNewDsr((d) => ({ ...d, contractor: e.target.value }))}>
                  <option value="">Select…</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.task})
                    </option>
                  ))}
                </select>
              </div>
              <div className="wf-field">
                <label>Number of Labour</label>
                <input className="wf-input" value={newDsr.labour} onChange={(e) => setNewDsr((d) => ({ ...d, labour: e.target.value }))} />
              </div>
              <div className="wf-field">
                <label>Days to Complete</label>
                <input className="wf-input" value={newDsr.daysToComplete} onChange={(e) => setNewDsr((d) => ({ ...d, daysToComplete: e.target.value }))} />
              </div>
              <div className="wf-field">
                <label>Current Status Photos</label>
                <UploadBox label="Upload status photos" />
              </div>
              <div className="wf-field" style={{ gridColumn: "1 / -1" }}>
                <label>Remark</label>
                <textarea className="wf-textarea" value={newDsr.remark} onChange={(e) => setNewDsr((d) => ({ ...d, remark: e.target.value }))} />
              </div>
              <button className="wf-btn primary" style={{ width: "fit-content" }} onClick={handleAddDsr}>
                Save DSR Entry
              </button>
            </div>
          )}
          <DataTable
            columns={["Site", "Contractor", "Labour", "Days to Complete", "Remark", "Date"]}
            rows={dsrEntries.map((e) => [project.projectName, e.contractor, e.labour, e.daysToComplete, e.remark, e.date])}
            emptyLabel="No DSR entries submitted yet."
          />
        </Box>
      )}

      {/* kind: closure — Final Measurement, Add-ons & Credit Note */}
      {stage.kind === "closure" && closure && (
        <Box title="Final Measurement, Add-ons & Credit Note">
          <div className="wf-grid wf-grid-2">
            <div className="wf-field">
              <label>Final Measurement</label>
              <input className="wf-input" value={closure.finalMeasurement} onChange={(e) => handleSaveClosure({ finalMeasurement: e.target.value })} placeholder="e.g. 1,280 sq.ft" />
            </div>
            <div className="wf-field">
              <label>Completed Work Amount</label>
              <input className="wf-input" value={closure.completedAmount} onChange={(e) => handleSaveClosure({ completedAmount: e.target.value })} placeholder="₹" />
            </div>
            <div className="wf-field">
              <label>Amount Already Received</label>
              <input className="wf-input" value={closure.receivedAmount} onChange={(e) => handleSaveClosure({ receivedAmount: e.target.value })} placeholder="₹" />
            </div>
            <div className="wf-field">
              <label>Add-on Work Notes</label>
              <textarea className="wf-textarea" value={(closure.addons || []).join("\n")} onChange={(e) => handleSaveClosure({ addons: e.target.value.split("\n") })} />
            </div>
          </div>
          {creditNoteDue > 0 ? (
            <Annotation>
              Completed work (₹{completedAmount.toLocaleString("en-IN")}) is less than the amount
              received (₹{receivedAmount.toLocaleString("en-IN")}). A Credit Note for
              ₹{creditNoteDue.toLocaleString("en-IN")} should be created for the difference.
            </Annotation>
          ) : (
            <Annotation>No credit note required — completed work covers the amount received.</Annotation>
          )}
        </Box>
      )}

      {stage.approval && (
        <Box title="Approval">
          <p style={{ fontSize: 13, marginBottom: 12 }}>{stage.approval.question}</p>
          <div className="wf-btn-row">
            <button
              className={`wf-btn ${approval === "yes" ? "primary" : ""}`}
              onClick={() => setApproval("yes")}
            >
              ✓ Yes / Approve
            </button>
            <button
              className={`wf-btn ${approval === "no" ? "danger" : ""}`}
              onClick={() => setApproval("no")}
            >
              ✕ No / Reject
            </button>
          </div>
          {approval === "no" && <div className="wf-note">{stage.approval.onReject}</div>}
        </Box>
      )}

      </fieldset>

      <div className="wf-actions-end">
        <button className="wf-btn" disabled={!prev} onClick={() => prev && goToStage(prev.slug)}>
          ← Back{prev ? `: ${prev.title}` : ""}
        </button>
        <div className="wf-btn-row">
          <button className="wf-btn ghost" onClick={() => router.push(`${basePath}/${id}`)}>
            View Full Stepper
          </button>
          <button
            className="wf-btn primary"
            disabled={!canEdit || (stage.approval ? approval !== "yes" : false)}
            onClick={handleComplete}
          >
            {isComplete ? "Update & Continue" : "Mark Complete & Continue"} →
          </button>
        </div>
      </div>
    </div>
  );
}
