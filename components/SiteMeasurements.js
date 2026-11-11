"use client";

// A site's Measurement step on the panel (POST /api/admin/sites/measurements),
// shown on the site page and on its lead's page, where Sales makes the
// Final Quotation from it. The site's supervisors upload it from the
// Supervisor app: photos of the site and the filled-in measurement form.
// Every submission is a version — the latest is shown, earlier ones can
// be picked. Read-only here.

import { useState } from "react";
import { Badge, Box, Detail, DetailGroup, ImageGallery, LoadError } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { ALL_BRANCHES, SITE_API } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

export default function SiteMeasurements({ siteId }) {
  const measurements = useApiData(SITE_API.measurements, { id: siteId }, { branchId: ALL_BRANCHES });
  // The version picked; null = the latest.
  const [versionId, setVersionId] = useState(null);
  const versions = measurements.data || [];
  const shown = versions.find((m) => m.id === versionId) || versions[0] || null;
  const latest = versions[0];

  return (
    <Box
      title="Measurement"
      right={latest ? <Badge tone="done">{`v${latest.version} uploaded`}</Badge> : measurements.data && <Badge tone="pending">Pending</Badge>}
    >
      <LoadError error={measurements.error} onRetry={measurements.reload} />
      {!measurements.data && measurements.loading ? (
        <div className="wf-empty">Loading measurement…</div>
      ) : !shown ? (
        !measurements.error && (
          <div className="wf-empty">Not uploaded yet — the site&apos;s supervisor uploads the site photos and the measurement form from the Supervisor app.</div>
        )
      ) : (
        <>
          {versions.length > 1 && (
            <div className="wf-field">
              <label htmlFor={`measurement-version-${siteId}`}>Version</label>
              <select
                id={`measurement-version-${siteId}`}
                className="wf-select"
                value={shown.id}
                onChange={(e) => setVersionId(e.target.value)}
              >
                {versions.map((m, i) => (
                  <option key={m.id} value={m.id}>
                    {`v${m.version} — ${formatDateTime(m.submitted_at)}${i === 0 ? " (latest, in use)" : ""}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <DetailGroup title={shown.id === latest.id ? `v${shown.version} — in use` : `v${shown.version} — replaced by v${latest.version}`}>
            <Detail label="Uploaded By">{shown.submitted_by_name || "—"}</Detail>
            <Detail label="Uploaded">{formatDateTime(shown.submitted_at)}</Detail>
            <Detail label="Supervisor's Note" wide>
              <span style={{ whiteSpace: "pre-line" }}>{shown.remark || "—"}</span>
            </Detail>
          </DetailGroup>
          <div className="wf-field">
            <label>Measurement Form ({shown.measurement_form.length})</label>
            <ImageGallery images={shown.measurement_form} />
          </div>
          <div className="wf-field">
            <label>Site Photos ({shown.site_photos.length})</label>
            <ImageGallery images={shown.site_photos} />
          </div>
        </>
      )}
    </Box>
  );
}
