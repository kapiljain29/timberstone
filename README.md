# Timberstone ERP — Clickable Wireframe

A low-fidelity, clickable wireframe for the AppiMindTech Timberstone ERP
proposal ("Lead to Work Handover"). Single Next.js (JS, App Router) codebase
that serves both as a normal web app and an installable PWA.

## Run it

```bash
npm run dev
```

Open http://localhost:3000. Data is stored in the browser's `localStorage`
(seeded with sample leads/projects on first load), so creating a lead,
converting it to a project, and clicking through stages persists across
reloads. Clear the site's local storage to reset the demo data.

## What's covered

The flow reflects Timberstone's actual 12-step Lead-to-Handover process
(clarified by the client on 25 Sep 2026), organized role-wise across
Marketing, Sales, Supervisor, Design, Accounts and Manager:

- **Leads module** (`/leads`) — Steps 1–3: Lead Creation (Marketing/Sales),
  Initial Contact & Rough Estimate (Sales), and Measurement Booking + Advance
  Payment + Sales Operator Assignment (Sales). "Convert to Project" hands off
  into the project stepper once a lead is fully booked.
- **Projects module** (`/projects`) — Steps 4–12: the 9-step execution
  workflow (Product/Design/Sample Selection → Measurement & Final Quotation →
  Work Order & Payment Terms → Order Placed → Material Delivery → Site
  Readiness → Contractor Allocation → Daily Supervision Reports → Final
  Measurement, Add-ons & Credit Note), rendered as a clickable stepper. Each
  stage is its own screen (`/projects/[id]/stage/[slug]`) with fields, sample
  uploads, payment-term editing, delivery challans, checklists, multi-
  contractor allocation, and per-contractor DSR logging.
- **Dashboard** (`/`) — pipeline, stage counts, pending approvals at a
  glance.
- **Notifications** (`/notifications`) and **Role-wise Workflow** (`/roles`)
  — the latter is the client-facing view of exactly which department owns
  (or collaborates on) each of the 12 steps.

Styling is intentionally grayscale/boxed/dashed — it communicates layout,
navigation and field coverage, not final visual design.

## PWA

`app/manifest.js` declares the web app manifest (installable, standalone
display). For production, add a service worker (e.g. via `next-pwa` or
`serwist`) for offline caching — not included here since it would interfere
with iterative wireframe development.

## Next steps (not part of this wireframe)

- Real backend / database, auth, and role-based access control.
- File upload storage for drawings, photos, challans, DSR photos.
- Visual design pass once the flow is validated with Timberstone.
