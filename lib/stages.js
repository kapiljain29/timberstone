// The 9 project execution stages (Step 4 -> Step 12) of Timberstone's
// actual Lead-to-Handover process, as clarified by the client on
// 25 Sep 2026. Steps 1-3 (Lead Creation, Initial Contact & Rough Estimate,
// Measurement Booking + Advance Payment + Sales Operator Assignment) live
// in the Leads module since they happen before a Project record exists.

export const PHASES = [
  { key: "design", label: "Design & Sample Approval" },
  { key: "order", label: "Work Order & Delivery" },
  { key: "execution", label: "Site Execution" },
  { key: "closure", label: "Final Measurement & Closure" },
];

// Steps 1-3 happen in the Leads module, before a Project record exists.
// Kept here (alongside STAGES) so the Role-wise Workflow view has a single
// source of truth for the full 1-12 step process.
export const LEAD_STEPS = [
  {
    slug: "lead-creation",
    number: 1,
    phase: "lead",
    title: "Lead Creation",
    role: "Marketing",
    collaborators: ["Sales"],
    status: "New Lead",
    description: "A lead enters the system from any of several sources (website, referral, walk-in, exhibition, etc.).",
    href: "/leads/new",
  },
  {
    slug: "initial-contact-estimate",
    number: 2,
    phase: "lead",
    title: "Initial Contact & Rough Estimate",
    role: "Sales",
    status: "Followup / Conducted",
    description: "Team connects with the customer, asks for details, and gives a rough estimate on call.",
    href: "/leads",
  },
  {
    slug: "measurement-advance-operator",
    number: 3,
    phase: "lead",
    title: "Measurement Booking, Advance Payment & Sales Operator",
    role: "Sales",
    status: "Booked",
    description:
      "If the customer requires measurement, they pay an advance payment, the lead is processed for measurement, and a Sales Operator is assigned.",
    href: "/leads",
  },
];

export const STAGES = [
  {
    slug: "product-design-samples",
    number: 4,
    phase: "design",
    title: "Product, Design & Sample Selection",
    role: "Supervisor",
    collaborators: ["Design"],
    status: "Samples Pending Approval",
    kind: "samples",
    description:
      "Supervisor selects the product code, uploads JPEG/DWG design files, and uploads approved sample photographs (front & back) — typically up to ~10 samples per project.",
    fields: [
      { label: "Product Type", type: "select", options: ["Italian Paints", "Stones", "Stamping", "Nano Topping", "Texture"] },
      { label: "Product Code", type: "text", placeholder: "e.g. IP-2201 Marmorino" },
    ],
    upload: { jpegLabel: "Upload design JPEG", dwgLabel: "Upload DWG file" },
    samplesTable: {
      columns: ["Sample No.", "Product Code", "Front Photo", "Back Photo", "Approved?"],
      rows: [
        ["S-01", "IP-2201", "[front.jpg]", "[back.jpg]", "Yes"],
        ["S-02", "IP-2204", "[front.jpg]", "[back.jpg]", "Pending"],
      ],
    },
  },
  {
    slug: "measurement-final-quotation",
    number: 5,
    phase: "design",
    title: "Measurement Sheet & Final Quotation",
    role: "Supervisor",
    status: "Quotation Pending Approval",
    kind: "form",
    description:
      "Supervisor uploads the measurement sheet taken on site and updates the final quotation based on the confirmed measurements.",
    fields: [
      { label: "Measurement Sheet No.", type: "text", placeholder: "MS-1042" },
      { label: "Total Area / Quantity", type: "text", placeholder: "e.g. 1,240 sq.ft" },
      { label: "Final Quotation Value", type: "text", placeholder: "₹" },
      { label: "Quotation Notes", type: "textarea" },
    ],
    upload: { label: "Upload measurement sheet", table: ["File Name", "Uploaded By", "Date"] },
  },
  {
    slug: "work-order-payment-terms",
    number: 6,
    phase: "order",
    title: "Work Order & Payment Terms",
    role: "Sales / Accounts",
    collaborators: ["Manager"],
    status: "Work Order Created",
    kind: "workorder",
    description:
      "Work Order is generated with payment terms. Default split is Advance 50% / Dispatch 30% / Progress 10% / Handover 10%. Any change to these terms requires Management approval.",
    fields: [
      { label: "Work Order No.", type: "text", placeholder: "Auto-generated: WO-1042" },
      { label: "Order Value", type: "text", placeholder: "₹" },
    ],
  },
  {
    slug: "order-placed",
    number: 7,
    phase: "order",
    title: "Order Placed",
    role: "Accounts",
    status: "Order Confirmed",
    kind: "form",
    description: "Accounts confirms the order is placed once payment terms are accepted.",
    fields: [
      { label: "Order Placed Date", type: "text", placeholder: "dd/mm/yyyy" },
      { label: "Remarks", type: "textarea" },
    ],
    approval: { question: "Order Placed?", onReject: "Order kept on hold pending confirmation." },
  },
  {
    slug: "material-delivery-challan",
    number: 8,
    phase: "order",
    title: "Material Delivery & Delivery Challan",
    role: "Supervisor / Accounts",
    status: "Material Delivered",
    kind: "delivery",
    description: "A Delivery Challan is created for the materials and quantities delivered to site.",
    fields: [
      { label: "Challan No.", type: "text", placeholder: "Auto-generated: DC-1042" },
      { label: "Delivery Date", type: "text", placeholder: "dd/mm/yyyy" },
    ],
    materialsTable: {
      columns: ["Material", "Quantity", "Unit"],
      seedRows: [
        ["Italian Paint Base Coat", "40", "Litres"],
        ["Texture Finish", "18", "Bags"],
      ],
    },
  },
  {
    slug: "site-readiness-checklist",
    number: 9,
    phase: "execution",
    title: "Daily Site Readiness Checklist",
    role: "Supervisor",
    status: "Site Ready",
    kind: "checklist",
    description:
      "Supervisor checks site readiness daily, submits a checklist with photos and remarks, and selects the approximate start date.",
    checklist: [
      "Surface preparation completed",
      "Site access available for materials & labour",
      "Weather / curing conditions suitable",
      "Electrical / water points available",
      "Adjacent area protected (masking/covering)",
    ],
    fields: [
      { label: "Remark", type: "textarea" },
      { label: "Approx. Start Date", type: "text", placeholder: "dd/mm/yyyy" },
    ],
    upload: { label: "Upload site readiness photos", table: ["Photo", "Area", "Uploaded By", "Date"] },
  },
  {
    slug: "contractor-allocation",
    number: 10,
    phase: "execution",
    title: "Contractor Allocation",
    role: "Supervisor / Manager",
    status: "Contractors Allocated",
    kind: "contractors",
    description:
      "On start, multiple contractors are assigned based on the different material tasks (e.g. Stone Cladding, Texture, Painting), with labour count, tentative finish date and remarks per contractor.",
  },
  {
    slug: "daily-supervision-report",
    number: 11,
    phase: "execution",
    title: "Daily Supervision Report (DSR)",
    role: "Supervisor",
    status: "DSR Updated",
    kind: "dsr",
    description:
      "A DSR is submitted per contractor assigned, capturing site, contractor name, number of labour, current status photos, number of days to complete, and remarks.",
  },
  {
    slug: "final-measurement-closure",
    number: 12,
    phase: "closure",
    title: "Final Measurement, Add-ons & Credit Note",
    role: "Supervisor / Accounts",
    collaborators: ["Manager"],
    status: "Project Closed",
    kind: "closure",
    description:
      "After work completion, final measurement is updated and any add-on work is recorded. If the completed work amount is less than the amount already received, a Credit Note is created for the difference.",
  },
];

export function getStage(slug) {
  return STAGES.find((s) => s.slug === slug);
}

export function getStageIndex(slug) {
  return STAGES.findIndex((s) => s.slug === slug);
}

export function getNextStage(slug) {
  const i = getStageIndex(slug);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export function getPrevStage(slug) {
  const i = getStageIndex(slug);
  return i > 0 ? STAGES[i - 1] : null;
}

// Full 1-12 step process (Lead steps 1-3 + Project execution steps 4-12),
// for role-wise / swimlane views that need the whole picture at once.
export const ALL_STEPS = [...LEAD_STEPS, ...STAGES];

// A stage's `role` field is a "/"-joined string (e.g. "Supervisor / Accounts")
// naming every department that primarily owns that step.
export function ownsStep(step, department) {
  return step.role
    .split("/")
    .map((r) => r.trim())
    .includes(department);
}

export function supportsStep(step, department) {
  return (step.collaborators || []).includes(department) && !ownsStep(step, department);
}

export function stepsOwnedBy(department) {
  return ALL_STEPS.filter((s) => ownsStep(s, department));
}

export function stepsSupportedBy(department) {
  return ALL_STEPS.filter((s) => supportsStep(s, department));
}
