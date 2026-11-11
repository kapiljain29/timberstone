"use client";

// The step after a site's measurement: the lead's Final Quotation. Shared
// by the lead page and the site page. Members with Quotations → View get
// the quotation card (create / update with Quotations → Add / Edit);
// everyone else gets a note saying what happens next and who does it, so
// the step is never just missing.

import { Alert } from "@/components/ui";
import LeadQuotation from "@/components/LeadQuotation";
import { useCan } from "@/lib/roles";

/**
 * lead — /leads/details of a lead moved to Site (`lead.site` set);
 * onSaved() reloads it.
 */
export default function FinalQuotationStep({ lead, onSaved }) {
  const can = useCan();
  if (can("quotations.view")) return <LeadQuotation lead={lead} type="final" onSaved={onSaved} />;
  return <Alert tone="info">{finalQuotationNextStep(lead.site?.latest_measurement)}</Alert>;
}

// "Next step: …" for someone who can't make the Final Quotation themselves.
export function finalQuotationNextStep(measured) {
  return measured
    ? `Next step: Sales makes the Final Quotation from measurement v${measured.version} (needs Quotations → Add).`
    : "Next step: the site's supervisor uploads the measurement from the Supervisor app; then Sales makes the Final Quotation.";
}
