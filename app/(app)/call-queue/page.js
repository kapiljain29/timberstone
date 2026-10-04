"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Box, Badge, Annotation, leadStatusTone } from "@/components/ui";
import { getLeads, getCallLogs, getSalesReps, logCall } from "@/lib/store";
import { useRole } from "@/lib/roles";
import { QUEUE_STATUSES, CALL_OUTCOMES, CALLBACK_SLOTS, branchName } from "@/lib/data";

// Queue order: overdue callbacks first, then today's callbacks, then fresh
// leads never called, then everything else.
function priority(lead) {
  const cb = lead.nextCallback || "";
  if (cb.startsWith("Overdue")) return 0;
  if (cb.startsWith("Today")) return 1;
  if (!cb && !lead.callAttempts) return 2;
  if (!cb) return 3;
  return 4;
}

function isDueNow(lead) {
  return priority(lead) <= 3;
}

const emptyCall = { outcomeId: "", nextCallback: CALLBACK_SLOTS[1], note: "" };

export default function CallQueuePage() {
  const role = useRole();
  const [reps, setReps] = useState([]);
  const [pickedRep, setRep] = useState("");
  // A Sales rep always works their own queue; Management can view any rep's.
  const rep = role?.id === "Sales" ? role.user : pickedRep;
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [call, setCall] = useState(emptyCall);
  // Leads called in this session stay visible with their outcome, even if
  // the outcome moved them out of the queue.
  const [loggedIds, setLoggedIds] = useState({});

  function refresh() {
    setLeads(getLeads());
    setLogs(getCallLogs());
  }

  useEffect(() => {
    // Reads from localStorage, which is unavailable during SSR — must load post-mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    const salesReps = getSalesReps();
    setReps(salesReps);
    setRep(salesReps[0] || "");
    refresh();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const myLeads = useMemo(
    () =>
      leads
        .filter((l) => l.assignedRep === rep && !l.convertedProjectId)
        .filter((l) => QUEUE_STATUSES.includes(l.status) || loggedIds[l.id])
        .sort((a, b) => priority(a) - priority(b)),
    [leads, rep, loggedIds]
  );
  const dueNow = myLeads.filter((l) => isDueNow(l) || loggedIds[l.id]);
  const upcoming = myLeads.filter((l) => !isDueNow(l) && !loggedIds[l.id]);
  const myLogsToday = logs.filter((c) => c.rep === rep && c.date === "Today");
  const connectedToday = myLogsToday.filter((c) => c.connected).length;
  const pending = dueNow.filter((l) => !loggedIds[l.id]).length;

  function switchRep(next) {
    setRep(next);
    setActiveId(null);
    setLoggedIds({});
  }

  function startCall(lead) {
    setActiveId(lead.id);
    setCall(emptyCall);
  }

  function saveCall(lead) {
    const outcome = CALL_OUTCOMES.find((o) => o.id === call.outcomeId);
    if (!outcome) return;
    logCall(lead.id, { outcome, rep, nextCallback: call.nextCallback, note: call.note });
    setLoggedIds((m) => ({ ...m, [lead.id]: outcome.label }));
    setActiveId(null);
    refresh();
  }

  const selectedOutcome = CALL_OUTCOMES.find((o) => o.id === call.outcomeId);

  function renderRow(lead) {
    const logged = loggedIds[lead.id];
    const active = activeId === lead.id;
    const overdue = (lead.nextCallback || "").startsWith("Overdue");
    return (
      <div key={lead.id} className={`wf-queue-row${active ? " active" : ""}${logged ? " logged" : ""}`}>
        <div className="wf-queue-main">
          <div className="wf-queue-who">
            <Link href={`/leads/${lead.id}`} className="wf-queue-name">
              {lead.name}
            </Link>
            <span className="wf-queue-meta">
              {lead.phone} · {branchName(lead.branch)} · {(lead.productTypes || []).join(", ") || "—"} · {lead.source}
            </span>
          </div>
          <div className="wf-queue-tags">
            <Badge tone={leadStatusTone(lead.status)}>{lead.status}</Badge>
            <span className="wf-queue-attempt">Attempt #{(lead.callAttempts || 0) + (logged ? 0 : 1)}</span>
            <span className={`wf-queue-callback${overdue ? " overdue" : ""}`}>
              {lead.nextCallback || (lead.callAttempts ? "No callback set" : "New lead")}
            </span>
          </div>
          <div className="wf-queue-action">
            {logged ? (
              <Badge tone="done">Logged: {logged}</Badge>
            ) : active ? (
              <Badge tone="current">Calling…</Badge>
            ) : (
              <button type="button" className="wf-btn primary" onClick={() => startCall(lead)}>
                📞 Call
              </button>
            )}
          </div>
        </div>

        {active && (
          <div className="wf-queue-log">
            {lead.notes && <div className="wf-note" style={{ marginTop: 0 }}>Last note: {lead.notes}</div>}
            <div className="wf-grid wf-grid-3" style={{ marginTop: 10 }}>
              <div className="wf-field">
                <label>Call Outcome</label>
                <select
                  className="wf-select"
                  value={call.outcomeId}
                  onChange={(e) => setCall((c) => ({ ...c, outcomeId: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {CALL_OUTCOMES.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {selectedOutcome?.callback && (
                <div className="wf-field">
                  <label>Next Callback</label>
                  <select
                    className="wf-select"
                    value={call.nextCallback}
                    onChange={(e) => setCall((c) => ({ ...c, nextCallback: e.target.value }))}
                  >
                    {CALLBACK_SLOTS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="wf-field">
                <label>Call Note</label>
                <input
                  className="wf-input"
                  value={call.note}
                  onChange={(e) => setCall((c) => ({ ...c, note: e.target.value }))}
                  placeholder="What was discussed…"
                />
              </div>
            </div>
            <div className="wf-btn-row" style={{ justifyContent: "space-between" }}>
              <Link href={`/leads/${lead.id}`} className="wf-link-btn">
                Open lead (rough estimate / book measurement) →
              </Link>
              <div className="wf-btn-row">
                <button type="button" className="wf-btn" onClick={() => setActiveId(null)}>
                  Cancel
                </button>
                <button type="button" className="wf-btn primary" disabled={!selectedOutcome} onClick={() => saveCall(lead)}>
                  Save Call
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="wf-crumb">Pre-Sales</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Today&apos;s Call Queue</h1>
          <p className="wf-sub">Your assigned leads that need a call today, with overdue callbacks first.</p>
        </div>
        {role?.id === "Sales" ? (
          <span className="wf-role-tag" style={{ marginBottom: 18 }}>
            {rep}&apos;s queue
          </span>
        ) : (
          <div className="wf-field" style={{ minWidth: 200 }}>
            <label>Viewing Sales Rep</label>
            <select className="wf-select" value={rep} onChange={(e) => switchRep(e.target.value)}>
              {reps.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="wf-cards">
        <div className="wf-card">
          <div className="num">{pending}</div>
          <div className="label">To call now</div>
        </div>
        <div className="wf-card">
          <div className="num">{myLogsToday.length}</div>
          <div className="label">Calls today</div>
        </div>
        <div className="wf-card">
          <div className="num" style={{ color: "var(--green-text)" }}>{connectedToday}</div>
          <div className="label">Connected</div>
        </div>
        <div className="wf-card">
          <div className="num" style={{ color: "var(--amber-text)" }}>{upcoming.length}</div>
          <div className="label">Upcoming callbacks</div>
        </div>
      </div>

      <Box title={`Call Now (${dueNow.length})`} right={<span className="wf-role-tag">Sales</span>}>
        {dueNow.length === 0 ? (
          <div className="wf-empty">Queue clear. No calls due right now.</div>
        ) : (
          <div className="wf-queue">{dueNow.map(renderRow)}</div>
        )}
        <Annotation>
          Click-to-dial and call recording need a telephony provider (to be confirmed with the
          client). In this wireframe, &quot;Call&quot; just opens the outcome form. The outcome you
          save updates the lead status automatically.
        </Annotation>
      </Box>

      <Box title={`Upcoming Callbacks (${upcoming.length})`}>
        {upcoming.length === 0 ? (
          <div className="wf-empty">No callbacks scheduled for later.</div>
        ) : (
          <div className="wf-queue">{upcoming.map(renderRow)}</div>
        )}
      </Box>

      <Box title={`Today's Call Log (${myLogsToday.length})`}>
        {myLogsToday.length === 0 ? (
          <div className="wf-empty">No calls logged today.</div>
        ) : (
          <ul className="wf-list">
            {[...myLogsToday].reverse().map((c) => (
              <li key={c.id}>
                <span>
                  <strong>{c.time}</strong> · {c.leadName} · {c.outcome}
                  {c.nextCallback ? ` · callback ${c.nextCallback}` : ""}
                  {c.note ? ` · “${c.note}”` : ""}
                </span>
                <Badge tone={c.connected ? "done" : "pending"}>{c.connected ? "Connected" : "Not connected"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Box>
    </div>
  );
}
