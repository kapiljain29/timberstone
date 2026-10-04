"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Badge, BranchFilter, DataTable, Annotation } from "@/components/ui";
import { getDepartments, addDepartment, getTeam, addTeamMember, updateTeamMember } from "@/lib/store";
import { BRANCHES, branchName } from "@/lib/data";

const emptyDept = { name: "", head: "", description: "" };
const emptyMember = { name: "", departmentId: "", designation: "", branch: BRANCHES[0].id, phone: "", email: "" };

export default function TeamPage() {
  const [departments, setDepartments] = useState([]);
  const [team, setTeam] = useState([]);
  const [branch, setBranch] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [dept, setDept] = useState(emptyDept);
  const [member, setMember] = useState(emptyMember);

  useEffect(() => {
    // Reads from localStorage, which is unavailable during SSR — must load post-mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    setDepartments(getDepartments());
    setTeam(getTeam());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const deptName = (id) => departments.find((d) => d.id === id)?.name || "—";

  const visibleTeam = useMemo(
    () =>
      team
        .filter((m) => branch === "all" || m.branch === branch)
        .filter((m) => deptFilter === "all" || m.departmentId === deptFilter),
    [team, branch, deptFilter]
  );

  function saveDept(e) {
    e.preventDefault();
    setDepartments(addDepartment(dept));
    setDept(emptyDept);
    setShowDeptForm(false);
  }

  function saveMember(e) {
    e.preventDefault();
    setTeam(addTeamMember(member));
    setMember(emptyMember);
    setShowMemberForm(false);
  }

  function toggleActive(m) {
    setTeam(updateTeamMember(m.id, { active: !m.active }));
  }

  function openMemberForm(departmentId = "") {
    setMember({ ...emptyMember, departmentId: departmentId || departments[0]?.id || "" });
    setShowMemberForm(true);
  }

  return (
    <div>
      <div className="wf-crumb">Admin</div>
      <div className="wf-queue-head">
        <div>
          <h1 className="wf-h1">Team &amp; Departments</h1>
          <p className="wf-sub">Set up departments and the people in each team, branch-wise.</p>
        </div>
        <div className="wf-btn-row" style={{ marginBottom: 18 }}>
          <button type="button" className="wf-btn" onClick={() => setShowDeptForm((v) => !v)}>
            + Add Department
          </button>
          <button type="button" className="wf-btn primary" onClick={() => openMemberForm()}>
            + Add Team Member
          </button>
        </div>
      </div>

      {showDeptForm && (
        <form onSubmit={saveDept}>
          <Box title="New Department">
            <div className="wf-grid wf-grid-3">
              <div className="wf-field">
                <label>Department Name</label>
                <input className="wf-input" required value={dept.name} onChange={(e) => setDept((d) => ({ ...d, name: e.target.value }))} placeholder="e.g. Procurement" />
              </div>
              <div className="wf-field">
                <label>Department Head</label>
                <select className="wf-select" value={dept.head} onChange={(e) => setDept((d) => ({ ...d, head: e.target.value }))}>
                  <option value="">Not assigned yet</option>
                  {team.filter((m) => m.active).map((m) => (
                    <option key={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="wf-field">
                <label>Responsibilities</label>
                <input className="wf-input" value={dept.description} onChange={(e) => setDept((d) => ({ ...d, description: e.target.value }))} placeholder="What this team owns" />
              </div>
            </div>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setShowDeptForm(false)}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary">
                Save Department
              </button>
            </div>
          </Box>
        </form>
      )}

      {showMemberForm && (
        <form onSubmit={saveMember}>
          <Box title="New Team Member">
            <div className="wf-grid wf-grid-3">
              <div className="wf-field">
                <label>Full Name</label>
                <input className="wf-input" required value={member.name} onChange={(e) => setMember((m) => ({ ...m, name: e.target.value }))} placeholder="e.g. Karan Mathur" />
              </div>
              <div className="wf-field">
                <label>Department</label>
                <select className="wf-select" required value={member.departmentId} onChange={(e) => setMember((m) => ({ ...m, departmentId: e.target.value }))}>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="wf-field">
                <label>Designation</label>
                <input className="wf-input" value={member.designation} onChange={(e) => setMember((m) => ({ ...m, designation: e.target.value }))} placeholder="e.g. Sales Executive" />
              </div>
              <div className="wf-field">
                <label>Branch</label>
                <select className="wf-select" value={member.branch} onChange={(e) => setMember((m) => ({ ...m, branch: e.target.value }))}>
                  {BRANCHES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.tag})
                    </option>
                  ))}
                </select>
              </div>
              <div className="wf-field">
                <label>Phone</label>
                <input className="wf-input" value={member.phone} onChange={(e) => setMember((m) => ({ ...m, phone: e.target.value }))} placeholder="+91" />
              </div>
              <div className="wf-field">
                <label>Email</label>
                <input className="wf-input" type="email" value={member.email} onChange={(e) => setMember((m) => ({ ...m, email: e.target.value }))} />
              </div>
            </div>
            <Annotation>
              Members added to the Sales department appear as Sales Reps on the lead form and in the
              Call Queue. Logins and role permissions come once the client finalizes role scoping.
            </Annotation>
            <div className="wf-actions-end">
              <button type="button" className="wf-btn" onClick={() => setShowMemberForm(false)}>
                Cancel
              </button>
              <button type="submit" className="wf-btn primary">
                Save Team Member
              </button>
            </div>
          </Box>
        </form>
      )}

      <Box title={`Departments (${departments.length})`}>
        <DataTable
          columns={["Department", "Head", "Members", "Responsibilities", ""]}
          rows={departments.map((d) => {
            const members = team.filter((m) => m.departmentId === d.id);
            return [
              <strong key={d.id + "n"}>{d.name}</strong>,
              d.head || "—",
              `${members.filter((m) => m.active).length} active`,
              d.description || "—",
              <button key={d.id + "a"} type="button" className="wf-link-btn" onClick={() => openMemberForm(d.id)}>
                + Add member
              </button>,
            ];
          })}
        />
      </Box>

      <BranchFilter branches={BRANCHES} value={branch} onChange={setBranch} />

      <Box
        title={`Team Members (${visibleTeam.length})`}
        right={
          <select className="wf-select" style={{ width: "auto" }} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        }
      >
        <DataTable
          columns={["Name", "Department", "Designation", "Branch", "Phone", "Email", "Status", ""]}
          emptyLabel="No team members match this filter."
          rows={visibleTeam.map((m) => [
            <strong key={m.id + "n"}>{m.name}</strong>,
            deptName(m.departmentId),
            m.designation || "—",
            branchName(m.branch),
            m.phone || "—",
            m.email || "—",
            <Badge key={m.id + "s"} tone={m.active ? "done" : "idle"}>
              {m.active ? "Active" : "Inactive"}
            </Badge>,
            <button key={m.id + "t"} type="button" className="wf-link-btn" onClick={() => toggleActive(m)}>
              {m.active ? "Deactivate" : "Activate"}
            </button>,
          ])}
        />
      </Box>
    </div>
  );
}
