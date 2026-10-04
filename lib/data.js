// Seed / mock data for the clickable wireframe, reflecting Timberstone's
// actual lead-to-handover process (decorative finishes business, not
// furniture) as clarified by the client on 25 Sep 2026.

export const DEPARTMENTS = ["Marketing", "Sales", "Supervisor", "Accounts", "Design", "Manager"];

// Client's physical business branches. Owner/Management can view branch-wise
// data within the same dashboard/panel (no separate logins or role-scoping
// yet — that will be added once the client finalizes role scoping details).
export const BRANCHES = [
  { id: "jaipur", name: "Jaipur", tag: "Head Office" },
  { id: "delhi", name: "Delhi", tag: "Branch" },
];

export function branchName(id) {
  return BRANCHES.find((b) => b.id === id)?.name || "—";
}

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

// Seed departments. Admins can add more from the Team & Departments page;
// the store keeps the live list.
export const SEED_DEPARTMENTS = [
  { id: "marketing", name: "Marketing", head: "Sonal Bhatt", description: "Campaigns, lead sources and initial lead intake." },
  { id: "sales", name: "Sales", head: "Vivek Rane", description: "Call queue, rough estimates, measurement booking and advance payment." },
  { id: "supervisor", name: "Supervisor", head: "Mahesh Choudhary", description: "On-site samples, measurement, site readiness, contractors and DSR." },
  { id: "design", name: "Design", head: "Aditi Saxena", description: "Product codes, JPEG/DWG files and sample approvals." },
  { id: "accounts", name: "Accounts", head: "Rajesh Khandelwal", description: "Work orders, delivery challans, payments and credit notes." },
  { id: "manager", name: "Manager", head: "Rahul Sharma", description: "Approvals, pipeline and closure sign-off." },
];

// Seed team members. Sales reps for the lead form and Call Queue are the
// active members of the Sales department.
export const SEED_TEAM = [
  { id: "TM-1", name: "Rahul Sharma", departmentId: "manager", designation: "General Manager", branch: "jaipur", phone: "+91 98290 10001", email: "rahul@timberstone.in", active: true },
  { id: "TM-2", name: "Vivek Rane", departmentId: "sales", designation: "Sales Lead", branch: "jaipur", phone: "+91 98290 10002", email: "vivek@timberstone.in", active: true },
  { id: "TM-3", name: "Neha Joshi", departmentId: "sales", designation: "Sales Executive", branch: "delhi", phone: "+91 98290 10003", email: "neha@timberstone.in", active: true },
  { id: "TM-4", name: "Sonal Bhatt", departmentId: "marketing", designation: "Marketing Manager", branch: "jaipur", phone: "+91 98290 10004", email: "sonal@timberstone.in", active: true },
  { id: "TM-5", name: "Mahesh Choudhary", departmentId: "supervisor", designation: "Site Supervisor", branch: "jaipur", phone: "+91 98290 10005", email: "mahesh@timberstone.in", active: true },
  { id: "TM-6", name: "Imran Qureshi", departmentId: "supervisor", designation: "Site Supervisor", branch: "delhi", phone: "+91 98290 10006", email: "imran@timberstone.in", active: true },
  { id: "TM-7", name: "Aditi Saxena", departmentId: "design", designation: "Designer", branch: "jaipur", phone: "+91 98290 10007", email: "aditi@timberstone.in", active: true },
  { id: "TM-8", name: "Rajesh Khandelwal", departmentId: "accounts", designation: "Accounts Executive", branch: "jaipur", phone: "+91 98290 10008", email: "rajesh@timberstone.in", active: true },
];

// Seed architects the business works with. Placeholder names until the
// client shares their actual architect list; more can be added from the
// Architects page.
export const SEED_ARCHITECTS = [
  { id: "AR-1", name: "Rahul Mehta", firm: "Mehta Design Studio", city: "Jaipur", branch: "jaipur", phone: "+91 94140 20001", email: "rahul@mehtadesign.in", active: true },
  { id: "AR-2", name: "Sneha Kapoor", firm: "SK Architects", city: "New Delhi", branch: "delhi", phone: "+91 94140 20002", email: "sneha@skarchitects.in", active: true },
  { id: "AR-3", name: "Vikram Singh", firm: "Urban Forms", city: "Jaipur", branch: "jaipur", phone: "+91 94140 20003", email: "vikram@urbanforms.in", active: true },
  { id: "AR-4", name: "Pooja Sharma", firm: "Studio Pooja", city: "Gurugram", branch: "delhi", phone: "+91 94140 20004", email: "pooja@studiopooja.in", active: true },
];

// The value stored on a lead's "architect" field.
export function architectLabel(a) {
  return `Ar. ${a.name} — ${a.firm}`;
}

// Lead statuses that keep a lead in the sales call queue. Anything else
// (Booked, Lost, Dead, …) has left the calling stage.
export const QUEUE_STATUSES = ["Prospect", "Followup", "Contact in Future", "DNP"];

// Call outcomes a rep logs after each call. Each maps onto the client's
// lead-status vocabulary, so logging a call also moves the lead's status.
export const CALL_OUTCOMES = [
  { id: "interested", label: "Interested — Follow up", status: "Followup", connected: true, callback: true },
  { id: "dnp", label: "Did Not Pick (DNP)", status: "DNP", connected: false, callback: true },
  { id: "future", label: "Contact in Future", status: "Contact in Future", connected: true, callback: true },
  { id: "not-serviceable", label: "Not Serviceable", status: "Not Serviceable", connected: true, callback: false },
  { id: "lost", label: "Not Interested / Lost", status: "Lost", connected: true, callback: false },
  { id: "invalid", label: "Wrong / Invalid Number", status: "Dead", connected: false, callback: false },
];

export const CALLBACK_SLOTS = ["Today 17:30", "Tomorrow 11:00", "In 3 days", "Next week"];

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
    branch: "jaipur",
    source: "Website Enquiry",
    phone: "+91 98765 43210",
    email: "ankit.verma@example.com",
    projectRef: "Exterior Wall — Italian Paints",
    productTypes: ["Italian Paints", "Texture"],
    designRequired: true,
    architect: "",
    assignedRep: "Vivek Rane",
    callAttempts: 3,
    nextCallback: null,
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
    branch: "delhi",
    source: "Referral",
    phone: "+91 90000 11223",
    email: "priya.nair@example.com",
    projectRef: "Retail Showroom — Stone Cladding",
    productTypes: ["Stones", "Stamping"],
    designRequired: false,
    architect: "Ar. Sneha Kapoor — SK Architects",
    assignedRep: "Neha Joshi",
    callAttempts: 2,
    nextCallback: "Today 16:00",
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
    branch: "jaipur",
    source: "Site Visit",
    phone: "+91 98220 55667",
    email: "sanjay.kulkarni@example.com",
    projectRef: "Boundary Wall — Nano Topping",
    productTypes: ["Nano Topping", "Stamping"],
    designRequired: false,
    architect: "",
    assignedRep: "Vivek Rane",
    callAttempts: 4,
    nextCallback: null,
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
  ...[
    ["LD-1004", "Rakesh Agarwal", "Agarwal Villa", "jaipur", "Social Media", "Prospect", "Vivek Rane", 0, null, ["Texture"], "Today", "Saw Instagram reel on texture walls."],
    ["LD-1005", "Farah Khan", "Khan Apartments", "delhi", "Website Enquiry", "DNP", "Neha Joshi", 1, "Overdue · Yesterday 18:00", ["Italian Paints"], "02 Oct 2026", "Did not pick first call."],
    ["LD-1006", "Mohit Jain", "Jain Farmhouse", "jaipur", "Architect Reference", "Followup", "Vivek Rane", 2, "Today 17:30", ["Stones", "Stamping"], "28 Sep 2026", "Architect wants stone cladding options for the porch."],
    ["LD-1007", "Kavita Rao", "Rao Clinic", "delhi", "Exhibition", "Contact in Future", "Neha Joshi", 1, "Next week", ["Nano Topping"], "26 Sep 2026", "Renovation planned after Diwali."],
    ["LD-1008", "Deepak Saini", "Saini House", "jaipur", "Walk-in", "Prospect", "Vivek Rane", 0, null, ["Stamping"], "Today", "Walked into Jaipur showroom, wants driveway stamping."],
    ["LD-1009", "Anil Gupta", "Gupta Residence", "jaipur", "Referral", "Followup", "Vivek Rane", 1, "Tomorrow 11:00", ["Italian Paints", "Texture"], "30 Sep 2026", "Asked for a rough estimate on WhatsApp."],
    ["LD-1010", "Ritu Malhotra", "Malhotra Penthouse", "delhi", "Referral", "Prospect", "Neha Joshi", 0, null, ["Texture"], "Today", ""],
    ["LD-1011", "Suresh Yadav", "Yadav Builders Site", "jaipur", "Builder Reference", "DNP", "Vivek Rane", 2, "Overdue · Yesterday 12:00", ["Stamping", "Nano Topping"], "29 Sep 2026", "Two attempts, no answer."],
  ].map(([id, name, company, branch, source, status, assignedRep, callAttempts, nextCallback, productTypes, createdAt, notes]) => ({
    id,
    name,
    company,
    branch,
    source,
    phone: "+91 9" + id.slice(3).padStart(4, "0") + " 4" + id.slice(-4),
    email: "",
    projectRef: "",
    productTypes,
    designRequired: null,
    architect: source === "Architect Reference" ? "Ar. Rahul Mehta — Mehta Design Studio" : "",
    assignedRep,
    callAttempts,
    nextCallback,
    status,
    createdAt,
    notes,
    roughEstimate: "",
    measurementRequired: null,
    advancePayment: null,
    salesOperator: null,
  })),
];

// Calls already logged today before the demo session starts.
export const SEED_CALL_LOGS = [
  { id: "CL-1", leadId: "LD-1009", leadName: "Anil Gupta", rep: "Vivek Rane", date: "Today", time: "10:05", outcome: "Interested — Follow up", connected: true, nextCallback: "Tomorrow 11:00" },
  { id: "CL-2", leadId: "LD-1011", leadName: "Suresh Yadav", rep: "Vivek Rane", date: "Today", time: "10:20", outcome: "Did Not Pick (DNP)", connected: false, nextCallback: "Today 17:30" },
  { id: "CL-3", leadId: "LD-1001", leadName: "Ankit Verma", rep: "Vivek Rane", date: "Today", time: "11:40", outcome: "Interested — Follow up", connected: true, nextCallback: null },
  { id: "CL-4", leadId: "LD-1007", leadName: "Kavita Rao", rep: "Neha Joshi", date: "Today", time: "10:30", outcome: "Contact in Future", connected: true, nextCallback: "Next week" },
];

export const SEED_PROJECTS = [
  {
    id: "PRJ-2031",
    leadId: "LD-1003",
    customer: "Sanjay & Meera Kulkarni",
    branch: "jaipur",
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
    branch: "delhi",
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
    branch: "jaipur",
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

// Kept for backward compatibility with the Roles reference page.
export const ROLES = DEPARTMENTS;
