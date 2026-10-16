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
  (e.g. Branches is not shown for all-branch roles). Forms keep
  `noValidate`, so the API does the checking and its messages are shown.
- **Show API validation messages as-is** under the field
  (`<FieldError>{fieldErrors.<param>}</FieldError>`). They already name
  the field ("Branch code is required") — never prefix the label again
  and never show a bare fragment like "is required".

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
| Web panel login | `/login` | api | `POST /api/public/auth/login`. Only `super_admin` can sign in for now; other roles get a "not available yet" notice — add them to `API_ROLE_TO_WEB` in `lib/roles.js` as their panels move to the API |
| Forgot password | `/forgot-password` | api | `POST /api/public/auth/forgot-password` |
| Reset password (emailed link) | `/reset-password?token=` | api | `POST /api/public/auth/verify-reset-token`, `POST /api/public/auth/reset-password` |
| Supervisor login | `/m/login` | mock | `POST /auth/login` (exists) |
| Panel shell (user, role menu, bell) | `components/AppShell.js` | partial | Signed-in user + sign-out (revokes refresh token) from the API session; demo role switcher only without a session. Needs: branch switcher (branch list already comes in the login response, in `session.branches`), notifications count |
| Dashboard | `/dashboard` | mock | |
| Call queue | `/call-queue` | mock | |
| Leads list | `/leads` | mock | |
| New lead | `/leads/new` | mock | |
| Lead detail | `/leads/[id]` | mock | |
| Projects list | `/projects` | mock | |
| Project detail | `/projects/[id]` | mock | |
| Project stage form | `/projects/[id]/stage/[slug]` | mock | |
| Branches | `/branches` | api | `POST /api/admin/branches/list`, `/create`, `/update`, `/status`. Members link opens `/team?branch=<id>` |
| Departments | `/departments` | api | `POST /api/admin/departments/list`, `/create`, `/update`, `/status`; head dropdown from `POST /api/admin/team/master` (`users`) |
| Team members | `/team`, `/team/new` | api | `POST /api/admin/team/list`, `/create`, `/update`, `/status`, `/master` (departments, branches, roles, users — `users` also feeds the optional Reporting Manager dropdown). Add is its own page, `/team/new` (form in `components/TeamMemberForm.js`, shared with the list's inline Edit); `?department=<id>` preselects the department on both pages; `?branch=<id>` preselects the list's branch filter. Lead form / Call Queue "Sales Reps" still read mock team via `getSalesReps()` in `lib/store.js` — move them to `/api/admin/team/list` (`role: "sales"`) with those screens |
| Architects | `/architects` | mock | |
| Notifications | `/notifications` | mock | |
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
