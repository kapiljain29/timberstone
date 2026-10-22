"use client";

import { useState } from "react";
import { Alert, Annotation, Badge, Box, DataTable, FieldError, PhoneField, TabBar } from "@/components/ui";
import FileDropBox from "@/components/FileDropBox";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "@/components/Toast";
import { SEED_COUNTRY_CODES, SEED_SETTINGS } from "@/lib/data";
import { formatDateTime } from "@/lib/format";

// Site Settings (Super Admin) — WIREFRAME ONLY, not wired to the API yet.
// Each tab is one settings group = one form = one API call:
//   GET  /api/admin/settings/:group      → { values, updated_at, updated_by }
//   PUT  /api/admin/settings/:group      → saves the group's fields
//   POST /api/admin/settings/email/test     → sends a test email with the saved SMTP
//   POST /api/admin/settings/whatsapp/test  → sends a test WhatsApp message (hello_world template)
// Secrets (SMTP password, tokens) never come back from the API — only
// whether one is set; a blank secret field on save keeps the stored one.
// Until a value is saved here the API falls back to its .env value.

const TABS = [
  { value: "general", label: "General" },
  { value: "email", label: "Email (SMTP)" },
  { value: "notifications", label: "Email Notifications" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "integrations", label: "Integrations" },
  { value: "security", label: "Security & Uploads" },
];

// Field: { key, label, type, required?, options?, hint?, full?, secret? }
// type: text | email | url | number | select | textarea | password | toggle
// Section: { title, fields?, toggle? (its own on/off), dependsOn? (hidden while
// that toggle is off), webhook?, templates?, branding? }
// Group: { sections, status?({ values, secrets_set, connected }) → { ok, text }, test? }
const GROUPS = {
  general: {
    sections: [
      {
        title: "Company Details",
        fields: [
          { key: "company_name", label: "Company Name", type: "text", required: true },
          { key: "app_name", label: "Application Name", type: "text", required: true, hint: "Shown in the panel header, emails and the browser tab." },
          { key: "support_email", label: "Support Email", type: "email" },
          { key: "support_phone", label: "Support Phone", type: "tel" },
          { key: "gstin", label: "GSTIN", type: "text" },
          { key: "website_url", label: "Website", type: "url" },
          { key: "address", label: "Registered Address", type: "textarea", full: true },
        ],
      },
      {
        title: "Regional",
        fields: [
          { key: "timezone", label: "Time Zone", type: "select", required: true, options: ["Asia/Kolkata", "Asia/Dubai", "UTC"] },
          { key: "date_format", label: "Date Format", type: "select", required: true, options: ["DD/MM/YYYY", "DD-MMM-YYYY", "YYYY-MM-DD"] },
          { key: "currency", label: "Currency", type: "select", required: true, options: ["INR (₹)", "USD ($)", "AED (د.إ)"] },
        ],
      },
      { title: "Branding", branding: true },
    ],
  },
  email: {
    status: ({ values: v, secrets_set: secrets = {} }) =>
      v.smtp_host && v.mail_from_address
        ? { ok: true, text: `Emails go out through ${v.smtp_host}:${v.smtp_port}${secrets.smtp_password ? " (password saved)" : ""}.` }
        : { ok: false, text: "Password-reset and notification emails can't be sent until SMTP is set up." },
    test: { kind: "email", label: "Send a Test Email To", button: "Send Test Email" },
    sections: [
      {
        title: "SMTP Server",
        fields: [
          { key: "smtp_host", label: "SMTP Host", type: "text", required: true, hint: "e.g. smtp.gmail.com, email-smtp.ap-south-1.amazonaws.com" },
          { key: "smtp_port", label: "Port", type: "number", required: true, hint: "587 for TLS, 465 for SSL." },
          { key: "smtp_encryption", label: "Encryption", type: "select", required: true, options: ["TLS (STARTTLS)", "SSL", "None"] },
          { key: "smtp_user", label: "Username", type: "text" },
          { key: "smtp_password", label: "Password", type: "password", secret: true },
        ],
      },
      {
        title: "Sender",
        fields: [
          { key: "mail_from_name", label: "From Name", type: "text", required: true },
          { key: "mail_from_address", label: "From Email", type: "email", required: true },
          { key: "mail_reply_to", label: "Reply-To Email", type: "email" },
        ],
      },
    ],
  },
  notifications: {
    sections: [
      {
        title: "Send an email when…",
        fields: [
          { key: "notify_password_reset", label: "Someone asks to reset their password (always on)", type: "toggle", locked: true },
          { key: "notify_welcome", label: "A new team member is added — welcome email with sign-in link", type: "toggle" },
          { key: "notify_lead_assigned", label: "A lead is assigned to a team member", type: "toggle" },
          { key: "notify_design_request", label: "A design request is raised or commented on", type: "toggle" },
          { key: "notify_payment_approval", label: "Payment terms / credit notes are waiting for approval", type: "toggle" },
        ],
      },
      {
        title: "Copies",
        fields: [
          { key: "notify_bcc", label: "BCC Every Email To", type: "email", hint: "Optional — e.g. an audit mailbox.", full: true },
        ],
      },
    ],
  },
  whatsapp: {
    // `connected` = the number and display name the API reads from Meta
    // with the saved Phone Number ID — set up on Meta, never typed in here.
    status: ({ values: v, connected }) =>
      !v.wa_enabled
        ? { ok: false, text: "WhatsApp is turned off — no messages are sent." }
        : connected
          ? { ok: true, text: `Messages go out from ${connected.phone} (${connected.name}), as set up in Meta Business Manager.` }
          : { ok: false, text: "Add the Phone Number ID and Access Token to start sending messages." },
    test: { kind: "phone", label: "Send a Test Message To", button: "Send Test Message" },
    sections: [
      {
        title: "WhatsApp Business API (Meta Cloud API)",
        toggle: "wa_enabled",
        fields: [
          { key: "wa_phone_number_id", label: "Phone Number ID", type: "text", required: true, hint: "Meta App → WhatsApp → API Setup." },
          { key: "wa_access_token", label: "Permanent Access Token", type: "password", secret: true, required: true, hint: "System User token with whatsapp_business_messaging permission." },
          { key: "wa_app_secret", label: "App Secret", type: "password", secret: true, hint: "Used to check that incoming webhooks really come from Meta." },
        ],
      },
      {
        // Not tied to the WhatsApp switch: Meta Lead Ads needs the same token.
        title: "Webhook (WhatsApp & Meta Lead Ads)",
        webhook: true,
        fields: [
          { key: "wa_webhook_verify_token", label: "Webhook Verify Token", type: "password", secret: true, required: true, full: true, hint: "Shared with Meta Lead Ads — both use the same webhook URL." },
        ],
      },
      {
        title: "Send a WhatsApp message when…",
        dependsOn: "wa_enabled",
        templates: [
          { key: "lead_created", label: "A new lead is created", to: "Customer" },
          { key: "lead_assigned", label: "A lead is assigned", to: "Salesperson" },
          { key: "measurement_booked", label: "Measurement is booked", to: "Customer" },
          { key: "payment_received", label: "A payment is received", to: "Customer" },
          { key: "design_ready", label: "A design is ready for review", to: "Customer" },
          { key: "callback_reminder", label: "A callback is due", to: "Salesperson" },
        ],
      },
    ],
  },
  integrations: {
    sections: [
      {
        title: "Meta Lead Ads (Facebook / Instagram)",
        toggle: "meta_enabled",
        fields: [
          { key: "meta_page_id", label: "Page ID", type: "text", required: true },
          { key: "meta_graph_api_version", label: "Graph API Version", type: "text", required: true, hint: "e.g. v21.0" },
          { key: "meta_page_access_token", label: "Page Access Token", type: "password", secret: true, required: true, full: true },
        ],
      },
    ],
  },
  security: {
    sections: [
      {
        title: "Sign-in & Sessions",
        fields: [
          { key: "login_rate_limit_max", label: "Failed Sign-ins Before Lockout", type: "number", required: true, hint: "Per IP, per 15 minutes." },
          { key: "session_days", label: "Stay Signed In For (days)", type: "number", required: true },
          { key: "password_reset_expiry_min", label: "Reset Link Expires After (minutes)", type: "number", required: true },
          { key: "password_reset_rate_limit_max", label: "Reset Requests Allowed", type: "number", required: true, hint: "Per email, per hour." },
        ],
      },
      {
        title: "File Uploads",
        fields: [
          { key: "max_upload_size_mb", label: "Max File Size (MB)", type: "number", required: true },
          { key: "allowed_extensions", label: "Allowed File Types", type: "text", required: true, hint: "Comma-separated, e.g. .jpg, .png, .pdf, .dwg" },
        ],
      },
    ],
  },
};

// Meta Lead Ads and WhatsApp both post to this one endpoint.
const WEBHOOK_URL = "https://api.timberstone.in/api/public/webhook";

const NOTES = {
  email: "Saved SMTP values replace SMTP_* in .env; until something is saved here the API keeps using .env. Password is write-only.",
  whatsapp:
    "Number, display name and templates are set up in Meta Business Manager — here we only keep what our API needs to call Meta (Phone Number ID, tokens) and which approved template each event sends. Tokens are write-only; the verify token replaces WA_WEBHOOK_VERIFY_TOKEN in .env, and the Graph API version stays in .env.",
};

export default function SiteSettingsPage() {
  const [tab, setTab] = useState("general");
  const [saved, setSaved] = useState(SEED_SETTINGS);
  const [form, setForm] = useState(SEED_SETTINGS.general.values);
  const [logo, setLogo] = useState([]);
  const [favicon, setFavicon] = useState([]);
  const [confirm, dialog] = useConfirm();

  const group = GROUPS[tab];
  const current = saved[tab];
  const dirty = JSON.stringify(form) !== JSON.stringify(current.values) || logo.length > 0 || favicon.length > 0;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset(nextTab = tab) {
    setForm(saved[nextTab].values);
    setLogo([]);
    setFavicon([]);
  }

  async function changeTab(next) {
    if (next === tab) return;
    if (
      dirty &&
      !(await confirm({
        title: `Discard changes to ${TABS.find((t) => t.value === tab).label}?`,
        message: "You have unsaved changes on this tab. Leaving it will lose them.",
        confirmLabel: "Discard",
      }))
    )
      return;
    setTab(next);
    reset(next);
  }

  function handleSubmit(e) {
    e.preventDefault();
    // Wireframe: PUT /api/admin/settings/:group goes here.
    setSaved((s) => ({
      ...s,
      [tab]: { ...s[tab], values: form, updated_at: new Date().toISOString(), updated_by: "You" },
    }));
    setLogo([]);
    setFavicon([]);
    toast.success("Settings saved successfully");
  }

  async function regenerateToken(key) {
    if (
      !(await confirm({
        title: "Regenerate the webhook verify token?",
        message:
          "The old token stops working once you save. Update it in the Meta app's webhook settings, or Meta Lead Ads and WhatsApp webhooks will be rejected.",
        confirmLabel: "Regenerate",
      }))
    )
      return;
    set(key, Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
  }

  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <h1 className="wf-h1">Site Settings</h1>
      <p className="wf-sub">Company details, outgoing email, WhatsApp, notifications, integrations and security limits.</p>

      <TabBar tabs={TABS} value={tab} onChange={changeTab} label="Settings group" />

      <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 880 }}>
        {group.status && <StatusBanner {...group.status(current)} />}

        {group.sections.map((section, i) => {
          const last = i === group.sections.length - 1;
          const enabled = !!form[section.toggle || section.dependsOn] || !(section.toggle || section.dependsOn);
          return (
            <Box
              key={section.title}
              title={section.title}
              right={
                section.toggle ? (
                  <label className="wf-check-option" style={{ margin: 0 }}>
                    <input type="checkbox" checked={!!form[section.toggle]} onChange={(e) => set(section.toggle, e.target.checked)} />
                    Enabled
                  </label>
                ) : null
              }
            >
              {section.branding ? (
                <div className="wf-grid wf-grid-2">
                  <div className="wf-field">
                    <label htmlFor="settings-logo">Logo</label>
                    <FileDropBox id="settings-logo" label="PNG or SVG, max 1 MB" extensions={[".png", ".svg"]} multiple={false} files={logo} onChange={setLogo} />
                  </div>
                  <div className="wf-field">
                    <label htmlFor="settings-favicon">Favicon</label>
                    <FileDropBox id="settings-favicon" label="ICO or PNG, 64×64" extensions={[".ico", ".png"]} multiple={false} files={favicon} onChange={setFavicon} />
                  </div>
                </div>
              ) : section.templates ? (
                enabled && <TemplateTable templates={section.templates} values={form} onChange={set} />
              ) : (
                enabled && (
                  <SettingsFields
                    fields={section.fields}
                    values={form}
                    secretsSet={current.secrets_set || {}}
                    onChange={set}
                  />
                )
              )}

              {section.webhook && enabled && (
                <div className="wf-grid wf-grid-2">
                  <div className="wf-field">
                    <label htmlFor="settings-webhook-url">Callback URL</label>
                    <input id="settings-webhook-url" className="wf-input" readOnly value={WEBHOOK_URL} />
                    <p className="wf-login-field-hint">Paste this into the Meta app&apos;s webhook settings and subscribe to &quot;messages&quot;.</p>
                  </div>
                  <div className="wf-field" style={{ alignSelf: "end" }}>
                    <button type="button" className="wf-btn" onClick={() => regenerateToken("wa_webhook_verify_token")}>
                      Regenerate Verify Token
                    </button>
                  </div>
                </div>
              )}

              {!enabled && (
                <p className="wf-login-field-hint">
                  {section.dependsOn ? "Turn WhatsApp on above to set this up." : "Turned off — nothing is sent or received for this integration."}
                </p>
              )}

              {last && (
                <>
                  {group.test && enabled && <TestSend key={tab} {...group.test} />}
                  <Annotation>{NOTES[tab] || `One PUT /api/admin/settings/${tab} saves this tab. Super Admin only (PANEL_ACCESS false) until a settings.edit permission is added.`}</Annotation>
                  {current.updated_at && (
                    <p className="wf-login-field-hint">
                      Last saved {formatDateTime(current.updated_at)} by {current.updated_by}
                    </p>
                  )}
                  <div className="wf-actions-end">
                    <button type="button" className="wf-btn" onClick={() => reset()} disabled={!dirty}>
                      Cancel
                    </button>
                    <button type="submit" className="wf-btn primary">
                      Save Changes
                    </button>
                  </div>
                </>
              )}
            </Box>
          );
        })}
      </form>
      {dialog}
    </div>
  );
}

// Renders a settings section's fields in a 2-column grid; `full` fields
// and toggles take a whole row.
function SettingsFields({ fields, values, secretsSet, onChange, errors = {} }) {
  const toggles = fields.filter((f) => f.type === "toggle");
  const inputs = fields.filter((f) => f.type !== "toggle");

  return (
    <>
      {toggles.map((f) => (
        <label key={f.key} className="wf-check-option">
          <input type="checkbox" checked={!!values[f.key]} disabled={f.locked} onChange={(e) => onChange(f.key, e.target.checked)} />
          {f.label}
        </label>
      ))}
      {inputs.length > 0 && (
        <div className="wf-grid wf-grid-2">
          {inputs.map((f) => {
            const id = `settings-${f.key}`;
            // A stored secret is never sent back, so it's not required again.
            const required = f.required && !(f.secret && secretsSet[f.key]);
            const hint = f.secret && secretsSet[f.key] ? "Saved — leave blank to keep the current value." : f.hint;
            const props = {
              id,
              required,
              className: "wf-input",
              value: values[f.key] ?? "",
              onChange: (e) => onChange(f.key, e.target.value),
            };
            return (
              <div key={f.key} className="wf-field" style={f.full || f.type === "textarea" ? { gridColumn: "1 / -1" } : undefined}>
                <label htmlFor={id}>{f.label}</label>
                {f.type === "select" ? (
                  <select {...props}>
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea {...props} rows={3} />
                ) : (
                  <input
                    {...props}
                    type={f.type}
                    autoComplete={f.secret ? "new-password" : "off"}
                    placeholder={f.secret && secretsSet[f.key] ? "••••••••" : undefined}
                  />
                )}
                {hint && !errors[f.key] && <p className="wf-login-field-hint">{hint}</p>}
                <FieldError>{errors[f.key]}</FieldError>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function StatusBanner({ ok, text }) {
  return (
    <Alert tone="info">
      <Badge tone={ok ? "done" : "pending"}>{ok ? "Configured" : "Not configured"}</Badge> {text}
    </Alert>
  );
}

// WhatsApp templates per event: on/off, approved template name, language.
// Values: wa_tpl_<key>_on, wa_tpl_<key>_name, wa_tpl_<key>_lang.
function TemplateTable({ templates, values, onChange }) {
  const v = (key, part) => values[`wa_tpl_${key}_${part}`];
  return (
    <DataTable
      columns={["Event", "Sent To", "Template Name", "Language"]}
      rows={templates.map((t) => {
        const on = !!v(t.key, "on");
        return [
          <label key="on" className="wf-check-option" style={{ margin: 0 }}>
            <input type="checkbox" checked={on} onChange={(e) => onChange(`wa_tpl_${t.key}_on`, e.target.checked)} />
            {t.label}
          </label>,
          t.to,
          <input
            key="name"
            className="wf-input"
            aria-label={`${t.label} — template name`}
            value={v(t.key, "name") ?? ""}
            disabled={!on}
            placeholder="approved_template_name"
            onChange={(e) => onChange(`wa_tpl_${t.key}_name`, e.target.value)}
          />,
          <select
            key="lang"
            className="wf-select"
            aria-label={`${t.label} — language`}
            value={v(t.key, "lang") ?? "en"}
            disabled={!on}
            onChange={(e) => onChange(`wa_tpl_${t.key}_lang`, e.target.value)}
          >
            {["en", "en_US", "hi"].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>,
        ];
      })}
    />
  );
}

// Sends a test email / WhatsApp message with the SAVED settings (save
// first, then test). kind: "email" | "phone".
function TestSend({ kind, label, button }) {
  const [to, setTo] = useState("");
  const [code, setCode] = useState("");
  const target = kind === "phone" ? `${code || SEED_COUNTRY_CODES[0].value} ${to}` : to;
  return (
    <div className="wf-grid wf-grid-2">
      {kind === "phone" ? (
        <PhoneField id="settings-test-to" label={label} countryCodes={SEED_COUNTRY_CODES} code={code} number={to} onCodeChange={setCode} onNumberChange={setTo} />
      ) : (
        <div className="wf-field">
          <label htmlFor="settings-test-to">{label}</label>
          <input id="settings-test-to" className="wf-input" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
          <p className="wf-login-field-hint">Uses the saved settings — save your changes first.</p>
        </div>
      )}
      <div className="wf-field" style={{ alignSelf: "center" }}>
        <button
          type="button"
          className="wf-btn"
          onClick={() => (to ? toast.success(`Test sent to ${target}`) : toast.error(`Enter ${kind === "phone" ? "a number" : "an email address"} to send the test to`))}
        >
          {button}
        </button>
      </div>
    </div>
  );
}
