"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Box, BranchFilter, FieldError, FilterPanel, FutureDateTimeField, LoadError, Pagination, SearchField, StatCard, TabBar, leadStatusTone } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import TokenFields, { EMPTY_TOKEN, tokenBody } from "@/components/TokenFields";
import { dateTimeLocalToIso, formatDateTime, startOfTodayIso } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useCan, useMyUserId } from "@/lib/roles";
import {
  CALL_QUEUE_API,
  CALL_STATUS,
  callStatusLabel,
  callStatusTone,
  isOpenCallStatus,
  useBranchTabs,
  useCallQueueMaster,
} from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue, useSubmit } from "@/lib/useApi";
import { useListFilters } from "@/lib/useListFilters";

const PAGE_SIZE = 20;
// "Viewing Queue Of" values besides a caller's id.
const QUEUE_MINE = "mine";
const QUEUE_ALL = "all";
const FILTERS = { branch: "all", search: "", call_status: "" };
// Queue views (the API's `view`); `count` = the /summary key for its tab.
const VIEWS = [
  { value: "due", label: "Call Now", count: "due", empty: "Queue clear. No calls due right now." },
  { value: "upcoming", label: "Upcoming Callbacks", count: "upcoming", empty: "No callbacks scheduled for later." },
  { value: "closed", label: "Closed", empty: "No closed calls yet." },
];

// Leads assigned to a caller (role with Leads → Call — sales users, and
// sales team leads who work leads too), to call and log the outcome of. A
// caller works their own queue; anyone whose data scope covers other
// callers (team / all) can open theirs read-only, one at a time or all
// together ("Everyone" — where non-callers such as admins start).
export default function CallQueuePage() {
  const can = useCan();
  const myId = useMyUserId();
  const filters = useListFilters(FILTERS);
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const [view, setView] = useState(VIEWS[0].value);
  // Whose queue: QUEUE_MINE, QUEUE_ALL or a caller's id; null = not
  // picked yet (see `queueOf` below).
  const [picked, setPicked] = useState(null);
  // "Calls today" count from midnight on this device.
  const [since] = useState(startOfTodayIso);
  // The row whose call form is open.
  const [activeId, setActiveId] = useState(null);

  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(values.branch);
  const { master, error: masterError, reload: reloadMaster } = useCallQueueMaster(branchId);
  const callers = master?.callers || [];
  const otherCallers = callers.filter((c) => c.id !== myId);
  // Until picked: callers start on their own queue, everyone else (e.g. an
  // admin) on every queue they can see. Waits for the master to decide
  // (own queue if it fails to load).
  const isCaller = callers.some((c) => c.id === myId);
  const queueOf =
    picked ?? (master || masterError ? (isCaller || otherCallers.length === 0 ? QUEUE_MINE : QUEUE_ALL) : null);
  const owner = queueOf === QUEUE_ALL ? { all_users: true } : queueOf && queueOf !== QUEUE_MINE ? { user_id: queueOf } : {};
  const queuePath = (path) => (queueOf ? path : null);
  const summary = useApiData(queuePath(CALL_QUEUE_API.summary), { ...owner, since }, { branchId });
  const list = useApiData(
    queuePath(CALL_QUEUE_API.list),
    { ...owner, page, limit: PAGE_SIZE, view, search: search || undefined, call_status: values.call_status || undefined },
    { branchId }
  );
  // Only the queue's owner logs its calls (QueueRow checks the row's owner).
  const canLog = can("leads.call");
  const counts = summary.data;
  const current = VIEWS.find((v) => v.value === view);
  const items = list.data?.items || [];

  function switchView(next) {
    setView(next);
    setPage(1);
    setActiveId(null);
  }

  function switchUser(next) {
    setPicked(next);
    setPage(1);
    setActiveId(null);
  }

  function handleLogged() {
    setActiveId(null);
    list.reload();
    summary.reload();
  }

  return (
    <div>
      <div className="wf-crumb">Pre-Sales</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Call Queue</h1>
          <p className="wf-sub">
            {queueOf === QUEUE_ALL
              ? "Every sales queue you can see — overdue callbacks first, then new leads."
              : "Leads assigned to you to call — overdue callbacks first, then new leads. Log every call's outcome."}
          </p>
        </div>
        {otherCallers.length > 0 && (
          <div className="wf-field" style={{ minWidth: 220 }}>
            <label htmlFor="queue-user">Viewing Queue Of</label>
            <select id="queue-user" className="wf-select" value={queueOf || QUEUE_MINE} onChange={(e) => switchUser(e.target.value)}>
              <option value={QUEUE_ALL}>Everyone</option>
              <option value={QUEUE_MINE}>My queue</option>
              {otherCallers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <LoadError error={masterError} onRetry={reloadMaster} />

      {branchTabs.show && (
        <BranchFilter
          branches={branchTabs.options}
          allLabel={branchTabs.allLabel}
          value={values.branch}
          onChange={(value) => filters.set("branch", value)}
        />
      )}

      <div className="wf-cards">
        <StatCard value={counts?.due} label="To call now" />
        <StatCard value={counts?.calls} label="Calls today" />
        <StatCard value={counts?.connected} label="Connected today" color="var(--green-text)" />
        <StatCard value={counts?.upcoming} label="Upcoming callbacks" color="var(--amber-text)" />
      </div>
      <LoadError error={summary.error} onRetry={summary.reload} />

      <FilterPanel filters={filters}>
        <SearchField id="queue-search" value={values.search} onChange={(v) => filters.set("search", v)} placeholder="Name, mobile or company" />
        <div className="wf-field">
          <label htmlFor="queue-filter-status">Call Status</label>
          <select
            id="queue-filter-status"
            className="wf-select"
            value={values.call_status}
            onChange={(e) => filters.set("call_status", e.target.value)}
          >
            <option value="">Any Status</option>
            {(master?.call_statuses || []).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </FilterPanel>

      <TabBar
        label="Queue view"
        tabs={VIEWS.map((v) => ({ value: v.value, label: v.label, tag: v.count ? counts?.[v.count] : undefined }))}
        value={view}
        onChange={switchView}
      />

      <Box title={`${current.label} (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && (list.loading || !queueOf) ? (
          <div className="wf-empty">Loading call queue…</div>
        ) : (
          !list.error &&
          (items.length === 0 ? (
            <div className="wf-empty">{current.empty}</div>
          ) : (
            <div className="wf-queue" aria-busy={list.loading}>
              {items.map((item) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  master={master}
                  branchId={branchId}
                  canLog={canLog && item.user_id === myId}
                  showOwner={queueOf === QUEUE_ALL}
                  active={activeId === item.id}
                  onCall={() => setActiveId(item.id)}
                  onCancel={() => setActiveId(null)}
                  onLogged={handleLogged}
                />
              ))}
            </div>
          ))
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
    </div>
  );
}

// One lead in the queue, with its call form when active: who to call on
// the left, then labelled columns — when to call, the last outcome, calls
// made — and the action; the last remark underneath.
function QueueRow({ item, master, branchId, canLog, showOwner, active, onCall, onCancel, onLogged }) {
  // Still to call: an open outcome, or a next call date (callback /
  // follow-up) whatever the last outcome.
  const open = isOpenCallStatus(master, item.call_status) || Boolean(item.next_callback_at);
  const called = item.attempts > 0;
  const phone = formatPhone(item.lead_country_code, item.lead_mobile_number);
  return (
    <div className={`wf-queue-row${active ? " active" : ""}`}>
      <div className="wf-queue-main">
        <div className="wf-queue-who">
          <div className="wf-queue-title">
            <Link href={`/leads/${item.lead_id}`} className="wf-queue-name">
              {item.lead_name}
              {item.lead_company_name ? ` · ${item.lead_company_name}` : ""}
            </Link>
            {item.lead_status_name && (
              <span title="Lead status">
                <Badge tone={leadStatusTone(item.lead_status_name)}>{item.lead_status_name}</Badge>
              </span>
            )}
          </div>
          <span className="wf-queue-meta">
            <a href={`tel:${item.lead_country_code}${item.lead_mobile_number}`} className="wf-queue-phone">
              {phone}
            </a>
            {[item.branch_name || "No branch", item.lead_source_name, showOwner && `Assigned to ${item.user_name}`]
              .filter(Boolean)
              .map((part) => (
                <span key={part}> · {part}</span>
              ))}
          </span>
        </div>

        <QueueCell label="When to call" {...whenToCall(item, open)} />
        <QueueCell
          label="Last outcome"
          value={
            called ? <Badge tone={callStatusTone(master, item.call_status)}>{callStatusLabel(master, item.call_status)}</Badge> : "Not called yet"
          }
          tone={called ? undefined : "muted"}
        />
        <QueueCell
          label="Calls made"
          value={called ? `${item.attempts} call${item.attempts === 1 ? "" : "s"}` : "None"}
          sub={called ? `Last ${formatDateTime(item.last_called_at)}` : `Assigned ${formatDateTime(item.assigned_at)}`}
        />

        {canLog && (
          <div className="wf-queue-action">
            {active ? (
              <Badge tone="current">Calling…</Badge>
            ) : (
              <button type="button" className={`wf-btn${open ? " primary" : ""}`} onClick={onCall}>
                {open ? "Log Call" : "Log Another Call"}
              </button>
            )}
          </div>
        )}
      </div>
      {item.last_remark && (
        <p className="wf-queue-remark">
          <span className="wf-queue-label">Last remark</span> “{item.last_remark}”
        </p>
      )}
      {active && <LogCallForm item={item} master={master} branchId={branchId} onCancel={onCancel} onLogged={onLogged} />}
    </div>
  );
}

// The "When to call" column: overdue callback / follow-up, a later one,
// call now (open outcome, no date) or nothing left to do (closed outcome).
function whenToCall(item, open) {
  if (!open) return { value: "No more calls", tone: "muted" };
  if (!item.next_callback_at) return { value: "Call now", tone: "now", sub: item.attempts ? "Try again" : "New lead" };
  const overdue = new Date(item.next_callback_at) <= new Date();
  return { value: overdue ? "Overdue" : "Callback", tone: overdue ? "overdue" : "later", sub: formatDateTime(item.next_callback_at) };
}

function QueueCell({ label, value, sub, tone }) {
  return (
    <div className="wf-queue-cell">
      <span className="wf-queue-label">{label}</span>
      <span className={`wf-queue-value${tone ? ` ${tone}` : ""}`}>{value}</span>
      {sub && <span className="wf-queue-sub">{sub}</span>}
    </div>
  );
}

// Log a call on a queue row (POST /call-queue/log-call): outcome, next
// call date, remark and, optionally, the lead's new status — confirmed
// first, as status changes are kept in the lead's history. The date is
// offered for open outcomes and required for "Callback scheduled"; it is
// the "Next Follow-up" (required) when the lead moves to a status that
// needs one, or stays in one and the outcome would otherwise close it.
function LogCallForm({ item, master, branchId, onCancel, onLogged }) {
  const [callStatus, setCallStatus] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [leadStatusId, setLeadStatusId] = useState("");
  const [remark, setRemark] = useState("");
  const [token, setToken] = useState(EMPTY_TOKEN);
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const outcomes = (master?.call_statuses || []).filter((s) => s.value !== CALL_STATUS.PENDING);
  const leadStatuses = (master?.lead_statuses || []).filter((s) => s.id !== item.lead_status);
  const openOutcome = isOpenCallStatus(master, callStatus);
  const newStatus = leadStatuses.find((s) => s.id === leadStatusId);
  const currentStatus = (master?.lead_statuses || []).find((s) => s.id === item.lead_status);
  const followUp = newStatus ? newStatus.needs_follow_up : Boolean(currentStatus?.needs_follow_up && callStatus && !openOutcome);
  const showCallback = Boolean(callStatus) && (openOutcome || followUp);
  const callbackRequired = followUp || callStatus === CALL_STATUS.CALLBACK;

  async function handleSave(e) {
    e.preventDefault();
    const nextStatus = leadStatuses.find((s) => s.id === leadStatusId);
    // A needs_token status (Booked) without the token: the call is logged
    // and Management is asked to approve; the status stays until then.
    const askApproval = nextStatus?.needs_token && token.bypass;
    if (
      nextStatus &&
      !(await confirm(
        askApproval
          ? {
              title: `Ask Management to approve booking ${item.lead_name}?`,
              message: `The call is logged. The lead stays ${item.lead_status_name || "as it is"} until Management approves; then it becomes ${nextStatus.name}. Any token entered is recorded now.`,
              confirmLabel: "Log call and send for approval",
              tone: "primary",
            }
          : {
              title: `Mark ${item.lead_name} as ${nextStatus.name}?`,
              message: `The call is logged and the lead's status changes from ${item.lead_status_name || "none"} to ${nextStatus.name}. The change is kept in the status history.`,
              confirmLabel: `Log call and mark as ${nextStatus.name}`,
              tone: "primary",
            }
      ))
    ) {
      return;
    }
    const done = await save.post(
      CALL_QUEUE_API.logCall,
      {
        id: item.id,
        call_status: callStatus,
        next_callback_at: showCallback ? dateTimeLocalToIso(callbackAt) : null,
        lead_status_id: leadStatusId || null,
        remark: remark.trim() || null,
        ...(nextStatus?.needs_token ? tokenBody(token) : {}),
      },
      { branchId }
    );
    if (done) onLogged();
  }

  return (
    <form className="wf-queue-log" onSubmit={handleSave} noValidate>
      <div className="wf-grid wf-grid-2">
        <div className="wf-field">
          <label htmlFor={`call-status-${item.id}`}>Call Outcome</label>
          <select
            id={`call-status-${item.id}`}
            required
            className="wf-select"
            value={callStatus}
            onChange={(e) => setCallStatus(e.target.value)}
            disabled={save.submitting}
          >
            <option value="">Select outcome</option>
            {outcomes.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <FieldError>{save.fieldErrors.call_status}</FieldError>
        </div>
        {showCallback && (
          <FutureDateTimeField
            id={`call-callback-${item.id}`}
            label={followUp ? "Next Follow-up" : "Next Callback"}
            required={callbackRequired}
            value={callbackAt}
            onChange={setCallbackAt}
            disabled={save.submitting}
            error={save.fieldErrors.next_callback_at}
          />
        )}
        <div className="wf-field">
          <label htmlFor={`call-lead-status-${item.id}`}>Change Lead Status</label>
          <select
            id={`call-lead-status-${item.id}`}
            className="wf-select"
            value={leadStatusId}
            onChange={(e) => setLeadStatusId(e.target.value)}
            disabled={save.submitting}
          >
            <option value="">Keep {item.lead_status_name || "current status"}</option>
            {leadStatuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <FieldError>{save.fieldErrors.lead_status_id}</FieldError>
        </div>
        <div className="wf-field">
          <label htmlFor={`call-remark-${item.id}`}>Remark</label>
          <input
            id={`call-remark-${item.id}`}
            className="wf-input"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="What was discussed…"
            maxLength={1000}
            disabled={save.submitting}
          />
          <FieldError>{save.fieldErrors.remark}</FieldError>
        </div>
      </div>
      {newStatus?.needs_token && (
        <TokenFields
          idPrefix={`call-${item.id}`}
          master={master}
          value={token}
          onChange={setToken}
          errors={save.fieldErrors}
          disabled={save.submitting}
        />
      )}
      <div className="wf-actions-end">
        <button type="button" className="wf-btn" onClick={onCancel} disabled={save.submitting}>
          Cancel
        </button>
        <button type="submit" className="wf-btn primary" disabled={save.submitting}>
          {save.submitting ? "Saving…" : "Save Call"}
        </button>
      </div>
      {confirmDialog}
    </form>
  );
}
