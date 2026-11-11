"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LoadError } from "@/components/ui";
import { MEmpty, MIcon, MSectionTitle } from "@/components/MobileUI";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useSupervisorSite } from "@/lib/team";

// One of the supervisor's sites (POST /api/mobile/sites/details): customer,
// address, and the steps they handle — for now the Measurement step. The
// other steps come back here as each is built on the API.
export default function MobileSiteDetailPage() {
  const { id } = useParams();
  const site = useSupervisorSite(id);
  const s = site.data;

  if (!s) {
    return (
      <div>
        <Link href="/m/sites" className="wf-mback">
          <MIcon name="back" size={16} /> My Sites
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

  const lead = s.lead || {};
  const latest = s.measurements[0] || null;

  return (
    <div>
      <Link href="/m/sites" className="wf-mback">
        <MIcon name="back" size={16} /> My Sites
      </Link>

      <div className="wf-mproj-hero">
        <div className="wf-mproj-hero-id">{s.site_code}</div>
        <h1 className="wf-mproj-hero-title">{s.site_name}</h1>
        <div className="wf-mproj-hero-meta">
          <span>
            <MIcon name="user" size={13} /> {lead.company_name ? `${lead.full_name} · ${lead.company_name}` : lead.full_name}
          </span>
          {lead.mobile_number && (
            <a href={`tel:${lead.country_code || ""}${lead.mobile_number}`}>
              <MIcon name="phone" size={13} /> {formatPhone(lead.country_code, lead.mobile_number)}
            </a>
          )}
        </div>
        <div className="wf-mproj-hero-steps" style={{ whiteSpace: "pre-line" }}>
          <MIcon name="pin" size={13} /> {s.address}
        </div>
      </div>

      {latest ? (
        <Link href={`/m/sites/${s.id}/measurement`} className="wf-mnext done">
          <span className="wf-mnext-label">
            Measurement uploaded · v{latest.version}
            <strong>{formatDateTime(latest.submitted_at)}</strong>
          </span>
          <span className="wf-mnext-go">
            <MIcon name="chevron" size={18} />
          </span>
        </Link>
      ) : (
        <Link href={`/m/sites/${s.id}/measurement`} className="wf-mnext">
          <span className="wf-mnext-label">
            Up next · Your task
            <strong>Upload the measurement</strong>
          </span>
          <span className="wf-mnext-go">
            <MIcon name="chevron" size={18} />
          </span>
        </Link>
      )}

      <MSectionTitle>Steps</MSectionTitle>
      <div className="wf-mtimeline">
        <Link href={`/m/sites/${s.id}/measurement`} className={`wf-mtimeline-row ${latest ? "done" : "current"}`}>
          <span className="wf-mtimeline-dot">{latest ? <MIcon name="check" size={14} /> : <MIcon name="ruler" size={14} />}</span>
          <span className="wf-mtimeline-body">
            <span className="wf-mtimeline-title">Measurement</span>
            <span className="wf-mtimeline-meta">
              {latest ? `v${latest.version} by ${latest.submitted_by_name || "—"}` : <span className="wf-mtag">Your task</span>}
            </span>
          </span>
          <span className="wf-mtimeline-chev">
            <MIcon name="chevron" size={16} />
          </span>
        </Link>
      </div>
      <p className="wf-msub">The other steps will appear here as they go live.</p>

      <MSectionTitle>Site</MSectionTitle>
      <div className="wf-mlist">
        <div className="wf-mlist-row">
          <span className="wf-mlist-text">Operation Head</span>
          <span className="wf-mlist-step">{s.operation_head_name || "—"}</span>
        </div>
        <div className="wf-mlist-row">
          <span className="wf-mlist-text">Expected Start</span>
          <span className="wf-mlist-step">{formatDate(s.expected_start_date)}</span>
        </div>
        <div className="wf-mlist-row">
          <span className="wf-mlist-text">Branch</span>
          <span className="wf-mlist-step">{s.branch_name || "—"}</span>
        </div>
      </div>
    </div>
  );
}
