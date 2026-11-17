"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Badge, FieldError, ImageGallery, LoadError } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { MCard, MChallanSummary, MEmpty, MIcon, MSectionTitle } from "@/components/MobileUI";
import MPhotoPicker from "@/components/MPhotoPicker";
import { CHALLAN_PHOTO_FIELDS, CHALLAN_STATUS, challanStatusTone } from "@/lib/challans";
import { formatDateTime } from "@/lib/format";
import { ALL_BRANCHES, SUPERVISOR_SITE_API, useSupervisorSite } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

// The Material Delivery step of a site (Supervisor app): the order's
// Delivery Challans for this site (POST /api/mobile/sites/details →
// challans). For each one still on its way, the supervisor confirms it
// reached the site — a photo of the signed challan (required), photos of
// the material and a note → /api/mobile/sites/delivery/confirm
// (multipart). Accounts and the Operation Head are notified.
export default function MobileDeliveryPage() {
  const { id } = useParams();
  const site = useSupervisorSite(id);
  const s = site.data;
  const backHref = `/m/sites/${id}`;

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

  const toConfirm = s.challans.filter((c) => c.delivery_status === CHALLAN_STATUS.DISPATCHED);
  const delivered = s.challans.filter((c) => c.delivery_status === CHALLAN_STATUS.DELIVERED);

  return (
    <div>
      <Link href={backHref} className="wf-mback">
        <MIcon name="back" size={16} /> {s.site_code}
      </Link>
      <h1 className="wf-mtitle">Material Delivery</h1>
      <p className="wf-msub">
        {s.site_name}
        {toConfirm.length ? ` · ${toConfirm.length} to confirm` : ""}
      </p>

      {s.challans.length === 0 && (
        <MEmpty icon="truck" title="Nothing dispatched yet" sub="You'll be notified when Accounts dispatches material to this site." />
      )}

      {toConfirm.length > 0 && <MSectionTitle>To confirm</MSectionTitle>}
      {toConfirm.map((c) => (
        <ConfirmDelivery key={c.id} challan={c} onConfirmed={site.reload} />
      ))}

      {delivered.length > 0 && <MSectionTitle>Delivered</MSectionTitle>}
      {delivered.map((c) => (
        <MCard key={c.id} title={c.challan_no} right={<Badge tone={challanStatusTone(c.delivery_status)}>Delivered</Badge>}>
          <MChallanSummary challan={c} />
          <hr className="wf-mcard-divider" />
          <div>
            <span className="wf-mlabel">Confirmed</span>
            {`${formatDateTime(c.delivered_at)}${c.delivered_by_name ? ` by ${c.delivered_by_name}` : ""}`}
          </div>
          {c.delivery_remark && (
            <div className="wf-mnote">
              <span className="wf-mlabel">Your note</span>
              {c.delivery_remark}
            </div>
          )}
          <div>
            <span className="wf-mlabel">Signed challan</span>
            <ImageGallery images={c.signed_challan} />
          </div>
          {c.material_photos.length > 0 && (
            <div>
              <span className="wf-mlabel">Material on site</span>
              <ImageGallery images={c.material_photos} />
            </div>
          )}
        </MCard>
      ))}
    </div>
  );
}

// One dispatched challan: check the material, take the photos, confirm.
function ConfirmDelivery({ challan: c, onConfirmed }) {
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const [signed, setSigned] = useState([]);
  const [material, setMaterial] = useState([]);
  const [remark, setRemark] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await confirm({
      title: `Confirm ${c.challan_no} delivered?`,
      message: "Accounts and the Operation Head are told the material reached the site. This can't be undone.",
      confirmLabel: "Confirm Delivery",
      tone: "primary",
    });
    if (!ok) return;
    const body = new FormData();
    body.append("id", c.id);
    if (remark.trim()) body.append("remark", remark.trim());
    signed.forEach((file) => body.append(CHALLAN_PHOTO_FIELDS.signedChallan, file));
    material.forEach((file) => body.append(CHALLAN_PHOTO_FIELDS.materialPhotos, file));
    if (await save.upload(SUPERVISOR_SITE_API.confirmDelivery, body, { branchId: ALL_BRANCHES })) onConfirmed();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <MCard title={c.challan_no} right={<Badge tone={challanStatusTone(c.delivery_status)}>On its way</Badge>}>
        <MChallanSummary challan={c} />
        <hr className="wf-mcard-divider" />
        <MPhotoPicker
          id={`signed-${c.id}`}
          label="Photo of Signed Challan"
          hint="Get the challan signed on receipt, then take a clear photo of it."
          files={signed}
          onChange={setSigned}
          required
          disabled={save.submitting}
          error={save.fieldErrors[CHALLAN_PHOTO_FIELDS.signedChallan]}
        />
        <MPhotoPicker
          id={`material-${c.id}`}
          label="Photos of Material (optional)"
          hint="The buckets, bags or boxes as unloaded."
          files={material}
          onChange={setMaterial}
          disabled={save.submitting}
          error={save.fieldErrors[CHALLAN_PHOTO_FIELDS.materialPhotos]}
        />
        <div className="wf-field">
          <label htmlFor={`remark-${c.id}`}>Note (optional)</label>
          <textarea
            id={`remark-${c.id}`}
            className="wf-input"
            rows={2}
            maxLength={2000}
            placeholder="e.g. 1 bucket of primer damaged"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.remark}</FieldError>
        </div>
        <button type="submit" className="wf-btn primary wf-mblock" disabled={save.submitting}>
          <MIcon name="check" size={18} /> {save.submitting ? "Uploading…" : "Confirm Delivery"}
        </button>
      </MCard>
      {confirmDialog}
    </form>
  );
}
