"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Box, DataTable, FieldError, LoadError, PhoneField, TabBar } from "@/components/ui";
import FileDropBox from "@/components/FileDropBox";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDateTime } from "@/lib/format";
import { useCan } from "@/lib/roles";
import { SETTINGS_API, useSettingsMaster } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

// Site Settings — one tab per settings group (POST /api/admin/settings/
// details { group }), each saved on its own (/update). Every value shown is
// the one in use: saved here, else the server's .env, else its default
// (`sources` says which). Secrets are never sent back: their field starts
// blank, and blank on save keeps the stored one. Option lists come from
// /settings/master. Needs settings.view; editing needs settings.edit.

// Layout of each tab (UI copy only — values, rules and options come from
// the API). Field: { key, label, type, required?, requiredWhen? (a toggle
// in the same tab), secret?, options? (/master list), hint?, full? }
// type: text | email | url | number | select | textarea | password |
// toggle | phone. Section: { title, fields?, toggle? (its on/off switch,
// with onMessage / offMessage for the confirm), dependsOn?, webhook?,
// templates?, branding?, note? }. Tab: { sections, status?(data), test? }.
const GROUPS = {
  general: {
    sections: [
      {
        title: "Company Details",
        fields: [
          { key: "company_name", label: "Company Name", type: "text", required: true },
          { key: "app_name", label: "Application Name", type: "text", required: true, hint: "Used in emails sent by the system." },
          { key: "support_email", label: "Support Email", type: "email" },
          { key: "support_phone", label: "Support Phone", type: "phone" },
          { key: "gstin", label: "GSTIN", type: "text" },
          { key: "website_url", label: "Website", type: "url" },
          { key: "address", label: "Registered Address", type: "textarea", full: true },
        ],
      },
      {
        title: "Regional",
        fields: [
          { key: "timezone", label: "Time Zone", type: "select", required: true, options: "timezones" },
          { key: "date_format", label: "Date Format", type: "select", required: true, options: "date_formats" },
          { key: "currency", label: "Currency", type: "select", required: true, options: "currencies" },
        ],
      },
      { title: "Branding", branding: true },
    ],
  },
  email: {
    status: ({ values: v, sources }) =>
      v.smtp_host && v.mail_from_address
        ? { ok: true, text: `Emails go out through ${v.smtp_host}:${v.smtp_port}${sources.smtp_password ? " (password set)" : ""}.` }
        : { ok: false, text: "Password-reset and notification emails can't be sent until SMTP is set up." },
    test: { kind: "email", label: "Send a Test Email To", button: "Send Test Email" },
    sections: [
      {
        title: "SMTP Server",
        fields: [
          { key: "smtp_host", label: "SMTP Host", type: "text", required: true, hint: "e.g. smtp.gmail.com, email-smtp.ap-south-1.amazonaws.com" },
          { key: "smtp_port", label: "Port", type: "number", required: true, hint: "587 for TLS, 465 for SSL." },
          { key: "smtp_encryption", label: "Encryption", type: "select", required: true, options: "smtp_encryptions" },
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
        note: "Password-reset emails are always sent. Turning an email off here still shows the notification in the bell.",
        fields: [
          { key: "notify_lead_assigned", label: "A lead is assigned to a team member, or a new lead has no one to assign it to (to Super Admins)", type: "toggle" },
          { key: "notify_design_requests", label: "A design request is sent, submitted, approved or sent back for changes", type: "toggle" },
          { key: "notify_approvals", label: "An approval is requested (to approvers), approved or rejected (to the requester)", type: "toggle" },
        ],
      },
      {
        title: "Copies",
        fields: [{ key: "notify_bcc", label: "BCC Every Email To", type: "email", hint: "Optional — e.g. an audit mailbox. Never used for password-reset links.", full: true }],
      },
    ],
  },
  whatsapp: {
    // `connected` = the number and name the API reads from Meta with the
    // saved Phone Number ID and token.
    status: ({ values: v, connected, connected_error: error }) =>
      !v.wa_enabled
        ? { ok: false, text: "WhatsApp is turned off — no messages are sent." }
        : connected
          ? { ok: true, text: `Messages go out from ${connected.phone} (${connected.name}), as set up in Meta Business Manager.` }
          : { ok: false, text: error ? `Meta refused the saved credentials: ${error}` : "Add the Phone Number ID and Access Token to start sending messages." },
    test: { kind: "phone", label: "Send a Test Message To", button: "Send Test Message", hint: "Sends Meta's hello_world template." },
    sections: [
      {
        title: "WhatsApp Business API (Meta Cloud API)",
        toggle: "wa_enabled",
        onMessage: "WhatsApp messages will be sent for the events turned on below.",
        offMessage: "No WhatsApp messages will be sent until it is turned on again.",
        note: "The number, display name and message templates are set up in Meta Business Manager — here we only keep what the system needs to send through it.",
        fields: [
          { key: "wa_phone_number_id", label: "Phone Number ID", type: "text", requiredWhen: "wa_enabled", hint: "Meta App → WhatsApp → API Setup." },
          { key: "wa_access_token", label: "Permanent Access Token", type: "password", secret: true, requiredWhen: "wa_enabled", hint: "System User token with whatsapp_business_messaging permission." },
          { key: "wa_app_secret", label: "App Secret", type: "password", secret: true, hint: "Once set, only webhooks signed by Meta are accepted." },
        ],
      },
      {
        // Not tied to the WhatsApp switch: Meta Lead Ads uses the same token.
        title: "Webhook (WhatsApp & Meta Lead Ads)",
        webhook: true,
        fields: [
          // Shown as text: it has to be copied into the Meta app as typed.
          { key: "wa_webhook_verify_token", label: "Webhook Verify Token", type: "text", secret: true, required: true, full: true },
        ],
      },
      { title: "Send a WhatsApp message when…", dependsOn: "wa_enabled", templates: true },
    ],
  },
  integrations: {
    sections: [
      {
        title: "Meta Lead Ads (Facebook / Instagram)",
        toggle: "meta_enabled",
        onMessage: "New Meta Lead Ads leads will be fetched and added to Leads.",
        offMessage: "New Meta Lead Ads leads will stop coming into Leads until it is turned on again.",
        fields: [{ key: "meta_page_access_token", label: "Page Access Token", type: "password", secret: true, requiredWhen: "meta_enabled", full: true }],
      },
    ],
  },
  sales: {
    sections: [
      {
        title: "Booking",
        fields: [
          {
            key: "token_min_amount",
            label: "Minimum Token Amount (₹)",
            type: "number",
            required: true,
            hint: "Needed to mark a lead Booked (statuses with “Needs token amount”). Less needs Management approval. 0 = any amount above zero.",
          },
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
          { key: "password_reset_rate_limit_max", label: "Reset Requests Allowed", type: "number", required: true, hint: "Per IP, per 15 minutes." },
          { key: "password_reset_expiry_min", label: "Reset Link Expires After (minutes)", type: "number", required: true },
          { key: "session_days", label: "Stay Signed In For (days)", type: "number", required: true, hint: "Applies from each user's next sign-in." },
        ],
      },
      {
        title: "File Uploads",
        fields: [{ key: "max_upload_size_mb", label: "Max File Size (MB)", type: "number", required: true }],
      },
    ],
  },
};

export default function SiteSettingsPage() {
  const can = useCan();
  const [tab, setTab] = useState("general");
  const [dirty, setDirty] = useState(false);
  const details = useApiData(SETTINGS_API.details, { group: tab });
  const { master, error: masterError, reload: reloadMaster } = useSettingsMaster();
  const [confirm, dialog] = useConfirm();

  // While another tab loads, `details.data` is still the previous tab's.
  const data = details.data?.group === tab ? details.data : null;
  const tabs = (master?.groups || []).filter((g) => GROUPS[g.key]).map((g) => ({ value: g.key, label: g.label }));

  async function changeTab(next) {
    if (next === tab) return;
    if (
      dirty &&
      !(await confirm({
        title: `Discard changes to ${tabs.find((t) => t.value === tab)?.label}?`,
        message: "You have unsaved changes on this tab. Leaving it will lose them.",
        confirmLabel: "Discard",
      }))
    )
      return;
    setDirty(false);
    setTab(next);
  }

  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <h1 className="wf-h1">Site Settings</h1>
      <p className="wf-sub">Company details, outgoing email, WhatsApp, notifications, integrations and security limits.</p>

      <LoadError error={masterError} onRetry={reloadMaster} />
      {tabs.length > 0 && <TabBar tabs={tabs} value={tab} onChange={changeTab} label="Settings group" />}
      <LoadError error={details.error} onRetry={details.reload} />

      {data && master ? (
        <SettingsForm
          // Remounted with the saved values after every save / clear / upload.
          key={`${tab}|${data.updated_at}`}
          layout={GROUPS[tab]}
          data={data}
          master={master}
          canEdit={can("settings.edit")}
          onSaved={(result) => details.patch(() => result)}
          onDirtyChange={setDirty}
          confirm={confirm}
        />
      ) : (
        !details.error && !masterError && <div className="wf-empty">Loading settings…</div>
      )}
      {dialog}
    </div>
  );
}

// Form state for a tab: every value as an input holds it ('' for none),
// secrets blank, and a row for every WhatsApp event.
function initialValues(layout, data, master) {
  const values = Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, v ?? ""]));
  for (const section of layout.sections) {
    for (const f of section.fields || []) if (f.secret) values[f.key] = "";
    if (section.templates) {
      const saved = data.values.wa_templates || {};
      values.wa_templates = Object.fromEntries(
        master.whatsapp_events.map((e) => [
          e.value,
          { enabled: false, name: "", language: master.whatsapp_languages[0].value, ...saved[e.value] },
        ])
      );
    }
  }
  return values;
}

function SettingsForm({ layout, data, master, canEdit, onSaved, onDirtyChange, confirm }) {
  const initial = useMemo(() => initialValues(layout, data, master), [layout, data, master]);
  const [form, setForm] = useState(initial);
  const [files, setFiles] = useState({ logo: [], favicon: [] });
  const save = useSubmit();
  const clear = useSubmit({ fieldErrorsInToast: true });

  const dirty = JSON.stringify(form) !== JSON.stringify(initial) || files.logo.length > 0 || files.favicon.length > 0;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Turning an integration on or off changes what the system does for
  // everyone — confirm each switch that changed before saving.
  async function confirmToggles() {
    for (const section of layout.sections) {
      const key = section.toggle;
      if (!key || Boolean(form[key]) === Boolean(initial[key])) continue;
      const on = Boolean(form[key]);
      const ok = await confirm({
        title: `Turn ${on ? "on" : "off"} ${section.title}?`,
        message: on ? section.onMessage : section.offMessage,
        confirmLabel: on ? "Save and turn on" : "Save and turn off",
        tone: on ? "primary" : "danger",
      });
      if (!ok) return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!(await confirmToggles())) return;

    const body = { group: data.group };
    for (const [key, value] of Object.entries(form)) {
      body[key] = isNumberField(layout, key) && value !== "" ? Number(value) : value === "" ? null : value;
    }
    let result = await save.post(SETTINGS_API.update, body);
    if (!result) return;

    for (const kind of ["logo", "favicon"]) {
      if (!files[kind].length) continue;
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", files[kind][0]);
      const uploaded = await save.upload(SETTINGS_API.branding, formData);
      if (!uploaded) break;
      result = uploaded;
    }
    onSaved(result);
  }

  async function clearSaved(field) {
    if (
      !(await confirm({
        title: `Clear the saved ${field.label}?`,
        message:
          "The value saved here is removed and the server's .env value is used instead (or none, if the server has no value). To use it again you will have to enter it again.",
        confirmLabel: "Clear",
      }))
    )
      return;
    const result = await clear.post(SETTINGS_API.clear, { group: data.group, key: field.key });
    if (result) onSaved(result);
  }

  async function regenerateToken(key) {
    if (
      !(await confirm({
        title: "Regenerate the webhook verify token?",
        message:
          "The old token stops working once you save. Enter the new one in the Meta app's webhook settings, or Meta Lead Ads and WhatsApp webhooks will be rejected.",
        confirmLabel: "Regenerate",
      }))
    )
      return;
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    set(key, Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
  }

  const status = layout.status?.(data);
  const errors = save.fieldErrors;

  return (
    <form onSubmit={handleSubmit} noValidate style={{ maxWidth: 880 }}>
      {status && <StatusBanner {...status} />}
      {!canEdit && <Alert tone="info">You can view these settings. Changing them needs the Site Settings → Edit permission.</Alert>}

      <fieldset className="wf-readonly" disabled={!canEdit || save.submitting}>
        {layout.sections.map((section, i) => {
          const last = i === layout.sections.length - 1;
          const switchKey = section.toggle || section.dependsOn;
          const enabled = !switchKey || Boolean(form[switchKey]);
          return (
            <Box
              key={section.title}
              title={section.title}
              right={
                section.toggle ? (
                  <label className="wf-check-option" style={{ margin: 0 }}>
                    <input type="checkbox" checked={Boolean(form[section.toggle])} onChange={(e) => set(section.toggle, e.target.checked)} />
                    Enabled
                  </label>
                ) : null
              }
            >
              {section.note && <p className="wf-login-field-hint">{section.note}</p>}

              {section.branding ? (
                <Branding data={data} master={master} files={files} onChange={(kind, list) => setFiles((f) => ({ ...f, [kind]: list }))} errors={errors} />
              ) : section.templates ? (
                enabled && <TemplateTable master={master} value={form.wa_templates} onChange={(v) => set("wa_templates", v)} errors={errors} />
              ) : (
                enabled && (
                  <SettingsFields
                    fields={section.fields}
                    values={form}
                    sources={data.sources}
                    master={master}
                    onChange={set}
                    errors={errors}
                    onClear={canEdit && !dirty ? clearSaved : null}
                  />
                )
              )}

              {section.webhook && (
                <div className="wf-grid wf-grid-2">
                  <div className="wf-field">
                    <label htmlFor="settings-webhook-url">Callback URL</label>
                    <input id="settings-webhook-url" className="wf-input" readOnly value={data.webhook_url} />
                    <p className="wf-login-field-hint">Paste this into the Meta app&apos;s webhook settings and subscribe to &quot;messages&quot; and &quot;leadgen&quot;.</p>
                  </div>
                  {canEdit && (
                    <div className="wf-field" style={{ alignSelf: "end" }}>
                      <button type="button" className="wf-btn" onClick={() => regenerateToken("wa_webhook_verify_token")}>
                        Regenerate Verify Token
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!enabled && (
                <p className="wf-login-field-hint">
                  {section.dependsOn ? "Turn WhatsApp on above to set this up." : "Turned off — nothing is sent or received for this integration."}
                </p>
              )}

              {last && (
                <>
                  {canEdit && layout.test && (!layout.sections.some((s) => s.toggle) || data.values.wa_enabled) && (
                    <TestSend {...layout.test} master={master} unsaved={dirty} />
                  )}
                  {data.updated_at && (
                    <p className="wf-login-field-hint">
                      Last saved {formatDateTime(data.updated_at)}
                      {data.updated_by_name ? ` by ${data.updated_by_name}` : ""}
                    </p>
                  )}
                  {canEdit && (
                    <div className="wf-actions-end">
                      <button
                        type="button"
                        className="wf-btn"
                        onClick={() => {
                          setForm(initial);
                          setFiles({ logo: [], favicon: [] });
                          save.reset();
                        }}
                        disabled={!dirty}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="wf-btn primary">
                        {save.submitting ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </Box>
          );
        })}
      </fieldset>
    </form>
  );
}

function isNumberField(layout, key) {
  return layout.sections.some((s) => (s.fields || []).some((f) => f.key === key && f.type === "number"));
}

// Hint under a secret field, from where its value comes from.
function secretHint(source) {
  if (source === "saved") return "Saved here — leave blank to keep it.";
  if (source === "env" || source === "default") return "Using the server's .env value — enter one here to override it.";
  return "Not set.";
}

// A tab section's fields in a 2-column grid; `full` fields, textareas and
// toggles take a whole row.
function SettingsFields({ fields, values, sources, master, onChange, errors, onClear }) {
  const toggles = fields.filter((f) => f.type === "toggle");
  const inputs = fields.filter((f) => f.type !== "toggle");

  return (
    <>
      {toggles.map((f) => (
        <label key={f.key} className="wf-check-option">
          <input type="checkbox" checked={Boolean(values[f.key])} onChange={(e) => onChange(f.key, e.target.checked)} />
          {f.label}
        </label>
      ))}
      {inputs.length > 0 && (
        <div className="wf-grid wf-grid-2">
          {inputs.map((f) => {
            const id = `settings-${f.key}`;
            const neededNow = f.required || Boolean(f.requiredWhen && values[f.requiredWhen]);
            // A secret already set (here or in .env) needn't be typed again.
            const required = neededNow && !(f.secret && sources[f.key]);

            if (f.type === "phone") {
              return (
                <PhoneField
                  key={f.key}
                  id={id}
                  label={f.label}
                  required={required}
                  countryCodes={master.country_codes}
                  code={values[`${f.key}_country_code`] ?? ""}
                  number={values[f.key] ?? ""}
                  onCodeChange={(v) => onChange(`${f.key}_country_code`, v)}
                  onNumberChange={(v) => onChange(f.key, v)}
                  codeError={errors[`${f.key}_country_code`]}
                  numberError={errors[f.key]}
                />
              );
            }

            const hint = f.secret ? secretHint(sources[f.key]) : f.hint;
            const props = {
              id,
              required,
              value: values[f.key] ?? "",
              onChange: (e) => onChange(f.key, f.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value),
            };
            return (
              <div key={f.key} className="wf-field" style={f.full || f.type === "textarea" ? { gridColumn: "1 / -1" } : undefined}>
                <label htmlFor={id}>{f.label}</label>
                {f.type === "select" ? (
                  <select {...props} className="wf-select">
                    {!f.required && <option value="">—</option>}
                    {master[f.options].map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea {...props} className="wf-input" rows={3} />
                ) : (
                  <input
                    {...props}
                    className="wf-input"
                    type={f.type}
                    autoComplete={f.secret ? "new-password" : "off"}
                    placeholder={f.secret && sources[f.key] === "saved" ? "••••••••" : undefined}
                  />
                )}
                {hint && !errors[f.key] && (
                  <p className="wf-login-field-hint">
                    {hint}
                    {f.secret && sources[f.key] === "saved" && onClear && (
                      <>
                        {" "}
                        <button type="button" className="wf-link-btn" onClick={() => onClear(f)}>
                          Clear saved value
                        </button>
                      </>
                    )}
                  </p>
                )}
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

// Current logo / favicon, and a picker for a new one (uploaded on Save).
function Branding({ data, master, files, onChange, errors }) {
  return (
    <div className="wf-grid wf-grid-2">
      {[
        ["logo", data.logo_url],
        ["favicon", data.favicon_url],
      ].map(([kind, url]) => {
        const { label, extensions } = master.branding[kind];
        return (
          <div key={kind} className="wf-field">
            <label htmlFor={`settings-${kind}`}>{label}</label>
            {url && (
              // eslint-disable-next-line @next/next/no-img-element -- uploaded file on the API server
              <img src={url} alt={`Current ${label.toLowerCase()}`} style={{ maxHeight: 64, maxWidth: "100%", marginBottom: 8 }} />
            )}
            <FileDropBox
              id={`settings-${kind}`}
              label={`${url ? "Replace" : "Upload"} — ${extensions.join(", ")}`}
              extensions={extensions}
              multiple={false}
              files={files[kind]}
              onChange={(list) => onChange(kind, list)}
            />
          </div>
        );
      })}
      <FieldError>{errors.file}</FieldError>
    </div>
  );
}

// WhatsApp templates per event: on/off, approved template name, language.
// value = { [event]: { enabled, name, language } } (wa_templates).
function TemplateTable({ master, value, onChange, errors }) {
  const update = (event, patch) => onChange({ ...value, [event]: { ...value[event], ...patch } });
  return (
    <DataTable
      columns={["Event", "Sent To", "Template Name", "Language"]}
      rows={master.whatsapp_events.map((e) => {
        const t = value[e.value];
        const error = errors[`wa_templates.${e.value}.name`];
        return [
          <label key="on" className="wf-check-option" style={{ margin: 0 }}>
            <input type="checkbox" checked={t.enabled} onChange={(ev) => update(e.value, { enabled: ev.target.checked })} />
            {e.label}
          </label>,
          e.to,
          <div key="name" className="wf-field">
            <input
              className="wf-input"
              aria-label={`${e.label} — template name`}
              required={t.enabled}
              value={t.name || ""}
              disabled={!t.enabled}
              placeholder="approved_template_name"
              onChange={(ev) => update(e.value, { name: ev.target.value })}
            />
            <FieldError>{error}</FieldError>
          </div>,
          <select
            key="lang"
            className="wf-select"
            aria-label={`${e.label} — language`}
            value={t.language}
            disabled={!t.enabled}
            onChange={(ev) => update(e.value, { language: ev.target.value })}
          >
            {master.whatsapp_languages.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>,
        ];
      })}
    />
  );
}

// Sends a test email / WhatsApp message with the SAVED settings.
// kind: "email" | "phone".
function TestSend({ kind, label, button, hint, master, unsaved }) {
  const [to, setTo] = useState("");
  const [code, setCode] = useState("");
  const test = useSubmit();

  function send() {
    if (kind === "phone") test.post(SETTINGS_API.testWhatsapp, { country_code: code, mobile_number: to });
    else test.post(SETTINGS_API.testEmail, { to });
  }

  const note = unsaved ? "Save your changes first — the test uses the saved settings." : hint || "Uses the saved settings.";
  return (
    <div className="wf-grid wf-grid-2">
      {kind === "phone" ? (
        <div>
          <PhoneField
            id="settings-test-to"
            label={label}
            countryCodes={master.country_codes}
            code={code}
            number={to}
            onCodeChange={setCode}
            onNumberChange={setTo}
            codeError={test.fieldErrors.country_code}
            numberError={test.fieldErrors.mobile_number}
          />
          <p className="wf-login-field-hint">{note}</p>
        </div>
      ) : (
        <div className="wf-field">
          <label htmlFor="settings-test-to">{label}</label>
          <input id="settings-test-to" className="wf-input" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
          {!test.fieldErrors.to && <p className="wf-login-field-hint">{note}</p>}
          <FieldError>{test.fieldErrors.to}</FieldError>
        </div>
      )}
      <div className="wf-field" style={{ alignSelf: "center" }}>
        <button type="button" className="wf-btn" onClick={send} disabled={unsaved || test.submitting}>
          {test.submitting ? "Sending…" : button}
        </button>
      </div>
    </div>
  );
}
