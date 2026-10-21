// A design request's brief, thread and files (POST
// /api/admin/design-requests/details) — on the lead page (Sales) and the
// designer's request page. Presentational: actions live on those pages.

import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { designStatusLabel, designStatusTone } from "@/lib/team";

// What each thread entry means (design_request_comments.action).
const ACTION_TEXT = {
  requested: "sent the design request",
  submitted: "uploaded the design",
  changes_requested: "asked for changes",
  approved: "approved the design",
};

function fileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Status badge for a request.
export function DesignStatusBadge({ master, status }) {
  return <Badge tone={designStatusTone(status)}>{designStatusLabel(master, status)}</Badge>;
}

export default function DesignRequestView({ request, master }) {
  // Files by upload round, newest round first.
  const rounds = [...new Set(request.files.map((f) => f.round))].sort((a, b) => b - a);

  return (
    <>
      <p className="wf-sub">
        <DesignStatusBadge master={master} status={request.design_status} /> Designer: <strong>{request.designer_name}</strong> · Sent by{" "}
        {request.requested_by_name || "—"} on {formatDateTime(request.created_at)}
      </p>

      <div className="wf-field">
        <label>Design Brief</label>
        <p style={{ whiteSpace: "pre-line", margin: 0 }}>{request.details}</p>
      </div>

      <div className="wf-field">
        <label>Design Files</label>
        {!rounds.length ? (
          <div className="wf-empty">No files uploaded yet.</div>
        ) : (
          rounds.map((round) => (
            <div key={round}>
              <p className="wf-sub">
                Upload {round}
                {round === request.round ? " (latest)" : ""}
              </p>
              <div className="wf-tiles">
                {request.files
                  .filter((f) => f.round === round)
                  .map((f) => (
                    <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" className="wf-tile" download={f.original_name}>
                      {f.file_type === "jpeg" && (
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded file on the API server
                        <img src={f.url} alt={f.original_name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4 }} />
                      )}
                      <span className="wf-tile-text">
                        <span className="wf-tile-label">{f.original_name}</span>
                        <span className="wf-tile-hint">
                          {f.file_type.toUpperCase()} · {fileSize(f.file_size)}
                        </span>
                      </span>
                    </a>
                  ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="wf-field">
        <label>Activity</label>
        <ul className="wf-list">
          {[...request.comments].reverse().map((c) => (
            <li key={c.id}>
              <span>
                <strong>{c.created_by_name || "Someone"}</strong> {ACTION_TEXT[c.action] || c.action}
                {c.comment && c.action !== "requested" && (
                  <span className="wf-sub" style={{ display: "block", whiteSpace: "pre-line" }}>
                    “{c.comment}”
                  </span>
                )}
              </span>
              <span style={{ color: "var(--idle)", fontSize: 11 }}>{formatDateTime(c.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
