"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Box, BranchFilter, DataTable, LoadError, Pagination, StatusBadge } from "@/components/ui";
import TeamMemberForm from "@/components/TeamMemberForm";
import { formatPhone } from "@/lib/phone";
import { STATUS, TEAM_API, toBranchFilterOptions, useTeamMaster } from "@/lib/team";
import { useApiData, useDebouncedValue } from "@/lib/useApi";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;

// ?department=<id> / ?branch=<id> preselect the department / branch filter
// (links from the Departments and Branches pages, and back from Add Team
// Member).
export default function TeamPage() {
  return (
    <Suspense fallback={<div className="wf-empty">Loading…</div>}>
      <TeamMembers />
    </Suspense>
  );
}

function TeamMembers() {
  const params = useSearchParams();
  const [branch, setBranch] = useState(() => params.get("branch") || "all");
  const [deptFilter, setDeptFilter] = useState(() => params.get("department") || "all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // member being edited inline, or null
  const debouncedSearch = useDebouncedValue(search.trim());

  const { master, error: masterError, reload: reloadMaster } = useTeamMaster();
  const list = useApiData(TEAM_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    branch_id: branch === "all" ? undefined : branch,
    department_id: deptFilter === "all" ? undefined : deptFilter,
    role_id: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter === "all" ? undefined : Number(statusFilter),
  });
  const can = useCan();
  const statusToggle = useStatusToggle(TEAM_API.status, () => {
    list.reload();
    reloadMaster(); // Department Head / Reporting Manager lists show active members only
  });

  const items = list.data?.items || [];
  const roles = master?.roles || [];
  const addHref = deptFilter === "all" ? "/team/new" : `/team/new?department=${encodeURIComponent(deptFilter)}`;

  // Any filter change goes back to page 1.
  function filter(setter) {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  function onEdited() {
    setEditing(null);
    list.reload();
    reloadMaster(); // Department Head list includes members
  }

  function toggleMember(m) {
    statusToggle.run(m, {
      name: m.name,
      deactivate: "They will be signed out on all devices and won't be able to sign in until you activate them again.",
      activate: "They will be able to sign in again with their email and password, with their current role and branches.",
    });
  }

  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Team Members</h1>
          <p className="wf-sub">
            The people in each department and the branches they work in. Each member signs in with their email.
          </p>
        </div>
        {can("team.add") && (
          <Link href={addHref} className="wf-btn primary" style={{ marginBottom: 18 }}>
            + Add Team Member
          </Link>
        )}
      </div>

      <LoadError error={masterError} onRetry={reloadMaster} />

      {editing && (
        <TeamMemberForm key={editing.id} member={editing} master={master} onSaved={onEdited} onCancel={() => setEditing(null)} />
      )}

      {master && master.branches.length > 0 && (
        <BranchFilter branches={toBranchFilterOptions(master.branches)} value={branch} onChange={filter(setBranch)} />
      )}

      <Box
        title={`Team Members (${list.data?.pagination.total ?? "…"})`}
        right={
          <div className="wf-btn-row">
            <input
              className="wf-input"
              style={{ width: 200 }}
              type="search"
              placeholder="Search name, email, mobile"
              value={search}
              onChange={(e) => filter(setSearch)(e.target.value)}
            />
            <select className="wf-select" style={{ width: "auto" }} value={deptFilter} onChange={(e) => filter(setDeptFilter)(e.target.value)}>
              <option value="all">All Departments</option>
              {(master?.departments || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.department_name}
                </option>
              ))}
            </select>
            <select className="wf-select" style={{ width: "auto" }} value={roleFilter} onChange={(e) => filter(setRoleFilter)(e.target.value)}>
              <option value="all">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.role_name}
                </option>
              ))}
            </select>
            <select className="wf-select" style={{ width: "auto" }} value={statusFilter} onChange={(e) => filter(setStatusFilter)(e.target.value)}>
              <option value="all">Any Status</option>
              <option value={STATUS.ACTIVE}>Active</option>
              <option value={STATUS.INACTIVE}>Inactive</option>
            </select>
          </div>
        }
      >
        <LoadError error={list.error} onRetry={list.reload} />
        <Alert>{statusToggle.error}</Alert>
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading team members…</div>
        ) : (
          !list.error && (
            <DataTable
              columns={["Name", "Role", "Department", "Designation", "Reports To", "Branches", "Mobile", "Email", "Status", ""]}
              emptyLabel="No team members match these filters."
              rows={items.map((m) => [
                <strong key="n">{m.name}</strong>,
                m.role_name,
                m.department_name || "—",
                m.designation || "—",
                m.reporting_manager_name || "—",
                m.all_branches ? "All branches" : m.branches.map((b) => b.name).join(", ") || "—",
                formatPhone(m.country_code, m.mobile_number),
                m.email,
                <StatusBadge key="s" active={m.status === STATUS.ACTIVE} />,
                <div key="a" className="wf-btn-row">
                  {can("team.edit") && (
                    <button type="button" className="wf-link-btn" onClick={() => setEditing(m)}>
                      Edit
                    </button>
                  )}
                  {can("team.status") && (
                    <button type="button" className="wf-link-btn" onClick={() => toggleMember(m)} disabled={statusToggle.submitting}>
                      {m.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>,
              ])}
            />
          )
        )}
        <Pagination pagination={list.data?.pagination} onPage={setPage} disabled={list.loading} />
      </Box>
      {statusToggle.confirmDialog}
    </div>
  );
}
