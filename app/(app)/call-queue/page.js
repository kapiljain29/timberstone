"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Box, BranchFilter, FieldError, FilterPanel, LoadError, Pagination, SearchField, StatCard, TabBar, leadStatusTone } from "@/components/ui";
import { useConfirm } from "@/components/ConfirmDialog";
import { dateTimeLocalToIso, formatDateTime, startOfTodayIso, toDateTimeLocal } from "@/lib/format";
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
const FILTERS = { branch: "all", search: "", call_status: "" };
// Queue views (the API's `view`); `count` = the /summary key for its tab.
const VIEWS = [
  { value: "due", label: "Call Now", count: "due", empty: "Queue clear. No calls due right now." },
  { value: "upcoming", label: "Upcoming Callbacks", count: "upcoming", empty: "No callbacks scheduled for later." },
  { value: "closed", label: "Closed", empty: "No closed calls yet." },
];

// Leads assigned to a sales user, to call and log the outcome of. A sales
// user works their own queue; anyone whose data scope covers other sales
// users (team / all) can open theirs read-only.
export default function CallQueuePage() {
  const can = useCan();
  const myId = useMyUserId();
  const filters = useListFilters(FILTERS);
  const { page, setPage, values } = filters;
  const search = useDebouncedValue(values.search.trim());
  const [view, setView] = useState(VIEWS[0].value);
  // "" = the signed-in user's own queue.
  const [userId, setUserId] = useState("");
  // "Calls today" count from midnight on this device.
  const [since] = useState(startOfTodayIso);
  // The row whose call form is open.
  const [activeId, setActiveId] = useState(null);

  const branchTabs = useBranchTabs();
  const branchId = branchTabs.branchId(values.branch);
  const { master, error: masterError, reload: reloadMaster } = useCallQueueMaster(branchId);
  const otherCallers = (master?.callers || []).filter((c) => c.id !== myId);
  const owner = userId ? { user_id: userId } : {};
  const summary = useApiData(CALL_QUEUE_API.summary, { ...owner, since }, { branchId });
  const list = useApiData(
    CALL_QUEUE_API.list,
    { ...owner, page, limit: PAGE_SIZE, view, search: search || undefined, call_status: values.call_status || undefined },
    { branchId }
  );
  // Only the queue's owner logs its calls.
  const canLog = !userId && can("leads.edit");
  const counts = summary.data;
  const current = VIEWS.find((v) => v.value === view);
  const items = list.data?.items || [];

  function switchView(next) {
    setView(next);
    setPage(1);
    setActiveId(null);
  }

  function switchUser(next) {
    setUserId(next);
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
          <p className="wf-sub">Leads assigned to you to call — overdue callbacks first, then new leads. Log every call&apos;s outcome.</p>
        </div>
        {otherCallers.length > 0 && (
          <div className="wf-field" style={{ minWidth: 220 }}>
            <label htmlFor="queue-user">Viewing Queue Of</label>
            <select id="queue-user" className="wf-select" value={userId} onChange={(e) => switchUser(e.target.value)}>
              <option value="">My queue</option>
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
        {!list.data && list.loading ? (
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
                  canLog={canLog}
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

// One lead in the queue, with its call form when active.
function QueueRow({ item, master, branchId, canLog, active, onCall, onCancel, onLogged }) {
  const open = isOpenCallStatus(master, item.call_status);
  const overdue = open && item.next_callback_at && new Date(item.next_callback_at) <= new Date();
  const phone = formatPhone(item.lead_country_code, item.lead_mobile_number);
  return (
    <div className={`wf-queue-row${active ? " active" : ""}`}>
      <div className="wf-queue-main">
        <div className="wf-queue-who">
          <Link href={`/leads/${item.lead_id}`} className="wf-queue-name">
            {item.lead_name}
            {item.lead_company_name ? ` · ${item.lead_company_name}` : ""}
          </Link>
          <span className="wf-queue-meta">
            <a href={`tel:${item.lead_country_code}${item.lead_mobile_number}`}>{phone}</a>
            {" · "}
            {[item.branch_name || "No branch", item.lead_source_name, `Assigned ${formatDateTime(item.assigned_at)}`].filter(Boolean).join(" · ")}
          </span>
          {item.last_remark && <span className="wf-queue-meta">Last call: “{item.last_remark}”</span>}
        </div>
        <div className="wf-queue-tags">
          <Badge tone={callStatusTone(master, item.call_status)}>{callStatusLabel(master, item.call_status)}</Badge>
          {item.lead_status_name && <Badge tone={leadStatusTone(item.lead_status_name)}>{item.lead_status_name}</Badge>}
          <span className="wf-queue-attempt">
            {item.attempts ? `${item.attempts} call${item.attempts === 1 ? "" : "s"} · last ${formatDateTime(item.last_called_at)}` : "New lead"}
          </span>
          {open && item.next_callback_at && (
            <span className={`wf-queue-callback${overdue ? " overdue" : ""}`}>
              {overdue ? "Overdue: " : "Callback "}
              {formatDateTime(item.next_callback_at)}
            </span>
          )}
        </div>
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
      {active && <LogCallForm item={item} master={master} branchId={branchId} onCancel={onCancel} onLogged={onLogged} />}
    </div>
  );
}

// Log a call on a queue row (POST /call-queue/log-call): outcome, callback
// time (open outcomes; required for "Callback scheduled"), remark and,
// optionally, the lead's new status — confirmed first, as status changes
// are kept in the lead's history.
function LogCallForm({ item, master, branchId, onCancel, onLogged }) {
  const [callStatus, setCallStatus] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [leadStatusId, setLeadStatusId] = useState("");
  const [remark, setRemark] = useState("");
  const save = useSubmit();
  const [confirm, confirmDialog] = useConfirm();
  const outcomes = (master?.call_statuses || []).filter((s) => s.value !== CALL_STATUS.PENDING);
  const leadStatuses = (master?.lead_statuses || []).filter((s) => s.id !== item.lead_status);
  const showCallback = Boolean(callStatus) && isOpenCallStatus(master, callStatus);
  const [minCallback] = useState(() => toDateTimeLocal(new Date()));

  async function handleSave(e) {
    e.preventDefault();
    const nextStatus = leadStatuses.find((s) => s.id === leadStatusId);
    if (
      nextStatus &&
      !(await confirm({
        title: `Mark ${item.lead_name} as ${nextStatus.name}?`,
        message: `The call is logged and the lead's status changes from ${item.lead_status_name || "none"} to ${nextStatus.name}. The change is kept in the status history.`,
        confirmLabel: `Log call and mark as ${nextStatus.name}`,
        tone: "primary",
      }))
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
          <div className="wf-field">
            <label htmlFor={`call-callback-${item.id}`}>Next Callback</label>
            <input
              id={`call-callback-${item.id}`}
              type="datetime-local"
              required={callStatus === CALL_STATUS.CALLBACK}
              className="wf-input"
              min={minCallback}
              value={callbackAt}
              onChange={(e) => setCallbackAt(e.target.value)}
              disabled={save.submitting}
            />
            <FieldError>{save.fieldErrors.next_callback_at}</FieldError>
          </div>
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
