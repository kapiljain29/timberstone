"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Box, Detail, DetailGroup, FieldError, ImageGallery, LoadError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { MEmpty, MIcon, MSectionTitle } from "@/components/MobileUI";
import MPhotoPicker from "@/components/MPhotoPicker";
import { formatDateTime } from "@/lib/format";
import { ALL_BRANCHES, MEASUREMENT_FIELDS, SUPERVISOR_SITE_API, useSupervisorSite } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

// The Measurement step of a site (Supervisor app): the supervisor takes
// photos of the site and of the filled-in measurement form, adds a note,
// and submits → POST /api/mobile/sites/measurement/submit (multipart). Each
// submission is a new version — the latest is the one Sales makes the Final
// Quotation from (they are notified); earlier versions stay below.
export default function MobileMeasurementPage() {
  const { id } = useParams();
  const router = useRouter();
  const site = useSupervisorSite(id);
  const form = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const [photos, setPhotos] = useState([]);
  const [formImages, setFormImages] = useState([]);
  const [remark, setRemark] = useState("");
  const s = site.data;
  const dirty = photos.length > 0 || formImages.length > 0 || remark.trim() !== "";
  const backHref = `/m/sites/${id}`;

  // Leaving with photos picked loses them — ask first.
  async function goBack(e) {
    if (!dirty) return;
    e.preventDefault();
    if (
      await confirm({
        title: "Discard these photos?",
        message: "The photos and note you added haven't been submitted and will be lost.",
        confirmLabel: "Discard",
        cancelLabel: "Keep editing",
      })
    ) {
      router.push(backHref);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const latest = s.measurements[0];
    if (
      latest &&
      !(await confirm({
        title: `Replace measurement v${latest.version}?`,
        message: `Your upload becomes v${latest.version + 1} — the one Sales uses for the Final Quotation. v${latest.version} stays in the history. Sales is notified.`,
        confirmLabel: `Submit v${latest.version + 1}`,
        tone: "primary",
      }))
    ) {
      return;
    }
    const body = new FormData();
    body.append("id", id);
    if (remark.trim()) body.append("remark", remark.trim());
    photos.forEach((file) => body.append(MEASUREMENT_FIELDS.sitePhotos, file));
    formImages.forEach((file) => body.append(MEASUREMENT_FIELDS.measurementForm, file));
    const saved = await form.upload(SUPERVISOR_SITE_API.submitMeasurement, body, { branchId: ALL_BRANCHES });
    if (saved) {
      setPhotos([]);
      setFormImages([]);
      setRemark("");
      site.reload();
    }
  }

  if (!s) {
    return (
      <div>
        <Link href={backHref} className="wf-mback">
          <MIcon name="back" size={16} /> Site
        </Link>
        {site.error?.status === 404 ? (
          <MEmpty icon="alert" title="Site not found" sub="It isn't one of your sites any more." />
        ) : site.error ? (
          <LoadError error={site.error} onRetry={site.reload} />
        ) : (
          <div className="wf-empty">Loading site…</div>
        )}
      </div>
    );
  }

  const [latest, ...older] = s.measurements;

  return (
    <div>
      <Link href={backHref} className="wf-mback" onClick={goBack}>
        <MIcon name="back" size={16} /> {s.site_code}
      </Link>
      <h1 className="wf-mtitle">Measurement</h1>
      <p className="wf-msub">
        {s.site_name}
        {latest ? ` · v${latest.version} uploaded` : " · not uploaded yet"}
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <Box title={latest ? `Upload a new version (v${latest.version + 1})` : "Upload the measurement"}>
          <MPhotoPicker
            id="measurement-form"
            label="Measurement Form"
            hint="A clear photo of the filled-in measurement form — one per page."
            files={formImages}
            onChange={setFormImages}
            required
            disabled={form.submitting}
            error={form.fieldErrors[MEASUREMENT_FIELDS.measurementForm]}
          />
          <MPhotoPicker
            id="site-photos"
            label="Site Photos"
            hint="Walls, floors and areas to be worked on, from a few angles."
            files={photos}
            onChange={setPhotos}
            required
            disabled={form.submitting}
            error={form.fieldErrors[MEASUREMENT_FIELDS.sitePhotos]}
          />
          <div className="wf-field">
            <label htmlFor="measurement-remark">Note for Sales</label>
            <textarea
              id="measurement-remark"
              className="wf-input"
              rows={3}
              maxLength={2000}
              placeholder="e.g. Balcony 2 has damp patches; customer wants the lobby added"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              disabled={form.submitting}
            />
            <FieldError>{form.fieldErrors.remark}</FieldError>
          </div>
          <div className="wf-actions-end">
            <button type="submit" className="wf-btn primary" disabled={form.submitting}>
              {form.submitting ? "Uploading…" : latest ? `Submit v${latest.version + 1}` : "Submit Measurement"}
            </button>
          </div>
        </Box>
      </form>

      {latest && (
        <>
          <MSectionTitle>In use · v{latest.version}</MSectionTitle>
          <MeasurementVersion measurement={latest} />
        </>
      )}
      {older.length > 0 && (
        <>
          <MSectionTitle>Earlier versions</MSectionTitle>
          {older.map((m) => (
            <details key={m.id} className="wf-mlist" style={{ padding: 12 }}>
              <summary>{`v${m.version} · ${formatDateTime(m.submitted_at)}`}</summary>
              <MeasurementVersion measurement={m} />
            </details>
          ))}
        </>
      )}
      {confirmDialog}
    </div>
  );
}

function MeasurementVersion({ measurement: m }) {
  return (
    <Box title={`v${m.version} — ${formatDateTime(m.submitted_at)}`}>
      <DetailGroup>
        <Detail label="Uploaded By">{m.submitted_by_name || "—"}</Detail>
        <Detail label="Note" wide>
          <span style={{ whiteSpace: "pre-line" }}>{m.remark || "—"}</span>
        </Detail>
      </DetailGroup>
      <div className="wf-field">
        <label>Measurement Form ({m.measurement_form.length})</label>
        <ImageGallery images={m.measurement_form} />
      </div>
      <div className="wf-field">
        <label>Site Photos ({m.site_photos.length})</label>
        <ImageGallery images={m.site_photos} />
      </div>
    </Box>
  );
}
