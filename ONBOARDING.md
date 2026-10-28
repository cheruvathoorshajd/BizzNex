# BizzNex — Developer Onboarding

Everything you need to go from a fresh clone to shipping your first change.

**Time to a running app:** ~20 minutes. **Time to your first merged change:** ~1 hour.

> New here? Read [§1](#1--orientation) and [§2](#2--day-1-setup), run the smoke test in
> [§3](#3--verify-your-setup), then do the guided change in [§6](#6--your-first-change).
> Everything after that is reference.

---

## Contents

| § | Section | Read when |
|---|---|---|
| 1 | [Orientation](#1--orientation) | First |
| 2 | [Day-1 setup](#2--day-1-setup) | First |
| 3 | [Verify your setup](#3--verify-your-setup) | First |
| 4 | [Repo tour](#4--repo-tour) | First |
| 5 | [Four mental models](#5--four-mental-models) | **Before writing code** |
| 6 | [Your first change](#6--your-first-change) | First |
| 7 | [Recipes](#7--recipes) | As needed |
| 8 | [Testing & CI](#8--testing--ci) | Before opening a PR |
| 9 | [Troubleshooting](#9--troubleshooting) | When stuck |
| 10 | [House rules](#10--house-rules) | Before your first PR |
| 11 | [Deployment](#11--deployment) | Before a release |
| 12 | [Glossary](#12--glossary) | As needed |
| 13 | [Command cheat sheet](#13--command-cheat-sheet) | Keep open |

---

## 1 · Orientation

BizzNex is a **business management suite**: projects, tasks, notes, a CRM
(contacts / companies / deals / activities), and seven productivity tools — wrapped in
**Aurora**, a custom container-less design system.

Three workspaces in one npm monorepo:

```
packages/shared  →  types + Zod schemas      (the contract)
apps/api         →  NestJS + Prisma + PostgreSQL
apps/web         →  React + Vite + RTK Query
```

The single most important fact about this codebase:

> **`packages/shared` is the source of truth.** Entity shapes and validation rules are
> defined once there, and both the API and the web app import them. If you change a
> field, you change it there first — and both sides fail to compile until they agree.

**Full project context** — product features, the design story, and the decision log —
lives in [`README.md`](./README.md). This document is about *working on it*.

---

## 2 · Day-1 setup

### Prerequisites

| Need | Version | Check |
|---|---|---|
| Node.js | **20+** (24 works) | `node -v` |
| npm | 10+ | `npm -v` |
| Git | any | `git --version` |
| Docker | *optional* | `docker --version` |

**Docker is not required.** The repo bundles a self-contained PostgreSQL for local
development. Use Option A below unless you specifically want to test the containers.

### Option A — Local, no Docker (recommended)

```bash
git clone <repo-url> bizznex
cd bizznex

npm ci                                       # installs embedded-postgres too

cp apps/api/.env.example apps/api/.env       # points at localhost:5433
cp apps/web/.env.example apps/web/.env       # VITE_API_URL=http://localhost:3001
```

Open `apps/api/.env` and confirm the port is **5433** (not 5432 — that's the Docker one):

```ini
DATABASE_URL=postgresql://bizznex:bizznex@localhost:5433/bizznex?schema=public
```

**Terminal 1 — the database.** Leave this running:

```bash
npm run db:local
```

Wait for `LOCAL_DB_READY`. The Postgres binary comes from npm (`npm ci` installs it), and
the first start runs `initdb`, which takes a few seconds. Data persists in `.pgdata/`
(gitignored).

> On later runs you may see `initdb: directory .pgdata exists but is not empty` and
> `database "bizznex" already exists`. **Both are expected** — `local-db.mjs` catches them.
> Only treat it as broken if `LOCAL_DB_READY` never prints.

**Terminal 2 — schema, data, and the app:**

```bash
npm run prisma:generate                 # generate the Prisma client
npm run prisma:migrate                  # create the 12 tables
npm run seed                            # demo user + sample data

npm run dev                             # api :3001 · web :3005
```

Open **http://localhost:3005** and log in:

```
demo@bizznex.app / password
```

### Option B — Docker (tests the real deployment path)

```bash
docker compose up --build
# web → http://localhost:8080 · api → http://localhost:3001/docs · db → :5432
# demo data: just click "Explore the demo" (the first demo sign-in creates it),
# or seed from your host against the compose database:
DATABASE_URL=postgresql://bizznex:bizznex@localhost:5432/bizznex npm run seed -w @bizznex/api
```

Note the **different web port (8080)** and **DB port (5432)**. The API container runs
`prisma migrate deploy` on boot, so no manual schema step.

---

## 3 · Verify your setup

Don't trust a green terminal — run the real smoke test. **`/health` can return 200 while
the database is down**, so check data, not just liveness.

```bash
# 1. API alive + DB reachable
curl http://localhost:3001/health
# → {"status":"ok","db":"up","timestamp":"..."}

# 2. Real auth round-trip — this is the one that matters
curl -s -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@bizznex.app","password":"password"}'
# → {"token":"eyJ...","user":{...}}   (HTTP 201)

# 3. Authenticated data read
TOKEN=<paste token>
curl -s http://localhost:3001/projects -H "Authorization: Bearer $TOKEN"
```

PowerShell equivalent:

```powershell
$r = Invoke-WebRequest -Uri 'http://localhost:3001/auth/login' -Method POST `
  -ContentType 'application/json' `
  -Body (@{email='demo@bizznex.app'; password='password'} | ConvertTo-Json) -UseBasicParsing
$token = ($r.Content | ConvertFrom-Json).token
Invoke-WebRequest -Uri 'http://localhost:3001/projects' -Headers @{Authorization="Bearer $token"} -UseBasicParsing
```

### Setup is complete when all of these pass

- [ ] `node scripts/local-db.mjs` prints `LOCAL_DB_READY`
- [ ] `/health` returns `"db":"up"`
- [ ] Login returns **HTTP 201** and a token
- [ ] `/projects` returns seeded rows
- [ ] http://localhost:3005 loads and you can log in
- [ ] http://localhost:3001/docs shows Swagger
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` all clean

That last line is what CI runs, minus the migrations and the e2e suite (`npm run test:e2e -w @bizznex/api`).

---

## 4 · Repo tour

```
bizznex/
├── packages/shared/src/index.ts     ★ THE CONTRACT — read this first
├── apps/api/
│   ├── prisma/
│   │   ├── schema.prisma            ★ 12 models — the data model
│   │   ├── migrations/              ★ versioned schema history (0_init baseline)
│   │   └── seed.ts                  thin wrapper → src/demo/demo-workspace.ts
│   ├── src/
│   │   ├── app.module.ts            every module registers here
│   │   ├── main.ts                  bootstrap, helmet, body limit, CORS, Swagger
│   │   ├── auth/                    JWT strategy + guard
│   │   ├── common/                  CurrentUser · Zod pipe · exception filter · ownership.ts · jwt-config.ts
│   │   ├── prisma/                  PrismaService
│   │   ├── notes/                   ★ THE PATTERN — copy this for new resources
│   │   ├── assistant/               Brenda — local, key-free
│   │   ├── lookup/                  company search for onboarding (Wikidata + Commons logos, free, no key)
│   │   ├── demo/                    the shared demo workspace and its reset on sign-in
│   │   └── …projects, tasks, CRM ×4, campaigns, posts, events, notifications, onboarding, account, users, health
│   └── test/app.e2e-spec.ts
└── apps/web/src/
    ├── App.tsx                      shell, routing, window wiring
    ├── nav.ts                       sidebar groups
    ├── types.ts                     re-exports shared + client-only types
    ├── services/api.ts              ★ RTK Query — every endpoint (a 401 signs out)
    ├── services/errors.ts           API error → one readable sentence
    ├── store/                       authSlice · uiSlice (localStorage-backed)
    ├── styles/aurora.scss           ★ THE DESIGN SYSTEM — all tokens
    ├── layout/                      Sidebar · Topbar · ToolWindow · WindowLayer · Dock · useWindows
    ├── ui/                          Icon · Logo · Modal · Toast · Confirm · LoadError · CountUp · PreviewBadge
    │                                motion.ts (Spatial motion) · useThemeSwitch.ts
    ├── onboarding/                  wizard · tour · checklist · page intros · help menu · guides
    └── views/
        ├── Dashboard · Projects · Tasks · Globe · Landing · Auth · Settings
        ├── Contacts · Companies · Deals · Activities
        └── tools/
            ├── registry.tsx         ★ full-page tool variants
            └── widgets.tsx          ★ compact window variants
```

### Read in this order

1. `packages/shared/src/index.ts` — every entity in the system, ~360 lines
2. `apps/api/prisma/schema.prisma` — how they're stored
3. `apps/api/src/notes/` — all three files; this is the pattern every module follows
4. `apps/web/src/services/api.ts` — how the client talks to all of it
5. `apps/web/src/styles/aurora.scss` — the first 90 lines are the entire token system

That's ~1,200 lines and gives you the whole architecture.

---

## 5 · Four mental models

### 1. One contract, two consumers

```
packages/shared/src/index.ts
          ├──→ apps/api   validates requests with the Zod schema
          └──→ apps/web   types components against the interface
```

Each entity has an interface (`Note`), a create schema (`createNoteSchema`), an update
schema (`updateNoteSchema` — always `createSchema.partial()`), and inferred input types.

> **⚠️ The #1 onboarding trap.** `@bizznex/shared` resolves to **`dist/`**, not `src/`.
> If you edit the shared package while `npm run dev` is running, nothing picks it up
> until you rebuild:
>
> ```bash
> npm run build -w @bizznex/shared
> ```
>
> `npm run dev` builds it once at startup — that's why a stale type survives a hot reload.
> Symptom: "I added the field but TypeScript says it doesn't exist."

### 2. Every row belongs to a user

All 11 content models cascade from `User`. **There is no unscoped read path.** Every
service method takes `userId` from the JWT and filters by it:

```ts
list(userId: string) {
  return this.prisma.note.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}
```

Mutations verify ownership *before* touching a row, via a private `assertOwned` helper
that throws `NotFoundException` (not `Forbidden` — don't leak that the ID exists):

```ts
private async assertOwned(userId: string, id: string) {
  const note = await this.prisma.note.findFirst({ where: { id, userId } });
  if (!note) throw new NotFoundException('Note not found');
  return note;
}
```

**Writing a query without `userId` in the `where` clause is a security bug.** Treat it
the way you'd treat a missing auth check.

### 3. Aurora: delete every border and the structure must still read

Grouping comes from **whitespace, hairline rules, and the grid** — not from cards.
Before adding a `border` or `box-shadow`, try spacing and a `.rule` divider instead.

Non-negotiables:

| Rule | Why |
|---|---|
| **One accent** (`--accent`) | A rainbow of semantic colours reads as a template |
| **One radius** (`3px`) | Mixed radii are visual noise |
| **Use the spacing scale** `--s1…--s7` (6·12·20·34·56·92·140) | The uneven jumps *are* the rhythm |
| **Easing** (`--ease`, plus `--ease-sp` / `--spring` for motion) | Entrances and hover only — never static blocks |
| **Hierarchy by size/weight, never tint** | Tint hierarchy is the generated-UI tell |
| **`.num` on all numeric data** | Tabular numerals so columns align |
| **Never hardcode a colour** | Always `var(--token)` so dark mode works |

Fonts have strict roles: **Fraunces** = display only · **IBM Plex Sans** = all UI ·
**IBM Plex Mono** = data, spec-labels, window chrome.

### 4. Studio: a window is not a smaller page

Every tool ships in **two variants**:

| Interaction | Opens | Defined in |
|---|---|---|
| **Left-click** sidebar item | Full-page inline | `views/tools/registry.tsx` → `toolNode()` |
| **Right-click** sidebar item | Floating window, **280×380** | `views/tools/widgets.tsx` → `toolWidget()` |

This split exists because of a real failure: the first version reused the full-page
component inside the window, and the serif title plus mono spec-header pushed the
calculator's keypad out of the frame.

**So: add a tool feature, and you usually touch both files.** The widget is deliberately
stripped — no page header, no folio, no spec row. Both variants hit the *same* real API.

---

## 6 · Your first change

A complete walkthrough: **add a `priority` field to Notes**, end to end. This touches
every layer and teaches the whole workflow.

### Step 1 — The database

`apps/api/prisma/schema.prisma`:

```prisma
model Note {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  date        DateTime?
  location    String    @default("")
  description String    @default("")
  priority    String    @default("Normal")   // ← add this
  createdAt   DateTime  @default(now())

  @@index([userId])
}
```

> **Why `String` and not a Prisma `enum`?** House convention — the constraint lives in
> Zod in `packages/shared`, so changing the allowed values is a code change, not a
> migration. Always give new columns a `@default` so existing rows stay valid.

Create and apply a migration for it (commit the generated folder):

```bash
npm run prisma:migrate:dev -w @bizznex/api -- --name add_note_priority
```

This writes `apps/api/prisma/migrations/<timestamp>_add_note_priority/migration.sql`,
applies it, and regenerates the typed client.

### Step 2 — The contract

`packages/shared/src/index.ts`:

```ts
export const NOTE_PRIORITIES = ['Low', 'Normal', 'High'] as const;
export type NotePriority = (typeof NOTE_PRIORITIES)[number];
export const notePrioritySchema = z.enum(NOTE_PRIORITIES);

export interface Note {
  id: string;
  userId: string;
  title: string;
  date: string | null;
  location: string;
  description: string;
  priority: NotePriority;       // ← add
  createdAt: string;
}

export const createNoteSchema = z.object({
  title: z.string().max(200).min(1),
  date: isoOrNull,
  location: z.string().max(200).default(''),
  description: z.string().max(10000).default(''),
  priority: notePrioritySchema.default('Normal'),   // ← add
});
// updateNoteSchema is createNoteSchema.partial() — it picks this up for free
```

**Rebuild it** (see the trap in §5.1):

```bash
npm run build -w @bizznex/shared
```

### Step 3 — The service

`apps/api/src/notes/notes.service.ts` — add it to the `create` data:

```ts
create(userId: string, dto: CreateNoteInput) {
  return this.prisma.note.create({
    data: {
      userId,
      title: dto.title,
      date: dto.date ? new Date(dto.date) : null,
      location: dto.location ?? '',
      description: dto.description ?? '',
      priority: dto.priority ?? 'Normal',   // ← add
    },
  });
}
```

`update` whitelists each field, so add it there too, or edits are silently dropped:

```ts
...(dto.priority !== undefined ? { priority: dto.priority } : {}),   // ← add
```

The controller needs **no change** — it validates with `createNoteSchema`, which already
knows about the field. That's the contract doing its job.

### Step 4 — The UI

`apps/web/src/views/tools/Notes.tsx` — add a select to the form, using Aurora classes
(`.field`, `.inp`) rather than new styles:

```tsx
const [priority, setPriority] = useState<NotePriority>('Normal');   // with the other form state
…
<div className="field">
  <label htmlFor="note-priority">Priority</label>
  <select id="note-priority" className="inp" value={priority} onChange={(e) => setPriority(e.target.value as NotePriority)}>
    {NOTE_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
  </select>
</div>
```

Pass it in the `createNote({ … })` call, and add the same select to `NoteModal` (and its
`onSave` value type) so priority can be edited.

RTK Query needs no change — `createNote` already sends the whole body, and
`invalidatesTags: ['Notes']` refetches the list automatically.

Decide whether the **compact widget** (`views/tools/widgets.tsx` → `NotesWidget`) should
show it too. For a small field like priority, showing it as a coloured dot rather than a
full select fits the window better.

### Step 5 — Translations (when the page is translated)

The tools are English-only today, so the label above is plain text. In a translated view
(Dashboard, Projects, Tasks), use `const t = useT()` from `i18n/useT` and add the key to
**all three** locales in `apps/web/src/i18n/messages.ts`. A key present in `en` but
missing in `es`/`fr` renders as the raw key ID to those users:

```ts
en: { 'notes.priority': 'Priority', … }
es: { 'notes.priority': 'Prioridad', … }
fr: { 'notes.priority': 'Priorité', … }
```

### Step 6 — Verify

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Then exercise it in the browser: create a note with each priority, reload the page, and
confirm it persisted. Edit one and confirm the change sticks. Toggle dark mode and
confirm the control still reads.

### Files you touched

```
apps/api/prisma/schema.prisma          the column
packages/shared/src/index.ts           the contract      ← rebuild after editing
apps/api/src/notes/notes.service.ts    the write path
apps/web/src/views/tools/Notes.tsx     the full page
apps/web/src/views/tools/widgets.tsx   the window variant (optional)
apps/web/src/i18n/messages.ts          en + es + fr
```

**That sequence — schema → contract → service → UI → i18n → verify — is the shape of
almost every change in this codebase.**

---

## 7 · Recipes

### Add a new API resource

`notes` is the reference implementation. Copy it:

1. **Model** → `schema.prisma`, with `userId` + `user` relation + `onDelete: Cascade` + `@@index([userId])`
2. **Contract** → `packages/shared/src/index.ts`: interface, `createXSchema`, `updateXSchema = createXSchema.partial()`, inferred types
3. `npm run prisma:migrate:dev -w @bizznex/api -- --name add_<name> && npm run build -w @bizznex/shared`
4. **Module** → `apps/api/src/<name>/` with `.service.ts`, `.controller.ts`, `.module.ts`
   - Controller: `@ApiTags` · `@ApiBearerAuth` · `@UseGuards(JwtAuthGuard)` · `@Controller('<name>')`
   - Every handler takes `@CurrentUser() userId: string`
   - Bodies validated with `@Body(new ZodValidationPipe(createXSchema))`
   - Service: filter every query by `userId`; add a private `assertOwned`
5. **Register** the module in `apps/api/src/app.module.ts` — easy to forget, and the
   symptom is a silent 404
6. **Client** → add endpoints in `apps/web/src/services/api.ts`, add the tag to
   `tagTypes`, set `providesTags` on queries and `invalidatesTags` on mutations
7. **View** → `apps/web/src/views/`, plus `nav.ts` and `types.ts` (`ViewId`) if it gets a sidebar entry
8. **i18n** → labels in en / es / fr

### Add a new tool

1. Full-page component → `apps/web/src/views/tools/MyTool.tsx`
2. Register in `registry.tsx`: add to `TOOL_IDS` **and** the `toolNode()` switch
3. Compact variant → `widgets.tsx`, registered in `toolWidget()`
4. `nav.ts` — add to the `group.tools` items with an icon key
5. `types.ts` — add the id to `ViewId`
6. `messages.ts` — `nav.myTool` in all three locales
7. `nav.ts` `LABELS` and `onboarding/content.ts` `INTROS` — both are `Record<ViewId, …>`,
   so typecheck fails until the new id is in them

If `toolWidget()` has no case for it, right-click opens an empty window; if `toolNode()`
has none, clicking it in the sidebar shows a blank page.

### Add or change a design token

Edit `apps/web/src/styles/aurora.scss` — **both** the `:root[data-theme="light"]` and
`:root[data-theme="dark"]` blocks. A token defined in only one theme is a bug that's
invisible until someone toggles.

Then update the design docs: `BizzNex-Style-Guide.html` is the canonical guide, and
`bizznex-case-study.html` mirrors the token table.

### Reset your local database

```bash
# stop local-db.mjs first
rm -rf .pgdata
npm run db:local                          # recreates the cluster
npm run prisma:migrate
npm run seed
```

### Change seed data

Demo data lives in `apps/api/src/demo/demo-workspace.ts` (`fill()`). `npm run seed` upserts
the demo user, then wipes and refills its records in one transaction, so re-running is
safe. The same code runs when a demo sign-in finds the last reset more than 30 minutes old:
the reset time is kept in the demo user's `onboarding` JSON, a Postgres advisory lock lets
only one API instance reset at a time, and the reset bumps the demo user's `tokenVersion`, so
demo sessions open on the old data are signed out (the visitor signing in gets a token issued
after the reset). Sample data for new accounts is separate, in
`apps/api/src/onboarding/onboarding.service.ts`: every write to `User.onboarding` there locks the
user's row (`SELECT … FOR UPDATE`), and removing the sample deletes its tasks by id and keeps
any sample project that holds a task the user added.

---

## 8 · Testing & CI

| Layer | Tool | Run |
|---|---|---|
| API unit | Jest | `npm run test -w @bizznex/api` |
| Web unit | Vitest | `npm run test -w @bizznex/web` |
| API e2e | Jest + supertest | `npm run test:e2e -w @bizznex/api` |
| Everything | | `npm run test` |

**The e2e suite needs a live database** — it drives a real register → login →
create-project → list flow. Start `local-db.mjs` first, or it fails with Prisma `P1001`.

CI (`.github/workflows/ci.yml`) spins a Postgres 16 service and runs
**typecheck → lint → unit → build → e2e** on every push and PR.

Run this before pushing — it's the same sequence:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

---

## 9 · Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_MODULE_NOT_FOUND: embedded-postgres` | Dependencies weren't installed (it's a root dev dependency) | `npm ci` |
| Prisma `P1001: Can't reach database` | DB not running, or `.env` points at 5432 (Docker) instead of 5433 (local) | Start `local-db.mjs`; check `DATABASE_URL` |
| `P1001` but something *is* listening on 5433 | Stale postmaster from a killed process | Find the PID on 5433 and kill it, then restart |
| **"I added the field but TS says it doesn't exist"** | `@bizznex/shared` resolves to `dist/` | `npm run build -w @bizznex/shared` |
| `@prisma/client did not initialize yet` | Client not generated after a schema edit | `npm run prisma:generate` |
| New endpoint 404s | Module not added to `app.module.ts` | Register it |
| 401 on every request | Expired/missing token | Log out and back in; check the `Authorization` header |
| CORS error in the browser | `CORS_ORIGIN` doesn't match the web origin | Set it to `http://localhost:3005` in `apps/api/.env` |
| Web loads, all data calls fail | `VITE_API_URL` wrong — **baked in at build time** | Fix `apps/web/.env`, then restart Vite |
| Port already in use | Previous run still alive | Kill the PID on 3001 / 3005 / 5433 |
| `initdb: directory not empty` | Normal on an existing `.pgdata` | Ignore — only `LOCAL_DB_READY` matters |
| `database "bizznex" already exists` | Normal on restart | Ignore |
| `/health` is green but data 500s | API survived, DB died | Restart `local-db.mjs` |
| Label shows as `notes.priority` | Key missing from that locale | Add it to all three in `messages.ts` |

### Find and kill a process on a port

```powershell
# Windows
Get-NetTCPConnection -LocalPort 3001 -State Listen | Select-Object OwningProcess
Stop-Process -Id <pid> -Force
```

```bash
# macOS / Linux
lsof -i :3001
kill -9 <pid>
```

---

## 10 · House rules

### Code
- **Never query without `userId`.** Scope every read and write to the authenticated user.
- **Shared contract first.** Add the field to `packages/shared` before the API or UI.
- **Rebuild shared after editing it.**
- **`updateSchema` is always `createSchema.partial()`.** Don't hand-write it.
- **New columns get a `@default`.** Existing rows must stay valid when the migration runs.
- **Links between records go through `assertLinksOwned`.** Any new `…Id` field that points
  at another record must be checked against the current user.
- **`assertOwned` throws `NotFoundException`**, never `Forbidden` — don't confirm an ID exists.
- **Match the surrounding code.** Every resource module is deliberately near-identical;
  consistency beats cleverness here.

### Design
- **No new UI libraries.** The primitive set is four files, on purpose.
- **Never hardcode a colour** — always `var(--token)`, or dark mode breaks.
- **Reach for whitespace and `.rule` before a border.**
- **Check both themes** before you call it done.
- **Check both variants** of a tool — page *and* window.

### Honesty
- If a feature can't really do the thing (external email, social posting), mark it with
  `<PreviewBadge />`. **Don't silently fake behaviour.** Simulating the outbound hop is
  fine; pretending it's real is not.

### Docs
- Features or decisions → `README.md`
- Deploy steps → `DEPLOYMENT.md`
- Design tokens → `BizzNex-Style-Guide.html` **and** `bizznex-case-study.html`
- Dev workflow → this file

---

## 11 · Deployment

Full instructions: [`DEPLOYMENT.md`](./DEPLOYMENT.md). Primary target is free and always live:
**Neon** Postgres + **Render** (API web service kept awake by a pinger, web as a static site),
defined in `render.yaml`. Railway (paid) and Fly.io are documented as appendices.

Three pieces: managed **Postgres**, the **API** (`apps/api/Dockerfile`, multi-stage Node
22 Alpine, runs `prisma migrate deploy` on boot), and the **web** app (`apps/web/Dockerfile`,
built then served by nginx with SPA fallback).

### Required environment variables

**api**

| Var | Notes |
|---|---|
| `DATABASE_URL` | required |
| `JWT_SECRET` | **required in prod** — long random string |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `CORS_ORIGIN` | the web domain(s), comma-separated; **required in prod** |
| `PORT` | injected by most PaaS |
| `NODE_ENV` | `production` makes `JWT_SECRET` and `CORS_ORIGIN` mandatory (the API won't boot without them) |
| `ENABLE_DOCS` | Swagger at `/docs`: on in development, off in production unless `true` |
| `DEMO_RESET_MINUTES` | how stale the shared demo gets before the next demo sign-in resets it (default 30) |

**web**

| Var | Notes |
|---|---|
| `VITE_API_URL` | **baked in at build time** — rebuild to change it |

### Before any production deploy

- [ ] `typecheck`, `lint`, `test`, `build` all clean
- [ ] Every env var set on the target; `CORS_ORIGIN` matches the web domain
- [ ] Refresh `bizznex-case-study.html` — it's a **living document**; re-diff it against
      `aurora.scss` tokens, the shipped components, the tool inventory, and the locale set
- [ ] Know that the demo exists everywhere — the first demo sign-in creates
      `demo@bizznex.app` / `password`, seeded or not, and the landing page links to it.
      Turning it off on a public deployment needs a code change.

---

## 12 · Glossary

| Term | Meaning |
|---|---|
| **Aurora** | The design system — container-less, warm paper, one accent. Lives in `aurora.scss`. |
| **Studio** | The windowing model: left-click = inline page, right-click = floating window. |
| **Brenda** | The built-in assistant. Local, no API keys, answers from your own data. |
| **The contract** | `packages/shared/src/index.ts` — types + Zod for every entity. |
| **Relationship Globe** | three.js CRM visualisation on the Dashboard, sized from real data. |
| **PreviewBadge** | Marks a feature whose *external* step is simulated. |
| **Folio** | Large serif section numbers — an Aurora signature detail. |
| **Spec label** | Uppercase mono `§` label above a section. |
| **Hairline / rule** | A 1px `var(--rule)` divider — Aurora's alternative to borders. |
| **`migrate deploy`** | Applies committed Prisma migrations; never drops data. Runs on API boot and in CI. |

---

## 13 · Command cheat sheet

```bash
# ── daily ───────────────────────────────────────────────
node scripts/local-db.mjs              # terminal 1 — leave running
npm run dev                            # terminal 2 — api :3001 · web :3005

# ── after editing packages/shared ───────────────────────
npm run build -w @bizznex/shared       # ← the one people forget

# ── after editing schema.prisma ─────────────────────────
npm run prisma:migrate:dev -w @bizznex/api -- --name <change>

# ── before pushing (exactly what CI runs) ───────────────
npm run typecheck && npm run lint && npm run test && npm run build

# ── data ────────────────────────────────────────────────
npm run seed
rm -rf .pgdata                         # nuke local DB (stop local-db.mjs first)

# ── docker ──────────────────────────────────────────────
docker compose up --build              # web :8080 · api :3001 · db :5432
```

### Ports

| Port | What | When |
|---|---|---|
| 3005 | Web (Vite dev) | local dev |
| 8080 | Web (nginx) | Docker |
| 3001 | API + `/docs` | both |
| 5433 | Postgres | local dev |
| 5432 | Postgres | Docker |

---

**Welcome aboard.** If something here is wrong or out of date, fix it in the same PR as
the change that made it wrong — this document only stays useful if it's maintained like
code.
