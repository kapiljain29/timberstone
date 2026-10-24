"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Alert, Box, FieldError, LoadError } from "@/components/ui";
import DesignRequestView from "@/components/DesignRequestView";
import FileDropBox from "@/components/FileDropBox";
import { getSession } from "@/lib/api";
import { toDateTimeInput } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { SUPER_ADMIN_SLUG, useCan } from "@/lib/roles";
import { ALL_BRANCHES, DESIGN_API, DESIGN_STATUS, designWaiting, useDesignMaster } from "@/lib/team";
import { useApiData, useSubmit } from "@/lib/useApi";

// One design request — the designer reads the brief and uploads the JPEG /
// DWG files (POST /design-requests/upload, multipart); the person who sent
// it is notified to review. Opened from Design Requests or a notification.
export default function DesignRequestPage() {
  const { id } = useParams();
  const can = useCan();
  const request = useApiData(DESIGN_API.details, { id }, { branchId: ALL_BRANCHES });
  const r = request.data;
  const { master } = useDesignMaster(r ? r.branch_id || ALL_BRANCHES : null);

  if (!r) {
    if (request.error?.status === 404) {
      return (
        <div className="wf-noaccess">
          <div className="wf-noaccess-icon">🔒</div>
          <h1 className="wf-h1" style={{ justifyContent: "center" }}>
            Design request not found
          </h1>
          <p className="wf-sub">It doesn&apos;t exist, or it isn&apos;t assigned to you or your team.</p>
          <Link href="/design-requests" className="wf-btn primary">
            Back to design requests
          </Link>
        </div>
      );
    }
    return request.error ? <LoadError error={request.error} onRetry={request.reload} /> : <div className="wf-empty">Loading design request…</div>;
  }

  // Only the request's designer (or a Super Admin) uploads, while it waits
  // for a design or changes — the API checks the same.
  const user = getSession()?.user;
  const mine = r.assigned_to === user?.id || user?.role === SUPER_ADMIN_SLUG;
  const waiting = designWaiting(r.design_status);

  return (
    <div>
      <div className="wf-crumb">
        Pre-Sales / <Link href="/design-requests">Design Requests</Link>
      </div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Design — {r.lead_name}</h1>
          <p className="wf-sub">
            {[r.lead_company_name, formatPhone(r.lead_country_code, r.lead_mobile_number), `Branch: ${r.branch_name || "None"}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {can("leads.view") && (
          <Link href={`/leads/${r.lead_id}`} className="wf-btn" style={{ marginBottom: 18 }}>
            Open Lead →
          </Link>
        )}
      </div>

      {r.design_status === DESIGN_STATUS.CHANGES_REQUESTED && (
        <Alert tone="info">Changes were requested — see the latest comment under Activity, then upload the new version.</Alert>
      )}

      <Box title="Design Request">
        <DesignRequestView request={r} master={master} />
      </Box>

      {mine && waiting && can("designs.upload") && (
        <ExpectedAtForm key={r.expected_at || "none"} request={r} onSaved={(updated) => request.patch(() => updated)} />
      )}
      {mine && waiting && can("designs.upload") && (
        <UploadForm request={r} master={master} onUploaded={(updated) => request.patch(() => updated)} />
      )}
    </div>
  );
}

// The designer tells the team when the design will be ready (POST
// /design-requests/set-eta) — before uploading, and again if it changes.
// The person who sent the request is notified.
function ExpectedAtForm({ request, onSaved }) {
  const [when, setWhen] = useState(toDateTimeInput(request.expected_at));
  const [comment, setComment] = useState("");
  const save = useSubmit();

  async function handleSave(e) {
    e.preventDefault();
    // datetime-local is the browser's local time → send it as ISO (UTC).
    const expectedAt = when ? new Date(when).toISOString() : "";
    const updated = await save.post(DESIGN_API.setEta, { id: request.id, expected_at: expectedAt, comment: comment.trim() || null }, { branchId: ALL_BRANCHES });
    if (updated) {
      setComment("");
      onSaved(updated);
    }
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <Box title="Expected Completion">
        <div className="wf-grid wf-grid-2">
          <div className="wf-field">
            <label htmlFor="design-expected-at">Design Ready By (date &amp; time)</label>
            <input
              id="design-expected-at"
              type="datetime-local"
              required
              className="wf-input"
              value={when}
              min={toDateTimeInput(new Date())}
              onChange={(e) => setWhen(e.target.value)}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.expected_at}</FieldError>
          </div>
          <div className="wf-field">
            <label htmlFor="design-expected-comment">Note for Sales</label>
            <input
              id="design-expected-comment"
              className="wf-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Optional — e.g. waiting for site photos"
              maxLength={2000}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.comment}</FieldError>
          </div>
        </div>
        <div className="wf-actions-end">
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Saving…" : request.expected_at ? "Update Expected Date" : "Send Expected Date"}
          </button>
        </div>
      </Box>
    </form>
  );
}

// The design JPEGs (drop box) plus optional links to the working files —
// DWG, SketchUp, 3ds Max (`link_types` from the master) — then send them
// for review. At least one JPEG; the links are optional.
function UploadForm({ request, master, onUploaded }) {
  const [jpegs, setJpegs] = useState([]);
  const [links, setLinks] = useState({});
  const [comment, setComment] = useState("");
  const save = useSubmit();
  const jpegExtensions = (master?.file_types || []).flatMap((t) => t.extensions);
  // [{ value, label, field }] — `field` is the upload's form field name.
  const linkTypes = master?.link_types || [];

  async function handleUpload(e) {
    e.preventDefault();
    const form = new FormData();
    form.append("id", request.id);
    if (comment.trim()) form.append("comment", comment.trim());
    linkTypes.forEach((t) => links[t.field]?.trim() && form.append(t.field, links[t.field].trim()));
    jpegs.forEach((f) => form.append("files", f));
    const updated = await save.upload(DESIGN_API.upload, form, { branchId: ALL_BRANCHES });
    if (updated) {
      setJpegs([]);
      setLinks({});
      setComment("");
      onUploaded(updated);
    }
  }

  return (
    <form onSubmit={handleUpload} noValidate>
      <Box title={request.round ? `Design Files — New Version (upload ${request.round + 1})` : "Design Files"}>
        {!master ? (
          <div className="wf-empty">Loading…</div>
        ) : (
          <>
            {/* A .wf-field like every other field, so the card's 16px row
                spacing (app/globals.css) applies to it and its error. */}
            <div className="wf-field">
              <FileDropBox
                id="design-files-jpeg"
                label="Upload design JPEG"
                extensions={jpegExtensions}
                files={jpegs}
                onChange={setJpegs}
                disabled={save.submitting}
              />
              <FieldError>{save.fieldErrors.files}</FieldError>
            </div>
            <div className="wf-grid wf-grid-3">
              {linkTypes.map((t) => (
                <div className="wf-field" key={t.field}>
                  <label htmlFor={`design-link-${t.value}`}>{t.label} Link</label>
                  <input
                    id={`design-link-${t.value}`}
                    type="url"
                    className="wf-input"
                    value={links[t.field] || ""}
                    onChange={(e) => setLinks((l) => ({ ...l, [t.field]: e.target.value }))}
                    placeholder="Optional — https://…"
                    maxLength={2000}
                    disabled={save.submitting}
                  />
                  <FieldError>{save.fieldErrors[t.field]}</FieldError>
                </div>
              ))}
            </div>
          </>
        )}
        <div className="wf-field">
          <label htmlFor="design-upload-comment">Comment for Sales</label>
          <textarea
            id="design-upload-comment"
            className="wf-textarea"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional — e.g. what each option shows"
            maxLength={2000}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.comment}</FieldError>
        </div>
        <div className="wf-actions-end">
          <button type="submit" className="wf-btn primary" disabled={save.submitting}>
            {save.submitting ? "Uploading…" : "Upload & Send for Review"}
          </button>
        </div>
      </Box>
    </form>
  );
}
