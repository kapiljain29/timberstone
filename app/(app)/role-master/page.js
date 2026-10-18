"use client";

import Link from "next/link";
import { Badge, Box, DataTable, FilterPanel, LoadError, Pagination, SearchField, StatusBadge, StatusFilterField } from "@/components/ui";
import { ROLE_API, STATUS, useRoleMaster } from "@/lib/team";
import { listTotal, useApiData, useDebouncedValue } from "@/lib/useApi";
import { statusParam, useListFilters } from "@/lib/useListFilters";
import { useCan } from "@/lib/roles";
import { useStatusToggle } from "@/lib/useStatusToggle";

const PAGE_SIZE = 20;
const FILTERS = { search: "", status: "all" };

export default function RoleMasterPage() {
  const filters = useListFilters(FILTERS);
  const { page, setPage } = filters;
  const debouncedSearch = useDebouncedValue(filters.values.search.trim());

  const list = useApiData(ROLE_API.list, {
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusParam(filters.values.status),
  });
  const { master, error: masterError, reload: reloadMaster } = useRoleMaster();
  const modules = master?.modules || [];
  const dataScopes = master?.data_scopes || [];
  const scopeLabel = (value) => dataScopes.find((d) => d.value === value)?.label || value;
  const statusToggle = useStatusToggle(ROLE_API.status, list);
  const can = useCan();

  const items = list.data?.items || [];

  function toggleRole(r) {
    statusToggle.run(r, {
      name: r.role_name,
      deactivate: "It can no longer be given to team members. You can activate it again later.",
      activate: "It can be given to team members again.",
    });
  }

  const accessSummary = (r) =>
    r.full_access ? (
      <Badge tone="done">Full access</Badge>
    ) : (
      `${new Set(r.permissions.map((p) => p.split(".")[0])).size} of ${modules.length || "…"} modules`
    );

  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Roles &amp; Permissions</h1>
          <p className="wf-sub">What each role can see and do. Changes apply to its team members right away.</p>
        </div>
        {can("roles.add") && (
          <Link href="/role-master/new" className="wf-btn primary" style={{ marginBottom: 18 }}>
            + Add Role
          </Link>
        )}
      </div>

      <LoadError error={masterError} onRetry={reloadMaster} />

      <FilterPanel filters={filters}>
        <SearchField id="role-search" value={filters.values.search} onChange={(v) => filters.set("search", v)} placeholder="Search roles" />
        <StatusFilterField id="role-status" value={filters.values.status} onChange={(v) => filters.set("status", v)} />
      </FilterPanel>

      <Box title={`Roles (${listTotal(list)})`}>
        <LoadError error={list.error} onRetry={list.reload} />
        {!list.data && list.loading ? (
          <div className="wf-empty">Loading roles…</div>
        ) : (
          !list.error && (
            <DataTable
              busy={list.loading}
              columns={["Role", "Description", "Records", "Access", "Members", "Status", ""]}
              emptyLabel={filters.active ? "No roles match these filters." : "No roles yet."}
              rows={items.map((r) => [
                <span key="n">
                  <strong>{r.role_name}</strong>
                  {r.is_system && (
                    <>
                      {" "}
                      <Badge tone="idle">System</Badge>
                    </>
                  )}
                </span>,
                r.description || "—",
                scopeLabel(r.data_scope),
                <span key="p">{accessSummary(r)}</span>,
                r.user_count,
                <StatusBadge key="s" active={r.status === STATUS.ACTIVE} />,
                r.full_access ? (
                  <span key="x" className="wf-perm-na">
                    Always full access
                  </span>
                ) : (
                  <div key="x" className="wf-btn-row">
                    {can("roles.edit") && (
                      <Link href={`/role-master/edit/${r.id}`} className="wf-link-btn">
                        Edit
                      </Link>
                    )}
                    {can("roles.status") && (
                      <button type="button" className="wf-link-btn" onClick={() => toggleRole(r)} disabled={statusToggle.submitting}>
                        {r.status === STATUS.ACTIVE ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                ),
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
