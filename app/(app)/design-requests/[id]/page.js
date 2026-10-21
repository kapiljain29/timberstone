"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Alert, Box, FieldError, LoadError } from "@/components/ui";
import DesignRequestView from "@/components/DesignRequestView";
import FileDropBox from "@/components/FileDropBox";
import { getSession } from "@/lib/api";
import { formatPhone } from "@/lib/phone";
import { SUPER_ADMIN_SLUG, useCan } from "@/lib/roles";
import { ALL_BRANCHES, DESIGN_API, DESIGN_STATUS, useDesignMaster } from "@/lib/team";
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
  const waiting = [DESIGN_STATUS.PENDING, DESIGN_STATUS.CHANGES_REQUESTED].includes(r.design_status);

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
        <UploadForm request={r} master={master} onUploaded={(updated) => request.patch(() => updated)} />
      )}
    </div>
  );
}

// The wireframe's two upload boxes — design JPEGs and DWG files — then
// send them for review (at least one file; both go up as `files`).
function UploadForm({ request, master, onUploaded }) {
  const [picked, setPicked] = useState({ jpeg: [], dwg: [] });
  const [comment, setComment] = useState("");
  const save = useSubmit();
  // File types from the master: [{ value: "jpeg", label, extensions }, …].
  const types = master?.file_types || [];

  async function handleUpload(e) {
    e.preventDefault();
    const form = new FormData();
    form.append("id", request.id);
    if (comment.trim()) form.append("comment", comment.trim());
    types.forEach((t) => (picked[t.value] || []).forEach((f) => form.append("files", f)));
    const updated = await save.upload(DESIGN_API.upload, form, { branchId: ALL_BRANCHES });
    if (updated) {
      setPicked({ jpeg: [], dwg: [] });
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
          <div className="wf-grid wf-grid-2">
            {types.map((t) => (
              <FileDropBox
                key={t.value}
                id={`design-files-${t.value}`}
                label={t.value === "jpeg" ? "Upload design JPEG" : `Upload ${t.label} file`}
                extensions={t.extensions}
                files={picked[t.value] || []}
                onChange={(files) => setPicked((p) => ({ ...p, [t.value]: files }))}
                disabled={save.submitting}
              />
            ))}
          </div>
        )}
        <FieldError>{save.fieldErrors.files}</FieldError>
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
