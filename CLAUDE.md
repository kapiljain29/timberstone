@AGENTS.md

## Calling the Timberstone API

- Every backend call goes through `lib/api.js` (`api.get/post/put/patch/delete`,
  `login`, `logout`, `getSession`, `setActiveBranch`, `onSessionChange`).
  Never call `fetch()` against the API directly — `lib/api.js` handles the
  `{ is_crypto, req }` / `{ response }` envelope, AES (when
  `NEXT_PUBLIC_API_CRYPTO=1`), the Bearer token and `x-branch-id`.
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

`mock` = still on wireframe data · `api` = fully on the API.

| Screen | Route | Status | Endpoints needed / notes |
|---|---|---|---|
| Web panel login | `/login` | mock | `POST /auth/login` (exists) |
| Supervisor login | `/m/login` | mock | `POST /auth/login` (exists) |
| Panel shell (user, role menu, bell) | `components/AppShell.js` | mock | session, notifications count |
| Dashboard | `/dashboard` | mock | |
| Call queue | `/call-queue` | mock | |
| Leads list | `/leads` | mock | |
| New lead | `/leads/new` | mock | |
| Lead detail | `/leads/[id]` | mock | |
| Projects list | `/projects` | mock | |
| Project detail | `/projects/[id]` | mock | |
| Project stage form | `/projects/[id]/stage/[slug]` | mock | |
| Team & departments | `/team` | mock | |
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
