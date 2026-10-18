"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Box, BranchFilter, DataTable, FilterPanel, LoadError, Pagination, SearchField, StatusBadge, StatusFilterField } from "@/components/ui";
import { formatPhone } from "@/lib/phone";
import { STATUS, TEAM_API, toBranchFilterOptions, useTeamMaster } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { statusParam, useListFilters } from "@/lib/useListFilters";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const FILTERS = { branch: "all", name: "", email: "", mobile: "", department: "all", role: "all", status: "all" };

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
  const filters = useListFilters(FILTERS, {
    ...(params.get("branch") && { branch: params.get("branch") }),
    ...(params.get("department") && { department: params.get("department") }),
  });
  const { page, setPage } = filters;
  const { branch, department: deptFilter } = filters.values;
  const name = useDebouncedValue(filters.values.name.trim());
  const email = useDebouncedValue(filters.values.email.trim());
  const mobile = useDebouncedValue(filters.values.mobile);

  const { master, error: masterError, reload: reloadMaster } = useTeamMaster();
  const list = useApiData(TEAM_API.list, {
    page,
    limit: PAGE_SIZE,
    name: name || undefined,
    email: email || undefined,
    mobile: mobile || undefined,
    branch_id: branch === "all" ? undefined : branch,
    department_id: deptFilter === "all" ? undefined : deptFilter,
    role_id: filters.values.role === "all" ? undefined : filters.values.role,
    status: statusParam(filters.values.status),
  });
  const can = useCan();
  // Also reload the master: Department Head / Reporting Manager lists show active members only.
  const statusToggle = useStatusToggle(TEAM_API.status, list, reloadMaster);

  const items = list.data?.items || [];
  const roles = master?.roles || [];
  const addHref = deptFilter === "all" ? "/team/new" : `/team/new?department=${encodeURIComponent(deptFilter)}`;


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


      {master && master.branches.length > 0 && (
        <BranchFilter branches={toBranchFilterOptions(master.branches)} value={branch} onChange={(value) => filters.set("branch", value)} />
      )}

      <FilterPanel filters={filters}>
        <SearchField id="team-search-name" label="Name" value={filters.values.name} onChange={(v) => filters.set("name", v)} placeholder="e.g. Karan" />
        <SearchField
          id="team-search-email"
          label="Email"
          value={filters.values.email}
          onChange={(v) => filters.set("email", v)}
          placeholder="e.g. karan@timberstone.in"
        />
        <SearchField
          id="team-search-mobile"
          label="Mobile"
          inputMode="numeric"
          value={filters.values.mobile}
          onChange={(v) => filters.set("mobile", v.replace(/\D/g, ""))}
          placeholder="Any part of the number"
        />
        <div className="wf-field">
          <label htmlFor="team-filter-dept">Department</label>
          <select id="team-filter-dept" className="wf-select" value={deptFilter} onChange={(e) => filters.set("department", e.target.value)}>
            <option value="all">All Departments</option>
            {(master?.departments || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.department_name}
              </option>
            ))}
          </select>
        </div>
        <div className="wf-field">
          <label htmlFor="team-filter-role">Role</label>
          <select id="team-filter-role" className="wf-select" value={filters.values.role} onChange={(e) => filters.set("role", e.target.value)}>
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.role_name}
              </option>
            ))}
          </select>
        </div>
        <StatusFilterField id="team-filter-status" value={filters.values.status} onChange={(v) => filters.set("status", v)} />
      </FilterPanel>

      <Box title={`Team Members (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading team members…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
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
                    <Link href={`/team/edit/${m.id}`} className="wf-link-btn">
                      Edit
                    </Link>
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
