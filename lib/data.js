// Seed / mock data for the clickable wireframe, reflecting Timberstone's
// actual lead-to-handover process (decorative finishes business, not
// furniture) as clarified by the client on 25 Sep 2026.

export const DEPARTMENTS = ["Marketing", "Sales", "Supervisor", "Accounts", "Design", "Manager"];

export const PRODUCT_TYPES = ["Italian Paints", "Stones", "Stamping", "Nano Topping", "Texture"];

// Exact lead-status vocabulary provided by the client.
export const LEAD_STATUSES = [
  "Prospect",
  "Followup",
  "Contact in Future",
  "DNP",
  "Conducted",
  "Booked",
  "Not Serviceable",
  "Duplicate Lead",
  "Dead",
  "Lost",
  "Arch",
  "Builder",
];

export const LEAD_SOURCES = [
  "Website Enquiry",
  "Marketing Campaign",
  "Referral",
  "Social Media",
  "Walk-in",
  "Architect Reference",
  "Builder Reference",
  "Exhibition",
];

export const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"];

export const DEFAULT_PAYMENT_TERMS = {
  advance: 50,
  dispatch: 30,
  progress: 10,
  handover: 10,
};

export const SEED_LEADS = [
  {
    id: "LD-1001",
    name: "Ankit Verma",
    company: "Verma Residence",
    source: "Website Enquiry",
    phone: "+91 98765 43210",
    email: "ankit.verma@example.com",
    projectRef: "Exterior Wall — Italian Paints",
    productTypes: ["Italian Paints", "Texture"],
    estCost: "₹6,50,000",
    status: "Conducted",
    createdAt: "10 Sep 2026",
    notes: "Interested in exterior facade finish. Rough estimate given on call.",
    roughEstimate: "₹5,80,000",
    measurementRequired: null,
    advancePayment: null,
    salesOperator: null,
  },
  {
    id: "LD-1002",
    name: "Priya Nair",
    company: "Nair Interiors Retail",
    source: "Referral",
    phone: "+91 90000 11223",
    email: "priya.nair@example.com",
    projectRef: "Retail Showroom — Stone Cladding",
    productTypes: ["Stones", "Stamping"],
    estCost: "₹12,00,000",
    status: "Followup",
    createdAt: "20 Sep 2026",
    notes: "Referred by existing customer. First call done, awaiting site visit.",
    roughEstimate: "₹11,00,000",
    measurementRequired: null,
    advancePayment: null,
    salesOperator: null,
  },
  {
    id: "LD-1003",
    name: "Sanjay & Meera Kulkarni",
    company: "Kulkarni Residence",
    source: "Site Visit",
    phone: "+91 98220 55667",
    email: "sanjay.kulkarni@example.com",
    projectRef: "Boundary Wall — Nano Topping",
    productTypes: ["Nano Topping", "Stamping"],
    estCost: "₹4,80,000",
    status: "Booked",
    createdAt: "01 Sep 2026",
    notes: "Measurement booked, advance received — see Project PRJ-2031.",
    roughEstimate: "₹4,60,000",
    measurementRequired: true,
    advancePayment: "₹50,000",
    salesOperator: "Vivek Rane",
    convertedProjectId: "PRJ-2031",
  },
];

export const SEED_PROJECTS = [
  {
    id: "PRJ-2031",
    leadId: "LD-1003",
    customer: "Sanjay & Meera Kulkarni",
    projectName: "Kulkarni Residence — Boundary Wall Nano Topping",
    productTypes: ["Nano Topping", "Stamping"],
    salesOperator: "Vivek Rane",
    value: "₹4,60,000",
    createdAt: "03 Sep 2026",
    currentStageSlug: "daily-supervision-report",
  },
  {
    id: "PRJ-2032",
    leadId: null,
    customer: "Rohan Deshpande",
    projectName: "Deshpande Bungalow — Full Exterior Stamping + Texture",
    productTypes: ["Stamping", "Texture"],
    salesOperator: "Neha Joshi",
    value: "₹18,40,000",
    createdAt: "22 Aug 2026",
    currentStageSlug: "site-readiness-checklist",
  },
  {
    id: "PRJ-2033",
    leadId: null,
    customer: "Timberstone Corporate Office",
    projectName: "Office Facade — Italian Paints",
    productTypes: ["Italian Paints"],
    salesOperator: "Vivek Rane",
    value: "₹9,25,000",
    createdAt: "05 Aug 2026",
    currentStageSlug: "final-measurement-closure",
  },
];

export const NOTIFICATIONS = [
  { text: "New lead created: Priya Nair (LD-1002)", when: "2h ago" },
  { text: "Sample approval pending — PRJ-2032", when: "5h ago" },
  { text: "Work Order payment terms changed — Management approval pending (PRJ-2032)", when: "8h ago" },
  { text: "DSR not submitted for PRJ-2032 (yesterday)", when: "1d ago" },
  { text: "Credit note pending approval — PRJ-2033", when: "2d ago" },
];

export const DASHBOARD_STAGE_COUNTS = [
  { phase: "Lead & Estimate (Sales)", count: 5 },
  { phase: "Design & Measurement (Supervisor)", count: 4 },
  { phase: "Order & Delivery (Accounts)", count: 3 },
  { phase: "Site Execution (Supervisor)", count: 5 },
  { phase: "Closure (Accounts / Manager)", count: 2 },
];

// Kept for backward compatibility with the Roles reference page.
export const ROLES = DEPARTMENTS;
