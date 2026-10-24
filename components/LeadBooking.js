"use client";

// The lead page's "Token & Booking" card (POST /leads/booking): the token
// received (vs the Site Settings minimum), each payment with its receipt,
// and the request to book without the full token — pending / approved /
// rejected. The person who recorded a payment attaches its receipt here
// (POST /leads/payment-receipt, multipart).

import { useState } from "react";
import { Alert, Box, DataTable, FieldError, LoadError } from "@/components/ui";
import FileDropBox from "@/components/FileDropBox";
import { getSession } from "@/lib/api";
import { formatAmount, formatDate, formatDateTime } from "@/lib/format";
import { SUPER_ADMIN_SLUG } from "@/lib/roles";
import { ALL_BRANCHES, APPROVAL_STATUS, LEAD_API, optionLabel } from "@/lib/team";
import { useSubmit } from "@/lib/useApi";

// The receipt file types /leads/payment-receipt accepts.
const RECEIPT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".pdf"];

/**
 * booking — useApiData of /leads/booking; master — /leads/master
 * (payment_modes labels).
 */
export default function LeadBooking({ booking, master }) {
  const [attachTo, setAttachTo] = useState(null);
  const data = booking.data;
  if (booking.error) {
    return (
      <Box title="Token & Booking">
        <LoadError error={booking.error} onRetry={booking.reload} />
      </Box>
    );
  }
  if (!data || (!data.payments.length && !data.approval)) return null;

  const user = getSession()?.user;
  const mayAttach = (p) => !p.receipt_url && (p.created_by === user?.id || user?.role === SUPER_ADMIN_SLUG);
  const { approval } = data;

  return (
    <Box title="Token & Booking">
      {approval?.approval_status === APPROVAL_STATUS.PENDING && (
        <Alert tone="info">
          Waiting for Management to approve marking this lead {approval.to_status_name || "Booked"} without the full token — asked by{" "}
          {approval.requested_by_name || "—"} on {formatDateTime(approval.created_at)}. Reason: “{approval.reason}”
        </Alert>
      )}
      {approval?.approval_status === APPROVAL_STATUS.REJECTED && (
        <Alert>
          {approval.decided_by_name || "Management"} rejected booking without the full token on {formatDateTime(approval.decided_at)}
          {approval.decision_comment ? `: “${approval.decision_comment}”` : "."}
        </Alert>
      )}
      {approval?.approval_status === APPROVAL_STATUS.APPROVED && (
        <Alert tone="info">
          {approval.decided_by_name || "Management"} approved booking without the full token on {formatDateTime(approval.decided_at)}
          {approval.decision_comment ? `: “${approval.decision_comment}”` : "."}
        </Alert>
      )}

      {/* Each block is a .wf-field so the card's 16px row spacing applies. */}
      <div className="wf-field">
        <label>Token Received</label>
        <div>
          <strong>{formatAmount(data.token_paid)}</strong>
          {data.token_min_amount ? ` · minimum to book ${formatAmount(data.token_min_amount)}` : ""}
        </div>
      </div>

      {data.payments.length > 0 && (
        <div className="wf-field">
          <label>Payments</label>
          <DataTable
            columns={["Received On", "Amount", "Mode", "Reference No.", "Recorded By", "Receipt"]}
            rows={data.payments.map((p) => [
              formatDate(p.paid_on),
              <strong key="a">{formatAmount(p.amount)}</strong>,
              optionLabel(master?.payment_modes, p.payment_mode),
              p.reference_no || "—",
              p.created_by_name || "—",
              p.receipt_url ? (
                <a key="r" href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="wf-link-btn">
                  View receipt ↗
                </a>
              ) : mayAttach(p) ? (
                <button key="r" type="button" className="wf-link-btn" onClick={() => setAttachTo(p)}>
                  Attach receipt
                </button>
              ) : (
                "—"
              ),
            ])}
          />
        </div>
      )}

      {attachTo && (
        <ReceiptForm
          key={attachTo.id}
          payment={attachTo}
          onCancel={() => setAttachTo(null)}
          onDone={() => {
            setAttachTo(null);
            booking.reload();
          }}
        />
      )}
    </Box>
  );
}

// Attach one receipt to a payment.
function ReceiptForm({ payment, onCancel, onDone }) {
  const [files, setFiles] = useState([]);
  const save = useSubmit();

  async function handleUpload(e) {
    e.preventDefault();
    const form = new FormData();
    form.append("id", payment.id);
    if (files[0]) form.append("file", files[0]);
    if (await save.upload(LEAD_API.paymentReceipt, form, { branchId: ALL_BRANCHES })) onDone();
  }

  return (
    <form onSubmit={handleUpload} noValidate className="wf-field">
      <FileDropBox
        id={`receipt-${payment.id}`}
        label={`Receipt for ${formatAmount(payment.amount)} received on ${formatDate(payment.paid_on)} — ${RECEIPT_EXTENSIONS.join(", ")}`}
        extensions={RECEIPT_EXTENSIONS}
        multiple={false}
        files={files}
        onChange={setFiles}
        disabled={save.submitting}
      />
      <FieldError>{save.fieldErrors.file}</FieldError>
      <div className="wf-actions-end">
        <button type="button" className="wf-btn" onClick={onCancel} disabled={save.submitting}>
          Cancel
        </button>
        <button type="submit" className="wf-btn primary" disabled={save.submitting || !files.length}>
          {save.submitting ? "Uploading…" : "Attach Receipt"}
        </button>
      </div>
    </form>
  );
}
