"use client";

// Token payment fields for a status change to a needs_token status (Booked)
// — on the lead page's Change Status and the Call Queue's log-call form.
// Either the token received (amount, mode, date, reference) or, ticked,
// a reason to ask Management for approval to book without the full token
// (any amount entered is still recorded). The API decides what is enough
// (token_min_amount); the receipt is attached afterwards on the lead page.
//
//   const [token, setToken] = useState(EMPTY_TOKEN);
//   {next?.needs_token && <TokenFields idPrefix="lead" master={master} value={token} onChange={setToken} errors={save.fieldErrors} />}
//   save.post(path, { ...body, ...(next?.needs_token ? tokenBody(token) : {}) })

import { Alert, FieldError } from "@/components/ui";
import { formatAmount, todayDate } from "@/lib/format";

export const EMPTY_TOKEN = { amount: "", mode: "", paidOn: "", referenceNo: "", bypass: false, reason: "" };

// The token fields of the status-change request.
export function tokenBody(token) {
  const amount = token.amount === "" ? null : Number(token.amount);
  return {
    token_amount: amount || null,
    token_payment_mode: amount ? token.mode || null : null,
    token_paid_on: amount ? token.paidOn || todayDate() : null,
    token_reference_no: amount ? token.referenceNo.trim() || null : null,
    bypass_reason: token.bypass ? token.reason.trim() || null : null,
  };
}

/**
 * master — /leads/master or /call-queue/master (payment_modes,
 * token_min_amount). tokenPaid — token already received for the lead, when
 * known (counts towards the minimum).
 */
export default function TokenFields({ idPrefix, master, value, onChange, errors = {}, disabled = false, tokenPaid = 0 }) {
  const min = master?.token_min_amount || 0;
  const set = (key, v) => onChange({ ...value, [key]: v });
  const id = (name) => `${idPrefix}-token-${name}`;

  return (
    <div className="wf-token">
      <Alert tone="info">
        A token is needed to book this lead{min ? ` — at least ${formatAmount(min)}` : ""}
        {tokenPaid ? ` (${formatAmount(tokenPaid)} received so far)` : ""}. Without it, ask Management for approval.
      </Alert>
      <div className="wf-grid wf-grid-4">
        <div className="wf-field">
          <label htmlFor={id("amount")}>Token Amount (₹)</label>
          <input
            id={id("amount")}
            type="number"
            min="1"
            step="any"
            inputMode="decimal"
            required={!value.bypass}
            className="wf-input"
            value={value.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder={value.bypass ? "Optional — any part received" : min ? `At least ${min}` : "e.g. 10000"}
            disabled={disabled}
          />
          <FieldError>{errors.token_amount}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor={id("mode")}>Payment Mode</label>
          <select
            id={id("mode")}
            required={Boolean(value.amount)}
            className="wf-select"
            value={value.mode}
            onChange={(e) => set("mode", e.target.value)}
            disabled={disabled || !master}
          >
            <option value="">Select mode</option>
            {(master?.payment_modes || []).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <FieldError>{errors.token_payment_mode}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor={id("paid-on")}>Received On</label>
          <input
            id={id("paid-on")}
            type="date"
            required={Boolean(value.amount)}
            className="wf-input"
            max={todayDate()}
            value={value.paidOn || todayDate()}
            onChange={(e) => set("paidOn", e.target.value)}
            disabled={disabled}
          />
          <FieldError>{errors.token_paid_on}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor={id("reference")}>Reference No.</label>
          <input
            id={id("reference")}
            className="wf-input"
            value={value.referenceNo}
            onChange={(e) => set("referenceNo", e.target.value)}
            placeholder="UTR / cheque no. — optional"
            maxLength={100}
            disabled={disabled}
          />
          <FieldError>{errors.token_reference_no}</FieldError>
        </div>
      </div>
      <div className="wf-field">
        <label className="wf-check-option">
          <input type="checkbox" checked={value.bypass} onChange={(e) => set("bypass", e.target.checked)} disabled={disabled} />
          <span>
            <strong>Book without the full token</strong> — ask Management for approval. The lead keeps its status until it is
            approved.
          </span>
        </label>
      </div>
      {value.bypass && (
        <div className="wf-field">
          <label htmlFor={id("reason")}>Reason for Approval</label>
          <textarea
            id={id("reason")}
            required
            className="wf-textarea"
            rows={2}
            value={value.reason}
            onChange={(e) => set("reason", e.target.value)}
            placeholder="Why this lead should be booked without the full token"
            maxLength={1000}
            disabled={disabled}
          />
          <FieldError>{errors.bypass_reason}</FieldError>
        </div>
      )}
    </div>
  );
}
