"use client";

// Extra material the site's supervisors asked for from the Supervisor app
// (more of the approved Final Quotation's lines), on the site page
// (POST /api/admin/sites/material-requests). The site's Operation Head (or
// a Super Admin — `can_decide`) approves or rejects (with the reason) a
// pending one — useMaterialRequestDecision(), shared with the Material
// Requests screen. The page loads the list (it also counts the pending
// ones for its tab) and passes it in.

import { Badge, Box, Detail, DetailGroup, LoadError } from "@/components/ui";
import { useMaterialRequestDecision } from "@/components/MaterialRequestDecision";
import { formatDateTime } from "@/lib/format";
import { MATERIAL_REQUEST_API, MATERIAL_REQUEST_STATUS, materialRequestTone, sqft } from "@/lib/materialRequests";
import { ALL_BRANCHES } from "@/lib/team";
import { useApiData } from "@/lib/useApi";

/**
 * The site's requests (POST /api/admin/sites/material-requests) —
 * useApiData's result, for SiteMaterialRequests and its tab's count.
 */
export function useSiteMaterialRequests(siteId) {
  return useApiData(siteId ? MATERIAL_REQUEST_API.site : null, { id: siteId }, { branchId: ALL_BRANCHES });
}

/**
 * list — useSiteMaterialRequests(siteId); onDecided() — after an approval
 * (e.g. reload the order).
 */
export default function SiteMaterialRequests({ list, onDecided }) {
  const decision = useMaterialRequestDecision((r, approved) => {
    list.reload();
    if (approved && onDecided) onDecided();
  });
  const d = list.data;
  if (list.error) return <LoadError error={list.error} onRetry={list.reload} />;
  if (!d) return <div className="wf-empty">Loading requests…</div>;
  const pending = d.requests.filter((r) => r.request_status === MATERIAL_REQUEST_STATUS.PENDING).length;

  return (
    <Box title="Extra Material Requests" right={pending > 0 ? <Badge tone="pending">{`${pending} waiting`}</Badge> : null}>
      {d.requests.length === 0 && (
        <div className="wf-empty">No requests yet. The site&rsquo;s supervisors ask for extra material from the Supervisor app.</div>
      )}
      {d.requests.map((r) => (
        <div key={r.id} className="wf-subform">
          <DetailGroup>
            <Detail label="Requested">{`${formatDateTime(r.created_at)}${r.requested_by_name ? ` by ${r.requested_by_name}` : ""}`}</Detail>
            <Detail label="Status">
              <Badge tone={materialRequestTone(r.request_status)}>{r.status_label}</Badge>
            </Detail>
            <Detail label="Items" wide>
              {r.items.map((i) => (
                <div key={i.id}>{`${i.product_name} · ${i.area_label} · ${i.colour_pattern} — ${sqft(i.quantity)}`}</div>
              ))}
            </Detail>
            <Detail label="Why" wide>
              {r.reason}
            </Detail>
            {r.decided_at && (
              <Detail label={r.status_label} wide>
                {`${formatDateTime(r.decided_at)}${r.decided_by_name ? ` by ${r.decided_by_name}` : ""}${r.decision_comment ? ` — ${r.decision_comment}` : ""}`}
              </Detail>
            )}
          </DetailGroup>
          {r.request_status === MATERIAL_REQUEST_STATUS.PENDING && d.can_decide && (
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => decision.reject(r)} disabled={decision.submitting}>
                Reject
              </button>
              <button type="button" className="wf-btn primary" onClick={() => decision.approve(r)} disabled={decision.submitting}>
                Approve
              </button>
            </div>
          )}
        </div>
      ))}
      {decision.dialogs}
    </Box>
  );
}
