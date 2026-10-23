@AGENTS.md

## CRITICAL RULE: DRY — Don't Repeat Yourself

Every piece of UI and logic has **one** home. Before writing code, search
for an existing component or helper and reuse or extend it — never
copy-paste and tweak.

- **Where shared code lives** (check here first):
  - `components/ui.js` — buttons, inputs, selects, cards, tables, badges,
    modals, empty / loading / error states. Screens compose these; they
    don't restyle raw HTML elements in their own way.
  - `components/` — layout and larger shared pieces (`AppShell`,
    `MobileUI`, `PhoneShell`, `Stepper`, `StageForm`, `RoleLink`,
    `ConfirmDialog` — `useConfirm()` for confirmation alerts).
  - `lib/api.js` — the only place that talks to the backend (see below).
  - `lib/` — shared helpers: formatting (dates, ₹ amounts, phone numbers),
    role/access checks (`lib/roles.js`), workflow steps (`lib/stages.js`).
- **Same thing twice → extract it.** When the same markup, hook or logic
  appears on a second screen, move it to `components/` or `lib/` in that
  change and switch both screens to it. Typical candidates: list screens
  (search + filters + pagination + table), form fields with error messages
  (`ApiError.fieldErrors`), branch switcher, status badges, file upload,
  confirm dialogs, data-loading with loading/empty/error states.
- **One way to load data:** use a shared hook / helper around `lib/api.js`
  for loading, error and empty states — don't hand-write the same
  `useEffect` + `useState` loading pattern in every screen.
- **Dropdown lists** come from the API's `/master` endpoints through one
  shared helper/hook — never fetch the same list differently on two screens.
- **No repeated literals:** route paths, role ids, status values and
  colours used in more than one file go in `lib/` constants (or CSS
  variables in `app/globals.css`).
- Web panel (`app/(app)`) and Supervisor app (`app/(mobile)`) share logic
  (`lib/`); only their presentation differs.
- **Don't over-abstract.** Share what is genuinely the same; don't build
  one component with many flags to cover screens that only look alike.
- Changing a shared component/helper → check every place that uses it
  (`get_impact_radius` / `query_graph`) in the same change.

## CRITICAL RULE: Confirm before impactful actions

Any action that is destructive, hard to undo, or affects someone other
than the person clicking must ask for confirmation first, using the
shared `useConfirm()` from `components/ConfirmDialog.js` — never
`window.confirm()` and never a hand-built modal.

- **Confirm:** delete / remove; **every status toggle — both activate and
  deactivate** (users, masters, any record whose status changes what
  appears in dropdowns or who can sign in); actions that sign
  someone out or revoke access (role change, branch removal); approve /
  reject (payment terms, credit notes); status moves that can't be walked
  back (close a project, cancel a work order, mark a lead Dead / Lost);
  bulk actions; discarding a form with unsaved changes when leaving it
  would lose real work.
- **Don't confirm:** plain saves and creates, filters, navigation, opening / cancelling a form with nothing typed.
  Too many confirmations train people to click through them.
- **Write the dialog for the decision:** title names the action and the
  record (`Deactivate Karan Mathur?`); message says what will happen and
  whether it can be undone; the confirm button repeats the verb
  (`Deactivate`, `Activate`, `Delete`, `Save and sign out`) — not "OK" /
  "Yes". `tone: "danger"` (default) for destructive actions (deactivate,
  delete), `"primary"` otherwise (activate, save and sign out).
- **Confirm before the API call**, and only once the client already knows
  the action is needed (e.g. a role edit that will sign the member out).
  The API stays the source of truth — the dialog never replaces a
  server-side check.

## CRITICAL RULE: Form fields — required marker and messages

- **Mark every required field with `*`.** Put the `required` attribute on
  its `<input>` / `<select>` / `<textarea>` (direct child of `.wf-field`)
  — `app/globals.css` adds the red `*` to the label. For a group (e.g.
  `CheckboxGroup`) pass `required`. Mark only fields the API really
  requires, and update the marker when that depends on another field
  (e.g. Branches is not shown when "All branches" is ticked). Forms keep
  `noValidate`, so the API does the checking and its messages are shown.
- **Spacing comes from the CSS:** fields in a `.wf-grid` row are spaced by
  its gap, and rows, full-width fields, `Alert` banners, `Annotation`s and
  loose buttons stacked directly in a card get the same 16px between them
  (`app/globals.css`). Don't add inline `marginTop` / `marginBottom` to
  space them. Notes and banners go above the `.wf-actions-end` row, never
  under it.
- **Show API validation messages as-is** under the field
  (`<FieldError>{fieldErrors.<param>}</FieldError>`). They already name
  the field ("Branch code is required") — never prefix the label again
  and never show a bare fragment like "is required".

## List screens: Search & Filters

Every list screen's search and filters sit in one collapsible
`FilterPanel filters={filters}` (`components/ui.js`) above the table, never
squeezed into the table box's header. It starts closed, and opens by
itself only when the screen opens with a filter already set (e.g.
`?department=`). State comes from `useListFilters(FILTERS)`
(`lib/useListFilters.js`): any change goes back to page 1, `Reset` returns
every filter (branch tabs too) to its default, and the panel header shows
how many are active. Use `SearchField` for text, `StatusFilterField` +
`statusParam()` for Active / Inactive (every master's list API takes
`status`), and a labelled `<select>` in a `.wf-field` for the rest.

## Success and error messages

Toasts (`components/Toast.js`, mounted once in `app/layout.js`) are for
success, general errors and informative messages only — **never for form
validation**. Send every submit through `useSubmit().post(path, body)`:

- **Success:** the API's message as a green toast ("Branch created
  successfully").
- **Field errors** (an error with a `param`, e.g. "Category is
  required"): shown only under the field via `fieldErrors` — no toast,
  no banner. `useSubmit` scrolls to and focuses the first one. If no field
  on the screen shows it, it falls back to a toast so a failed save is
  never silent — so render a `FieldError` for every param the form sends.
- **General errors** (no `param`: not found, no permission, server /
  network failure): a red toast.
- Actions without form fields use `useSubmit({ fieldErrorsInToast: true })`
  so every error is a toast (`useStatusToggle` does).

Pass `{ notify: false }` only when the screen shows a fuller success note
of its own (Change Password).

## Form buttons

Every form ends with one `.wf-actions-end` row: the buttons sit together
on the right, secondary first (`Cancel`, `Reset to Default`), then the
primary submit (`wf-btn primary`, labelled with the action — `Add Team
Member`, `Save Changes`). Never spread Cancel and Submit to opposite
edges. Only step-by-step wizards use `.wf-actions-end split` (← Back on
the left, the step's actions grouped on the right).

The `.wf-actions-end` row always goes **inside a card**: the last element
of the form's last `<Box>`, never loose under the cards on the page
background. A form split into several cards (e.g. `ProductForm`,
`TeamMemberForm`) puts it at the bottom of its last card. When the last
card changes from screen to screen (the `StageForm` wizard), the row gets
its own `<Box>` — as a card's only content it has no divider above it.
Buttons use the standard `.wf-btn` size — never resize them per screen.
Sign-in pages (`/login`, `/forgot-password`, `/reset-password`,
`/m/login`) keep their full-width `AuthCard` submit instead.

## CRITICAL RULE: Permissions drive the panel

Every role signs in to the web panel through the API; what it sees comes
from `session.user.permissions` ("module.action" keys from the Roles &
Permissions master), never from role names.

- **Sections:** `PANEL_ACCESS` in `lib/roles.js` maps each route to the
  permission needed to open it (`/branches` → `branches.view`,
  `/team/new` → `team.add`; `null` = every member; `false` = Super Admin
  only, for screens not on permissions yet). Add a row when you add a
  screen — the menu and the page guard (`canAccess`) both read it, and the
  member's home page is the first section in `MEMBER_HOMES` they can open.
- **Buttons:** wrap Add / Edit / Activate-Deactivate (and any other action)
  in `const can = useCan()` → `{can("branches.add") && …}`; links into
  another module check that module (`can("team.view")`). Hide what the
  user can't do — the API still refuses it (403) if they try.
- **Fresh:** `AppShell` calls `refreshProfile()` (`POST
  /api/admin/account/me`) on load, so permission changes show without
  signing in again. Super Admin always has every permission.

## Branch access and branch tabs

Branch access is set **per member** on the Team form (not by the role):
"All branches" (every branch, incl. ones added later) or ticked branches.
Super Admins always have every branch. The signed-in user's access is in
the session — `useMyBranches()` (`lib/roles.js`) → `{ allBranches,
branches }`, refreshed on every page load.

- **Branch tabs** (`BranchFilter`) on a list screen show only the user's
  own branches: use `useBranchTabs()` (`lib/team.js`) — never the
  `/master` list of all branches. Spread `tabs.params(value)` into the
  list request: the "all" tab is every branch for all-branch members and
  "All My Branches" (`branch_ids`) for everyone else. Show the bar only
  when `tabs.show` (more than one branch).
- **Granting access** (Team form): only all-branch editors see the "All
  branches" checkbox, and others are offered only their own branches — the
  API refuses anything more (403).

## Phone numbers

Every phone / mobile field is a country code + national number, entered
with the shared `PhoneField` (`components/ui.js`) and helpers in
`lib/phone.js`. The country code list is the API's `country_codes` from
the form's `/master` (never typed into the screen); `""` in form state
means the list's `default` code, and the resolved code is sent with the
number (`country_code` + `mobile_number`, or `phone_country_code` +
`phone` on branches). The API builds `…_with_country_code` — never send
it. Lists show the number with `formatPhone(code, number)`.

## Calling the Timberstone API

- Every backend call goes through `lib/api.js` (`api.get/post/put/patch/delete`,
  `login`, `logout`, `getSession`, `setActiveBranch`, `onSessionChange`).
  Never call `fetch()` against the API directly — `lib/api.js` handles the
  `{ is_crypto, req }` / `{ response }` envelope, AES (when
  `NEXT_PUBLIC_API_CRYPTO=1`), the Bearer token and `x-branch-id`.
- Access tokens are refreshed automatically: on a 401, `lib/api.js` calls
  `POST /api/public/auth/refresh` once (shared across concurrent calls) and
  retries; if the refresh token is rejected the session is cleared and
  `AppShell` sends the user to `/login`.
- Calls resolve with the API's `result`; failures throw `ApiError`
  (`status`, `errors` = `[{ param, msg }]`, `fieldErrors` = `{ field: msg }`
  for form validation messages).
- Config lives in `.env.local` (template: `.env.example`). `NEXT_PUBLIC_*`
  values are inlined at build time and visible in the browser.

## CRITICAL RULE: No hardcoded data once a screen is on the API

The wireframe runs on mock data (`lib/data.js` seed/constants,
`lib/store.js` localStorage "database", demo users in `lib/roles.js`).
We move to the real API **screen by screen**. When a screen is wired to
the API:

- **Every business value comes from the API** — records (leads, projects,
  call logs, team, architects, DSRs, notifications…), counts and dashboard
  numbers, and master lists (lead statuses, product types, lead sources,
  budget bands, branches, departments, queue statuses, call outcomes,
  callback slots, payment terms). Nothing is typed into the file.
- **The signed-in user comes from the session** (`getSession()` /
  `onSessionChange` in `lib/api.js`): name, role, allowed branches, active
  branch. No demo names, emails or role ids in the screen.
- **Remove that screen's imports of `lib/data.js` and `lib/store.js`**
  (and of the components it uses, if they read mock data). A migrated
  screen must not fall back to mock data when the API fails or returns
  nothing — show an error or empty state instead.
- **Handle all states:** loading, empty, error (show `ApiError` messages;
  use `fieldErrors` under form fields), and no-access (403/404).
- **Endpoint missing?** Do not invent a response shape or hardcode a
  stand-in. Leave the screen on mock data, and note the endpoint it needs
  in the status table below.
- **Clean up:** when the last screen stops using a mock export in
  `lib/data.js` / `lib/store.js`, delete that export.
- **Update the status table** below in the same change.

Allowed to stay in code: UI copy and labels, icons, colours, route paths,
layout constants, and the workflow step definitions in `lib/stages.js`
(until the API serves them — then they move too).

### Screen migration status

`mock` = still on wireframe data · `partial` = partly on the API (see notes) · `api` = fully on the API.

| Screen | Route | Status | Endpoints needed / notes |
|---|---|---|---|
| Web panel login | `/login` | api | `POST /api/public/auth/login`. Super Admin → full panel; every other role → "Member" panel built from its permissions (`lib/roles.js` `PANEL_ACCESS`). A role with no panel permissions gets a "no access yet" notice; Supervisors are pointed to the mobile app |
| Forgot password | `/forgot-password` | api | `POST /api/public/auth/forgot-password` |
| Reset password (emailed link) | `/reset-password?token=` | api | `POST /api/public/auth/verify-reset-token`, `POST /api/public/auth/reset-password` |
| Supervisor login | `/m/login` | mock | `POST /auth/login` (exists) |
| Panel shell (user, role menu, bell) | `components/AppShell.js` | partial | Signed-in user + sign-out (revokes refresh token) from the API session; demo role switcher only without a session. Bell + sidebar badge = the user's notifications (`useBellNotifications()` in `lib/notifications.js` — `/notifications/list`, polled every minute and reloaded after `notificationsChanged()`; opening one marks it read); demo roles without a session keep the sample `NOTIFICATIONS`. Needs: branch switcher (branch list already comes in the login response, in `session.branches`) |
| Dashboard | `/dashboard` | api | `POST /api/admin/dashboard/summary` (`since` = start of today on the device; branch tabs via `x-branch-id` like leads). Open to every member — it is their home page after sign-in. The API returns one section per permission (null otherwise), already limited to the user's branches and data scope: `leads` (Leads → View: totals, new today, unassigned only with Leads → Assign, by status / by source, latest 5), `call_queue` (Leads → Edit: their own queue counts), `designs` (Design Requests → View: by status, latest 5). Counts link to the filtered lists (`/leads?status=` / `?source=` / `?assigned=unassigned`, `/design-requests?status=`). Latest notifications from `useBellNotifications()`. Projects, approvals and DSR tiles come back when those modules are on the API |
| Call queue | `/call-queue` | api | `POST /api/admin/call-queue/list` (`view` due / upcoming / closed as tabs, search, `call_status`, `user_id`; branch tabs via the `x-branch-id` header like leads), `/summary` (header cards; `since` = start of today on the device), `/master` (`callers`, `call_statuses` `{ value, label, open }`, `lead_statuses` — `useCallQueueMaster()` in `lib/team.js`). A lead lands here when it is assigned to a sales-role user (`/leads/assign`). The queue owner (`leads.edit`) logs each call inline → `/call-queue/log-call` `{ id, call_status, next_callback_at, lead_status_id, remark }` (callback time for open outcomes, required for "Callback scheduled"; changing the lead status is confirmed). "Viewing Queue Of" lists the other `callers` (team / all data scope) — their queues are read-only. Click-to-dial / recording still need a telephony provider |
| Leads list | `/leads` | api | `POST /api/admin/leads/list` (search, `status`, `lead_source_id`, `assigned_to`, `unassigned`, `project_type`, `work_type`, `budget`, `planning_to_start`), filter lists from `/leads/master` (`useLeadMaster()` in `lib/team.js`). Leads are scoped by the `x-branch-id` header, not a body field: branch tabs use `useBranchTabs().branchId(value)` (the branch, or `ALL_BRANCHES` = every branch the user has) passed as `useApiData(…, { branchId })`. Assigned To filter: Anyone / Unassigned (only with `leads.assign` — a branch lead manager's queue) / a person (`assignees`). With `leads.assign`: row checkboxes + "Assign N leads" (`components/LeadAssignForm.js`, `team_assignees`, confirmed first) → `POST /leads/assign` `{ lead_ids, assigned_to, remark }`. `?branch=` / `?assigned=unassigned` / `?status=` / `?source=` preselect |
| New lead / Edit lead | `/leads/new`, `/leads/edit/[id]` | api | Form in `components/LeadForm.js` (shared; discard-changes confirm on Cancel). `POST /leads/create` (sent with the picked branch as `x-branch-id`; Assigned To = `assignees` from `/leads/master` for that branch, "Me" = the signed-in user; optional first status from `lead_statuses`) and `/leads/update` (Edit loads `/leads/details`; branch, status and assignees can't change there). Lead source + sub-source from `/leads/master` (`lead_sub_sources` of the sent `lead_source_id`), Requirement in Cladding = main categories (`useCategoryOptions()`), option lists (`project_types`, `work_types`, `estimated_areas`, `budgets`, `planning_to_start`) from the master. The wireframe's Architect, Design Required, Project Reference and Notes fields are left out until leads store them (`architect_id` etc. — not in the API yet) |
| Lead detail | `/leads/[id]` | api | `POST /leads/details`, `/leads/status-history`, `/leads/assignment-history` (all with `x-branch-id: all`), Change Status (`leads.edit`, confirmed) → `/leads/update-status` `{ id, status, remark }`, Assign (`leads.assign`) → `/leads/assign`. Meta Lead Ad box (campaign, form, `user_answers`) for Meta leads. Design section (`components/LeadDesign.js`, `designs.view`): "Design required?" → designer (`designers` from `/design-requests/master` for the lead's branch) + brief → `/design-requests/create` (`designs.add`, confirmed); the request's files and activity (`components/DesignRequestView.js`); Review Design → `/design-requests/review` approve / ask for changes (`designs.approve`, comment required for changes, confirmed). Call History → `/call-queue/history` (labels from `useCallQueueMaster()`). The wireframe's Step 2 (rough estimate, discussion notes), Step 3 (measurement, advance payment, sales operator) and Convert to Project are left out until the API has them (rough-estimate / measurement fields on leads, projects) |
| Design requests | `/design-requests`, `/design-requests/[id]` | api | `POST /api/admin/design-requests/list` (search, `design_status`; branch tabs via the `x-branch-id` header like leads), `/details`, `/master` (`designers`, `design_statuses`, `file_types` — `useDesignMaster()` in `lib/team.js`). The designer uploads JPEG / DWG files on the request page → `/design-requests/upload` — **multipart** via `useSubmit().upload(path, formData)` / `api.upload` (not the JSON envelope); only the request's designer (or Super Admin), while it is pending / changes requested. JPEG previews load from the API's `UPLOAD_BASE_URL`. Notifications link here (`?status=` preselects the status filter) |
| Projects list | `/projects` | mock | |
| Project detail | `/projects/[id]` | mock | |
| Project stage form | `/projects/[id]/stage/[slug]` | mock | |
| Branches | `/branches` | api | `POST /api/admin/branches/list`, `/create`, `/update`, `/status`, `/master` (country codes, `lead_managers`). Lead Manager dropdown = `lead_managers` with `all_branches` or this branch in `branch_ids`. Optional GST number (GSTIN format, not unique). Members link opens `/team?branch=<id>` |
| Departments | `/departments` | api | `POST /api/admin/departments/list`, `/create`, `/update`, `/status`; head dropdown from `POST /api/admin/team/master` (`users`) |
| Team members | `/team`, `/team/new`, `/team/edit/[id]` | api | `POST /api/admin/team/list` (separate `name` / `email` / `mobile` search in a filters box above the table), `/details` (one member, for the Edit page), `/create`, `/update`, `/status`, `/master` (departments, branches, roles, users — `users` also feeds the optional Reporting Manager dropdown). Add and Edit are their own pages, `/team/new` and `/team/edit/[id]` (`team.edit`; form in `components/TeamMemberForm.js`, shared by both); `?department=<id>` preselects the department on the list and on Add; `?branch=<id>` preselects the list's branch filter. Branch access per member: "All branches" checkbox (all-branch editors only) or ticked branches (others are offered only their own); changing it signs the member out (confirmed first). Branch tabs = `useBranchTabs()` |
| Change password | `/account/change-password` | api | `POST /api/admin/account/change-password` (any role). Linked from the key icon next to Sign out in the sidebar footer (API sessions only). Supervisor app (`/m/profile`) still needs its own link when it moves to the API |
| Roles & Permissions | `/role-master`, `/role-master/new`, `/role-master/edit/[id]` | api | `POST /api/admin/roles/list`, `/details`, `/create`, `/update`, `/status`, `/master` (permission modules). Menus, page access and buttons follow `user.permissions` (see "Permissions drive the panel"). The form also sets the role's data scope (own / team / all — `data_scopes` from `/roles/master`); session `user.dataScope` carries it. Roles no longer carry branch access (moved to the member). Add and Edit are their own pages (form + permission matrix in `components/RoleForm.js`, discard-changes confirm on Cancel); the Super Admin role's Edit page shows a notice instead of the form |
| Architects | `/architects` | api | `POST /api/admin/architects/list` (search, `branch_id`, `status`), `/create`, `/update`, `/status`, `/master` (branches, country codes). The wireframe's "Leads Referred" / "Booked" columns are left out until leads record their architect (`architect_id` on leads — then the lead form gets its Architect dropdown back). Branch tabs = `useBranchTabs()` (the user's branches; "All My Branches" also lists architects with no branch) |
| Categories | `/categories` | api | `POST /api/admin/categories/list` (search, `type` main/sub), `/create`, `/update`, `/status`; Parent Category dropdown from `/categories/master` (active main categories, `useCategoryOptions()` in `lib/team.js`) |
| Lead Sources | `/lead-sources` | api | `POST /api/admin/lead-sources/list` (search, flat main + sub), `/create`, `/update`, `/status`; Parent Lead Source dropdown from `/lead-sources/master` (`useLeadSourceOptions()` in `lib/team.js`); the lead form reads lead sources from `/leads/master` instead |
| Lead Statuses | `/lead-statuses` | api | `POST /api/admin/lead-statuses/list` (search, `status`), `/create`, `/update` (name only), `/status`. The lead form, list filter and lead detail read statuses from `/leads/master` (`lead_statuses`) |
| Colors | `/colors` | api | `POST /api/admin/colors/list` (search by name / code, `status`), `/create`, `/update`, `/status`. Code is free text (hex, RAL …), shown as text. `/colors/master` (active `{ id, name, code }`, `useColorOptions()` in `lib/team.js`) is for product / quotation color dropdowns |
| Products | `/products`, `/products/new`, `/products/edit/[id]`, `/products/colors/[id]` | api | `POST /api/admin/products/list` (search, `category_id`, `status`), `/details`, `/create`, `/update`, `/status`, `/master` (`categories`, plus `sub_categories` of the sent `category_id` — `useProductMaster()` in `lib/team.js`). Add and Edit are their own pages (form in `components/ProductForm.js`, discard-changes confirm on Cancel); Edit loads the product with `/details`. Spec fields (coverage, thickness, kgs per sq.ft, dimensions — `PRODUCT_SPECS`) are optional free text. Colors column (`color_count`) and a Colors action → `/products/colors/[id]`: tick the colors (active colors from the Color master via `useColorOptions()`, plus any since-deactivated ones the product keeps) and save the whole set at once — `POST /products/colors` (read, products.view) and `/products/colors/save` `{ product_id, color_ids }` (products.edit; read-only without it). "+ New color" on that page (colors.add) creates the color via `POST /api/admin/colors/create` and ticks it; Save Colors still saves the set |
| Site Settings | `/settings` | api | `POST /api/admin/settings/master` (option lists, WhatsApp events / languages, country codes, logo / favicon file types — `useSettingsMaster()` in `lib/team.js`), `/details` `{ group }` per tab (values in use + `sources`: saved / env / default / null), `/update` `{ group, ...fields }`, `/clear` `{ group, key }`, `/test-email`, `/test-whatsapp`, `/branding` (multipart `kind` + `file`, sent after a successful save). Tabs: General, Email (SMTP), Email Notifications, WhatsApp, Integrations, Security & Uploads — each its own form; leaving a tab with unsaved changes is confirmed. Secrets (SMTP password, WhatsApp / Meta tokens) are never returned: the field starts blank (blank on save keeps the stored one), its hint comes from `sources` ("Saved here" + Clear saved value / "Using the server's .env value" / "Not set"), and Clear is confirmed. Turning WhatsApp / Meta Lead Ads on or off is confirmed on save. WhatsApp status shows the number / name the API reads from Meta (`connected`, or `connected_error`); the webhook callback URL comes from the API (`webhook_url`). `settings.view` opens the screen (read-only, fields disabled); `settings.edit` shows Save / Clear / test sends / Regenerate |
| Notifications | `/notifications` | api | `POST /api/admin/notifications/list` (`unread_only` — All / Unread tabs), `/mark-read` (`ids`, or none = all). The wireframe's "Configured Notification Events" reference list is left out |
| Role-wise workflow | `/roles` | mock | |
| Supervisor home | `/m` | mock | |
| Supervisor projects | `/m/projects`, `/m/projects/[id]` | mock | |
| Supervisor step form | `/m/projects/[id]/step/[slug]` | mock | |
| DSR | `/m/dsr` | mock | |
| Supervisor alerts | `/m/notifications` | mock | |
| Supervisor profile | `/m/profile` | mock | |

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
