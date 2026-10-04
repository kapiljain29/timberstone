"use client";

// Lightweight localStorage-backed "database" for the clickable wireframe.
// Not a real backend — just enough persistence so that creating a lead,
// converting it to a project, and clicking through the 24 execution
// stages feels real within a browser session.

import {
  SEED_LEADS,
  SEED_PROJECTS,
  SEED_CALL_LOGS,
  SEED_DEPARTMENTS,
  SEED_TEAM,
  SEED_ARCHITECTS,
  DEFAULT_PAYMENT_TERMS,
} from "./data";
import { STAGES, getStage } from "./stages";

const KEYS = {
  leads: "wf_leads_v3",
  projects: "wf_projects_v3",
  progress: "wf_progress_v3", // { [projectId]: { completed: [slug...], current: slug } }
  stageData: "wf_stage_data_v3", // { [projectId]: { [slug]: {...arbitrary stage state} } }
  callLogs: "wf_call_logs_v3",
  departments: "wf_departments_v1",
  team: "wf_team_v1",
  architects: "wf_architects_v1",
  seeded: "wf_seeded_v3",
};

function isBrowser() {
  return typeof window !== "undefined";
}

function read(key, fallback) {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function ensureSeeded() {
  if (!isBrowser()) return;
  if (read(KEYS.seeded, false)) return;
  write(KEYS.leads, SEED_LEADS);
  write(KEYS.projects, SEED_PROJECTS);
  write(KEYS.callLogs, SEED_CALL_LOGS);

  // Seed sensible progress for the seeded projects so their stepper
  // reflects "currentStageSlug" as the first incomplete stage.
  const progress = {};
  SEED_PROJECTS.forEach((p) => {
    const idx = STAGES.findIndex((s) => s.slug === p.currentStageSlug);
    const completed = idx > 0 ? STAGES.slice(0, idx).map((s) => s.slug) : [];
    progress[p.id] = { completed, current: p.currentStageSlug };
  });
  write(KEYS.progress, progress);
  write(KEYS.seeded, true);
}

// ---------- Leads ----------

export function getLeads() {
  ensureSeeded();
  return read(KEYS.leads, []);
}

export function getLead(id) {
  return getLeads().find((l) => l.id === id) || null;
}

export function addLead(lead) {
  const leads = getLeads();
  const id = `LD-${1000 + leads.length + Math.floor(Math.random() * 100)}`;
  const newLead = { id, status: "Prospect", createdAt: "Today", callAttempts: 0, nextCallback: null, ...lead };
  write(KEYS.leads, [newLead, ...leads]);
  return newLead;
}

export function updateLead(id, patch) {
  const leads = getLeads().map((l) => (l.id === id ? { ...l, ...patch } : l));
  write(KEYS.leads, leads);
}

// ---------- Masters: departments, team, architects ----------
// Seeded independently of leads/projects so adding them doesn't reset
// existing demo data.

function readList(key, seed) {
  const list = read(key, null);
  if (list) return list;
  write(key, seed);
  return seed;
}

function nextId(prefix, list) {
  const max = list.reduce((m, x) => Math.max(m, Number(String(x.id).split("-")[1]) || 0), 0);
  return `${prefix}-${max + 1}`;
}

export function getDepartments() {
  return readList(KEYS.departments, SEED_DEPARTMENTS);
}

export function addDepartment(dept) {
  const list = getDepartments();
  const base = dept.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const id = list.some((d) => d.id === base) ? `${base}-${list.length + 1}` : base;
  const next = [...list, { id, ...dept }];
  write(KEYS.departments, next);
  return next;
}

export function getTeam() {
  return readList(KEYS.team, SEED_TEAM);
}

export function addTeamMember(member) {
  const list = getTeam();
  const next = [...list, { id: nextId("TM", list), active: true, ...member }];
  write(KEYS.team, next);
  return next;
}

export function updateTeamMember(id, patch) {
  const next = getTeam().map((m) => (m.id === id ? { ...m, ...patch } : m));
  write(KEYS.team, next);
  return next;
}

// Active members of the Sales department — they own leads and work the
// Call Queue.
export function getSalesReps() {
  const sales = getDepartments().find((d) => d.name === "Sales");
  return getTeam()
    .filter((m) => m.active && sales && m.departmentId === sales.id)
    .map((m) => m.name);
}

export function getArchitects() {
  return readList(KEYS.architects, SEED_ARCHITECTS);
}

export function addArchitect(architect) {
  const list = getArchitects();
  const next = [...list, { id: nextId("AR", list), active: true, ...architect }];
  write(KEYS.architects, next);
  return next;
}

export function updateArchitect(id, patch) {
  const next = getArchitects().map((a) => (a.id === id ? { ...a, ...patch } : a));
  write(KEYS.architects, next);
  return next;
}

// ---------- Call queue ----------

export function getCallLogs() {
  ensureSeeded();
  return read(KEYS.callLogs, []);
}

// Logs one call against a lead and applies its outcome: the lead's status
// moves to the outcome's status, the attempt count goes up, and the next
// callback is set (or cleared when the outcome needs no callback).
export function logCall(leadId, { outcome, rep, nextCallback, note }) {
  const lead = getLead(leadId);
  if (!lead) return null;
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const logs = getCallLogs();
  const entry = {
    id: `CL-${logs.length + 1}`,
    leadId,
    leadName: lead.name,
    rep,
    date: "Today",
    time,
    outcome: outcome.label,
    connected: outcome.connected,
    nextCallback: outcome.callback ? nextCallback || null : null,
    note: note || "",
  };
  write(KEYS.callLogs, [...logs, entry]);
  updateLead(leadId, {
    status: outcome.status,
    callAttempts: (lead.callAttempts || 0) + 1,
    nextCallback: entry.nextCallback,
    lastCalled: `Today ${time}`,
  });
  return entry;
}

// ---------- Projects ----------

export function getProjects() {
  ensureSeeded();
  return read(KEYS.projects, []);
}

export function getProject(id) {
  return getProjects().find((p) => p.id === id) || null;
}

export function addProject(project) {
  const projects = getProjects();
  const id = `PRJ-${2000 + projects.length + Math.floor(Math.random() * 100)}`;
  const firstSlug = STAGES[0].slug;
  const newProject = { id, currentStageSlug: firstSlug, createdAt: "Today", ...project };
  write(KEYS.projects, [newProject, ...projects]);

  const progress = read(KEYS.progress, {});
  progress[id] = { completed: [], current: firstSlug };
  write(KEYS.progress, progress);

  return newProject;
}

export function convertLeadToProject(leadId) {
  const lead = getLead(leadId);
  if (!lead) return null;
  const project = addProject({
    leadId: lead.id,
    customer: lead.name,
    branch: lead.branch,
    projectName: `${lead.name} — ${lead.projectRef || "New Project"}`,
    productTypes: lead.productTypes || [],
    salesOperator: lead.salesOperator || null,
    value: lead.estCost || lead.roughEstimate || "TBD",
  });
  updateLead(leadId, { status: "Booked", convertedProjectId: project.id });
  return project;
}

// ---------- Stage progress ----------

export function getProgress(projectId) {
  ensureSeeded();
  const progress = read(KEYS.progress, {});
  return progress[projectId] || { completed: [], current: STAGES[0].slug };
}

export function isStageComplete(projectId, slug) {
  return getProgress(projectId).completed.includes(slug);
}

export function isStageUnlocked(projectId, slug) {
  const idx = STAGES.findIndex((s) => s.slug === slug);
  if (idx === 0) return true;
  const prevSlug = STAGES[idx - 1].slug;
  return isStageComplete(projectId, prevSlug) || getProgress(projectId).current === slug || isStageComplete(projectId, slug);
}

export function markStageComplete(projectId, slug) {
  const progress = read(KEYS.progress, {});
  const entry = progress[projectId] || { completed: [], current: slug };
  if (!entry.completed.includes(slug)) entry.completed.push(slug);
  const idx = STAGES.findIndex((s) => s.slug === slug);
  const next = STAGES[idx + 1];
  entry.current = next ? next.slug : slug;
  progress[projectId] = entry;
  write(KEYS.progress, progress);

  const projects = getProjects().map((p) =>
    p.id === projectId ? { ...p, currentStageSlug: entry.current } : p
  );
  write(KEYS.projects, projects);

  return entry;
}

export function setCurrentStage(projectId, slug) {
  const progress = read(KEYS.progress, {});
  const entry = progress[projectId] || { completed: [], current: slug };
  entry.current = slug;
  progress[projectId] = entry;
  write(KEYS.progress, progress);
}

// ---------- Generic per-stage data ----------
// Arbitrary state per (projectId, stageSlug), used by stage-specific screens
// (samples, work order terms, contractors, DSR entries, materials, closure).

export function getStageData(projectId, slug) {
  ensureSeeded();
  const all = read(KEYS.stageData, {});
  return (all[projectId] && all[projectId][slug]) || {};
}

export function patchStageData(projectId, slug, patch) {
  const all = read(KEYS.stageData, {});
  const forProject = all[projectId] || {};
  const current = forProject[slug] || {};
  const next = { ...current, ...patch };
  forProject[slug] = next;
  all[projectId] = forProject;
  write(KEYS.stageData, all);
  return next;
}

// ---------- Work Order & Payment Terms (stage 6) ----------

const WORK_ORDER_SLUG = "work-order-payment-terms";

export function getWorkOrderTerms(projectId) {
  const data = getStageData(projectId, WORK_ORDER_SLUG);
  return data.terms || { ...DEFAULT_PAYMENT_TERMS };
}

export function saveWorkOrderTerms(projectId, terms) {
  return patchStageData(projectId, WORK_ORDER_SLUG, { terms, changed: true });
}

// ---------- Material Delivery Challan (stage 8) ----------

const DELIVERY_SLUG = "material-delivery-challan";

export function getMaterials(projectId) {
  const data = getStageData(projectId, DELIVERY_SLUG);
  if (data.materials) return data.materials;
  const stage = getStage(DELIVERY_SLUG);
  const seedRows = (stage && stage.materialsTable && stage.materialsTable.seedRows) || [];
  return seedRows.map(([material, quantity, unit]) => ({ material, quantity, unit }));
}

export function addMaterial(projectId, row) {
  const materials = [...getMaterials(projectId), row];
  patchStageData(projectId, DELIVERY_SLUG, { materials });
  return materials;
}

// ---------- Contractor Allocation (stage 10) ----------

const CONTRACTOR_SLUG = "contractor-allocation";

export function getContractors(projectId) {
  const data = getStageData(projectId, CONTRACTOR_SLUG);
  return data.contractors || [];
}

export function addContractor(projectId, contractor) {
  const contractors = getContractors(projectId);
  const id = `CT-${contractors.length + 1}`;
  const newContractor = { id, ...contractor };
  const next = [...contractors, newContractor];
  patchStageData(projectId, CONTRACTOR_SLUG, { contractors: next });
  return newContractor;
}

// ---------- Daily Supervision Report (stage 11) ----------

const DSR_SLUG = "daily-supervision-report";

export function getDsrEntries(projectId) {
  const data = getStageData(projectId, DSR_SLUG);
  return data.entries || [];
}

export function addDsrEntry(projectId, entry) {
  const entries = getDsrEntries(projectId);
  const id = `DSR-${entries.length + 1}`;
  const newEntry = { id, date: "Today", ...entry };
  const next = [...entries, newEntry];
  patchStageData(projectId, DSR_SLUG, { entries: next });
  return newEntry;
}

// ---------- Final Measurement & Closure (stage 12) ----------

const CLOSURE_SLUG = "final-measurement-closure";

export function getClosure(projectId) {
  const data = getStageData(projectId, CLOSURE_SLUG);
  return (
    data.closure || {
      finalMeasurement: "",
      addons: [],
      completedAmount: "",
      receivedAmount: "",
      creditNoteAmount: null,
    }
  );
}

export function saveClosure(projectId, closure) {
  return patchStageData(projectId, CLOSURE_SLUG, { closure });
}
