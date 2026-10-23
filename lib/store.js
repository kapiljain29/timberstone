"use client";

// Lightweight localStorage-backed "database" for the clickable wireframe.
// Not a real backend — just enough persistence so that creating a lead,
// converting it to a project, and clicking through the 24 execution
// stages feels real within a browser session.

import {
  SEED_LEADS,
  SEED_PROJECTS,
  DEFAULT_PAYMENT_TERMS,
} from "./data";
import { STAGES, getStage } from "./stages";

const KEYS = {
  leads: "wf_leads_v3",
  projects: "wf_projects_v3",
  progress: "wf_progress_v3", // { [projectId]: { completed: [slug...], current: slug } }
  stageData: "wf_stage_data_v3", // { [projectId]: { [slug]: {...arbitrary stage state} } }
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

// ---------- Projects ----------

export function getProjects() {
  ensureSeeded();
  return read(KEYS.projects, []);
}

export function getProject(id) {
  return getProjects().find((p) => p.id === id) || null;
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
