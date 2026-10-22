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

// Site Settings sample values, one entry per settings group (stand-in for
// GET /api/admin/settings/:group until that API exists).
export const SEED_SETTINGS = {
  general: {
    values: {
      company_name: "Timberstone Interiors Pvt. Ltd.",
      app_name: "Timberstone ERP",
      support_email: "support@timberstone.in",
      support_phone: "+91 98290 00000",
      gstin: "08AABCT1234F1Z5",
      website_url: "https://timberstone.in",
      address: "Plot 12, Malviya Industrial Area, Jaipur, Rajasthan 302017",
      timezone: "Asia/Kolkata",
      date_format: "DD/MM/YYYY",
      currency: "INR (₹)",
    },
    updated_at: "2026-10-20T11:42:00+05:30",
    updated_by: "Super Admin",
  },
  email: {
    values: {
      smtp_host: "smtp.gmail.com",
      smtp_port: 587,
      smtp_encryption: "TLS (STARTTLS)",
      smtp_user: "no-reply@timberstone.in",
      smtp_password: "",
      mail_from_name: "Timberstone ERP",
      mail_from_address: "no-reply@timberstone.in",
      mail_reply_to: "support@timberstone.in",
    },
    secrets_set: { smtp_password: true },
    updated_at: "2026-10-18T16:05:00+05:30",
    updated_by: "Super Admin",
  },
  notifications: {
    values: {
      notify_password_reset: true,
      notify_welcome: true,
      notify_lead_assigned: true,
      notify_design_request: false,
      notify_payment_approval: true,
      notify_bcc: "",
    },
    updated_at: null,
    updated_by: null,
  },
  whatsapp: {
    values: {
      wa_enabled: true,
      wa_phone_number_id: "301245678912345",
      wa_access_token: "",
      wa_app_secret: "",
      wa_webhook_verify_token: "",
      wa_tpl_lead_created_on: true,
      wa_tpl_lead_created_name: "lead_thank_you",
      wa_tpl_lead_created_lang: "en",
      wa_tpl_lead_assigned_on: true,
      wa_tpl_lead_assigned_name: "new_lead_assigned",
      wa_tpl_lead_assigned_lang: "en",
      wa_tpl_measurement_booked_on: true,
      wa_tpl_measurement_booked_name: "measurement_confirmed",
      wa_tpl_measurement_booked_lang: "en",
      wa_tpl_payment_received_on: false,
      wa_tpl_payment_received_name: "",
      wa_tpl_payment_received_lang: "en",
      wa_tpl_design_ready_on: false,
      wa_tpl_design_ready_name: "",
      wa_tpl_design_ready_lang: "en",
      wa_tpl_callback_reminder_on: true,
      wa_tpl_callback_reminder_name: "callback_reminder",
      wa_tpl_callback_reminder_lang: "hi",
    },
    secrets_set: { wa_access_token: true, wa_app_secret: false, wa_webhook_verify_token: true },
    // Read from Meta by the API with the saved Phone Number ID (read-only).
    connected: { phone: "+91 98290 00000", name: "Timberstone Interiors" },
    updated_at: "2026-10-21T10:15:00+05:30",
    updated_by: "Super Admin",
  },
  integrations: {
    values: {
      meta_enabled: true,
      meta_page_id: "104578921133456",
      meta_graph_api_version: "v21.0",
      meta_page_access_token: "",
    },
    secrets_set: { meta_page_access_token: true },
    updated_at: "2026-10-12T09:30:00+05:30",
    updated_by: "Super Admin",
  },
  security: {
    values: {
      login_rate_limit_max: 5,
      session_days: 7,
      password_reset_expiry_min: 30,
      password_reset_rate_limit_max: 5,
      max_upload_size_mb: 10,
      allowed_extensions: ".jpg, .jpeg, .png, .pdf, .dwg",
    },
    updated_at: null,
    updated_by: null,
  },
};

// Country codes for the Site Settings test-message number (stand-in for the API's
// country_codes until /settings/master exists).
export const SEED_COUNTRY_CODES = [
  { value: "+91", iso: "IN", label: "India" },
  { value: "+971", iso: "AE", label: "United Arab Emirates" },
  { value: "+1", iso: "US", label: "United States" },
];
