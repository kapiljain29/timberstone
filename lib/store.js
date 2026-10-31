"use client";

// Lightweight localStorage-backed "database" for the clickable wireframe.
// Not a real backend — just enough persistence so that creating a lead,
// converting it to a site, and clicking through the 24 execution
// stages feels real within a browser session.

import {
  SEED_LEADS,
  SEED_SITES,
  DEFAULT_PAYMENT_TERMS,
} from "./data";
import { STAGES, getStage } from "./stages";

const KEYS = {
  leads: "wf_leads_v4",
  sites: "wf_sites_v4",
  progress: "wf_progress_v4", // { [siteId]: { completed: [slug...], current: slug } }
  stageData: "wf_stage_data_v4", // { [siteId]: { [slug]: {...arbitrary stage state} } }
  seeded: "wf_seeded_v4",
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
  write(KEYS.sites, SEED_SITES);

  // Seed sensible progress for the seeded sites so their stepper
  // reflects "currentStageSlug" as the first incomplete stage.
  const progress = {};
  SEED_SITES.forEach((p) => {
    const idx = STAGES.findIndex((s) => s.slug === p.currentStageSlug);
    const completed = idx > 0 ? STAGES.slice(0, idx).map((s) => s.slug) : [];
    progress[p.id] = { completed, current: p.currentStageSlug };
  });
  write(KEYS.progress, progress);
  write(KEYS.seeded, true);
}

// ---------- Sites ----------

export function getSites() {
  ensureSeeded();
  return read(KEYS.sites, []);
}

export function getSite(id) {
  return getSites().find((p) => p.id === id) || null;
}

// ---------- Stage progress ----------

export function getProgress(siteId) {
  ensureSeeded();
  const progress = read(KEYS.progress, {});
  return progress[siteId] || { completed: [], current: STAGES[0].slug };
}

export function isStageComplete(siteId, slug) {
  return getProgress(siteId).completed.includes(slug);
}

export function isStageUnlocked(siteId, slug) {
  const idx = STAGES.findIndex((s) => s.slug === slug);
  if (idx === 0) return true;
  const prevSlug = STAGES[idx - 1].slug;
  return isStageComplete(siteId, prevSlug) || getProgress(siteId).current === slug || isStageComplete(siteId, slug);
}

export function markStageComplete(siteId, slug) {
  const progress = read(KEYS.progress, {});
  const entry = progress[siteId] || { completed: [], current: slug };
  if (!entry.completed.includes(slug)) entry.completed.push(slug);
  const idx = STAGES.findIndex((s) => s.slug === slug);
  const next = STAGES[idx + 1];
  entry.current = next ? next.slug : slug;
  progress[siteId] = entry;
  write(KEYS.progress, progress);

  const sites = getSites().map((p) =>
    p.id === siteId ? { ...p, currentStageSlug: entry.current } : p
  );
  write(KEYS.sites, sites);

  return entry;
}

export function setCurrentStage(siteId, slug) {
  const progress = read(KEYS.progress, {});
  const entry = progress[siteId] || { completed: [], current: slug };
  entry.current = slug;
  progress[siteId] = entry;
  write(KEYS.progress, progress);
}

// ---------- Generic per-stage data ----------
// Arbitrary state per (siteId, stageSlug), used by stage-specific screens
// (samples, work order terms, contractors, DSR entries, materials, closure).

export function getStageData(siteId, slug) {
  ensureSeeded();
  const all = read(KEYS.stageData, {});
  return (all[siteId] && all[siteId][slug]) || {};
}

export function patchStageData(siteId, slug, patch) {
  const all = read(KEYS.stageData, {});
  const forSite = all[siteId] || {};
  const current = forSite[slug] || {};
  const next = { ...current, ...patch };
  forSite[slug] = next;
  all[siteId] = forSite;
  write(KEYS.stageData, all);
  return next;
}

// ---------- Work Order & Payment Terms (stage 6) ----------

const WORK_ORDER_SLUG = "work-order-payment-terms";

export function getWorkOrderTerms(siteId) {
  const data = getStageData(siteId, WORK_ORDER_SLUG);
  return data.terms || { ...DEFAULT_PAYMENT_TERMS };
}

export function saveWorkOrderTerms(siteId, terms) {
  return patchStageData(siteId, WORK_ORDER_SLUG, { terms, changed: true });
}

// ---------- Material Delivery Challan (stage 8) ----------

const DELIVERY_SLUG = "material-delivery-challan";

export function getMaterials(siteId) {
  const data = getStageData(siteId, DELIVERY_SLUG);
  if (data.materials) return data.materials;
  const stage = getStage(DELIVERY_SLUG);
  const seedRows = (stage && stage.materialsTable && stage.materialsTable.seedRows) || [];
  return seedRows.map(([material, quantity, unit]) => ({ material, quantity, unit }));
}

export function addMaterial(siteId, row) {
  const materials = [...getMaterials(siteId), row];
  patchStageData(siteId, DELIVERY_SLUG, { materials });
  return materials;
}

// ---------- Contractor Allocation (stage 10) ----------

const CONTRACTOR_SLUG = "contractor-allocation";

export function getContractors(siteId) {
  const data = getStageData(siteId, CONTRACTOR_SLUG);
  return data.contractors || [];
}

export function addContractor(siteId, contractor) {
  const contractors = getContractors(siteId);
  const id = `CT-${contractors.length + 1}`;
  const newContractor = { id, ...contractor };
  const next = [...contractors, newContractor];
  patchStageData(siteId, CONTRACTOR_SLUG, { contractors: next });
  return newContractor;
}

// ---------- Daily Supervision Report (stage 11) ----------

const DSR_SLUG = "daily-supervision-report";

export function getDsrEntries(siteId) {
  const data = getStageData(siteId, DSR_SLUG);
  return data.entries || [];
}

export function addDsrEntry(siteId, entry) {
  const entries = getDsrEntries(siteId);
  const id = `DSR-${entries.length + 1}`;
  const newEntry = { id, date: "Today", ...entry };
  const next = [...entries, newEntry];
  patchStageData(siteId, DSR_SLUG, { entries: next });
  return newEntry;
}

// ---------- Final Measurement & Closure (stage 12) ----------

const CLOSURE_SLUG = "final-measurement-closure";

export function getClosure(siteId) {
  const data = getStageData(siteId, CLOSURE_SLUG);
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

export function saveClosure(siteId, closure) {
  return patchStageData(siteId, CLOSURE_SLUG, { closure });
}
