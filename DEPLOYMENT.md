# Deploying BizzNex

BizzNex is a monorepo with three deployable pieces:

| Piece | What | Dockerfile |
|-------|------|-----------|
| **db** | PostgreSQL | (managed) |
| **api** | NestJS API | `apps/api/Dockerfile` |
| **web** | React static site (nginx) | `apps/web/Dockerfile` |

Everything is containerised, so it runs the same locally (`docker compose up`) and in the cloud.

---

## Pre-deploy checklist

Run through this **before every production deploy**:

- [ ] **Refresh the design case study** — [`bizznex-case-study.html`](./bizznex-case-study.html) is a living document. Re-diff it against `apps/web/src/styles/aurora.scss` (tokens), the shipped components, the tool inventory (`apps/web/src/views/tools/*`), the i18n locale set (en/es/fr) and the Studio interaction model. Update the "Last updated" date + changelog, tick the in-page checklist, and confirm it's linked from the landing page.
- [ ] `npm run typecheck`, `npm run lint` and `npm run test` are clean.
- [ ] `npm run build` is clean (web + api).
- [ ] Env vars set on the target (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `VITE_API_URL`). `JWT_SECRET` must be at least 32 random characters (`openssl rand -hex 32`).
- [ ] CORS origin matches the deployed web domain.

---

## Local (Docker Compose)

```bash
cp apps/api/.env.example apps/api/.env      # optional for non-docker runs
docker compose up --build
# web  → http://localhost:8080
# api  → http://localhost:3001  (Swagger at /docs; compose runs the API in development mode)
# db   → localhost:5432
```

The API container runs `prisma migrate deploy` on boot, so the schema is created automatically.
It runs as the unprivileged `node` user, not root.
Demo data: the first demo sign-in (*Explore the demo*) creates and fills the demo
workspace. To seed it ahead of time, run from your host against the compose database (the
runtime image has no dev tools, so seeding inside the container won't work):

```bash
DATABASE_URL=postgresql://bizznex:bizznex@localhost:5432/bizznex npm run seed -w @bizznex/api
```

Demo login: **demo@bizznex.app / password**

---

## Primary target — free and always live: Neon + Render

Costs **$0** and nothing expires. You set it up once (about 20 minutes), and after that every
push to `main` redeploys automatically.

| Piece | Host | Free-tier behaviour |
|-------|------|---------------------|
| **db** | [Neon](https://neon.com) Postgres (free plan) | Suspends after 5 min idle, wakes on the next query in under a second, never paused for inactivity. ~100 compute-hours a month. |
| **api** | [Render](https://render.com) free web service (`apps/api/Dockerfile`) | Sleeps after 15 min without requests (~1 min to wake), so a pinger keeps it awake. One always-on service fits Render's 750 free hours a month. |
| **web** | Render static site | CDN-served, never sleeps, uses no instance hours. |
| **pinger** | [cron-job.org](https://cron-job.org) (free) | Calls the API every 10 minutes so it never sleeps. |

`render.yaml` (a Render Blueprint) defines both Render services. Dashboard button names below
can drift as the providers change their UIs; the values you enter don't.

### What you need first

- [ ] The repo on **GitHub**, with the changes you want live pushed to `main`.
- [ ] Free accounts at **neon.com**, **render.com** (sign in with GitHub) and **cron-job.org**. None needs a card.
- [ ] CI green on `main` (*Actions* tab). The `docker` job builds and boots the same images Render will build, so a red run there would fail on Render too.

### Step 1 — Create the database (Neon)

1. **New project.** Name it `bizznex`. Pick **Postgres 16 or 17** (CI tests against 16; don't
   pick a preview version). Pick region **AWS US West 2 (Oregon)**: `render.yaml` puts the API
   in Render's Oregon region, and keeping them together keeps queries fast. If you change one
   region, change the other.
2. **Copy the connection string.** On the project dashboard, open **Connect**, turn
   **Connection pooling off**, and copy the string. It looks like:

   ```
   postgresql://neondb_owner:<password>@ep-<name>.us-west-2.aws.neon.tech/neondb?sslmode=require
   ```

   It must be the **direct** host (no `-pooler` in it): Prisma's migrations need a direct
   connection. Keep `?sslmode=require`. This is your `DATABASE_URL`; treat it as a password.
3. **Nothing else to do on Neon.** Don't create tables or run SQL: the API applies the schema
   (`prisma migrate deploy`) every time it starts, and the demo workspace is created on the
   first demo sign-in.

### Step 2 — Create both services (Render Blueprint)

1. In Render: **New → Blueprint**, connect the GitHub repo, branch `main`. Render reads
   `render.yaml` and shows two services, `bizznex-api` and `bizznex-web`.
2. It asks for the values marked `sync: false`:

   | Variable | Service | What to enter now |
   |----------|---------|-------------------|
   | `DATABASE_URL` | api | the Neon string from step 1 |
   | `CORS_ORIGIN` | api | `https://bizznex-web.onrender.com` (a guess; fixed in step 3) |
   | `VITE_API_URL` | web | `https://bizznex-api.onrender.com` (a guess; fixed in step 3) |

   `JWT_SECRET` is generated by Render; `TRUST_PROXY` and `NODE_VERSION` come from the file.
3. **Apply.** The first API build takes several minutes (Docker). In the API's logs, look for
   the migrations being applied and then `BizzNex API listening`. Render's health check
   (`/health`) turns the service *Live* once the database answers.

### Step 3 — Point the two services at each other

Render names each service `https://<name>.onrender.com`, adding a suffix if that name is taken,
so check the real URLs at the top of each service's page. If your guesses in step 2 were right,
skip this step.

1. **API → Environment:** set `CORS_ORIGIN` to the web URL exactly: `https://…`, no trailing
   slash. Save; the API redeploys.
2. **Web → Environment:** set `VITE_API_URL` to the API URL exactly, no trailing slash. Then
   **Manual Deploy → Clear build cache & deploy**. The URL is baked in at build time, so
   saving the variable alone changes nothing.

### Step 4 — Keep the API awake (cron-job.org)

Create a cron job:

- **URL:** `https://<api-url>/health/live`
- **Schedule:** every **10 minutes**
- **Notifications:** on failure (so you hear about it if the API goes down)

Use **`/health/live`, not `/health`**. It answers without touching the database, so Neon still
suspends between real visits and its free compute lasts the whole month. Pinging `/health`
every 10 minutes would keep Neon awake around the clock and run out its free hours.
(A GitHub Actions schedule also works, but GitHub delays scheduled runs and switches them off in
repos with no activity for 60 days.)

### Step 5 — Check it works

| Check | Expect |
|-------|--------|
| `https://<api-url>/health` | `{"status":"ok","db":"up",…}` |
| `https://<api-url>/health/live` | `"ip"` is **your own public IP**. `render.yaml` sets `TRUST_PROXY` to `3` (Cloudflare, then two Render proxies, as measured). If `ip` is a private address (`10.x`) or a Cloudflare one (`104.16–27.x`, `172.64–71.x`), raise `TRUST_PROXY` by one and redeploy; otherwise every visitor shares one sign-in rate limit. Then send a fake `X-Forwarded-For` (`curl -H "X-Forwarded-For: 203.0.113.9" https://<api-url>/health/live`): `ip` must still be yours, or the setting is too high. |
| Open the web URL, click **Explore the demo** | The onboarding wizard opens with the sample business. |
| Register a new account | You land in your own empty workspace. |
| `curl -sI https://<web-url>/` | Has `x-frame-options: DENY`; the page source has a `Content-Security-Policy` `<meta>`. |
| `curl -sI https://<web-url>/case-study.html` | Has **one** `content-security-policy` header. |
| cron-job.org history after an hour | Six successful runs. |

### Step 6 — Use your own domain (optional)

Serve both pieces from subdomains of a domain you own, so the address bar shows your domain
instead of `onrender.com`. Use custom domains (a CNAME record), not your registrar's URL
redirect or forwarding: a redirect just sends visitors on to the `onrender.com` address. Render's free
(Hobby) workspace includes **2 custom domains**, enough for the web site and the API, and
issues their HTTPS certificates for free. Do this after the `onrender.com` URLs work (step 5).

This example uses `cheruvathoor.com` with DNS at Namecheap; any domain and registrar work the
same way.

| Piece | Custom domain | Points to |
|-------|---------------|-----------|
| web | `bizznex.cheruvathoor.com` | `bizznex-web.onrender.com` |
| api | `bizznex-api.cheruvathoor.com` | `bizznex-api.onrender.com` |

1. **Add the domains in Render.** Web service → **Settings → Custom Domains** → add
   `bizznex.cheruvathoor.com`. API service → **Settings → Custom Domains** → add
   `bizznex-api.cheruvathoor.com`. Render shows the DNS record each one needs.
2. **Create the DNS records** (Namecheap → *Domain List* → the domain → **Advanced DNS** →
   *Add new record*):

   | Type | Host | Value |
   |------|------|-------|
   | CNAME | `bizznex` | `bizznex-web.onrender.com` |
   | CNAME | `bizznex-api` | `bizznex-api.onrender.com` |

   If Render shows a different target, use Render's. Don't change the domain's other records.
3. **Wait for verification.** Back in Render, each domain should turn **Verified** with a
   certificate issued. That usually takes minutes, and up to an hour while DNS updates.
4. **Point the services at the new addresses:**
   - API → **Environment**: `CORS_ORIGIN` = `https://bizznex.cheruvathoor.com`
   - Web → **Environment**: `VITE_API_URL` = `https://bizznex-api.cheruvathoor.com`, then
     **Manual Deploy → Clear build cache & deploy** (the API URL is baked in at build time).
   - cron-job.org: change the job's URL to `https://bizznex-api.cheruvathoor.com/health/live`.
5. **Check again:** open `https://bizznex.cheruvathoor.com` and try the demo. Repeat the step 5
   checks with the new addresses.

The `onrender.com` addresses keep working. Once `CORS_ORIGIN` names only the custom domain,
the API rejects sign-ins from the old web address, so share the custom one. To accept both, set
`CORS_ORIGIN` to a comma-separated list.

### After go-live

- **Deploying changes:** push to `main`. Render rebuilds both services. Run the
  [pre-deploy checklist](#pre-deploy-checklist) first.
- **Database schema changes:** create the migration locally
  (`npm run prisma:migrate:dev -w @bizznex/api -- --name <change>`), commit the new folder under
  `apps/api/prisma/migrations`, push. The API applies it on its next start. Never run
  `prisma db push` against the Neon database.
- **Rolling back:** Render → service → **Events / Deploys** → pick the previous deploy →
  **Rollback**. A rollback doesn't undo a migration, so make schema changes backward compatible.
- **Backups:** Neon's free plan only keeps a short restore window (hours). To keep a copy, run
  `pg_dump "<DATABASE_URL>" > bizznex-backup.sql` now and then. pg_dump comes with the
  PostgreSQL client tools, and its version must be at least the server's.
- **Usage to watch** (both free tiers stop the service when exhausted, until the next month):
  Neon → *Usage* (compute-hours) and Render → *Workspace → Usage/Billing* (instance hours).
  With the pinger on `/health/live`, both stay inside their limits. Render's Hobby workspace
  also includes 5 GB of outbound bandwidth a month (plenty for a demo; beyond it is billed).
- **Changing a secret:** setting a new `JWT_SECRET` on the API signs every user out, which is
  expected.
- **Custom domain:** see [step 6](#step-6--use-your-own-domain-optional).

### Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| API deploy fails with `P1001` / "can't reach database server" | `DATABASE_URL` is wrong or not the direct host. Re-copy it from Neon with pooling **off**. If the string includes `&channel_binding=require` and connecting still fails, remove that part and keep `?sslmode=require`. |
| API exits with `JWT_SECRET … too weak` or `CORS_ORIGIN must be set` | A production guard. `JWT_SECRET` must be 32+ random characters (Render's generated one is); `CORS_ORIGIN` must be set. |
| Browser console: "blocked by CORS policy" | `CORS_ORIGIN` doesn't match the web URL exactly (scheme, no trailing slash). |
| The web app calls `localhost:3001` | `VITE_API_URL` was unset at build time. Set it and **clear the build cache and redeploy** the web site. |
| First visit takes about a minute | The API was asleep: check the cron job is running and hitting `/health/live`. |
| Sign-in returns 429 for everyone | `TRUST_PROXY` is too low (see the `/health/live` check in step 5). |
| A path other than `/` (e.g. a shared link with a path) shows Render's 404 instead of the app | The SPA rewrite in `render.yaml` (`/*` → `/index.html`) is missing from the web service's **Redirects/Rewrites** settings. |

---

## Appendix A — Railway (paid, about $5/month)

Railway gives you managed Postgres and GitHub-driven deploys with almost no ops. Its free
trial is a one-time credit, so this is a paid option (Hobby plan). Two services (api, web)
and one Postgres plugin.

1. **Create a project** at [railway.app](https://railway.app) → *Deploy from GitHub repo*.
2. **Add PostgreSQL**: *New → Database → PostgreSQL*. It exposes `DATABASE_URL`.
3. **API service**: *New → GitHub Repo* → pick this repo.
   - Settings → **Build**: set *Dockerfile Path* = `apps/api/Dockerfile`, *Root Directory* = `/` (repo root is the build context).
   - Variables:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
     - `JWT_SECRET` = a random string of at least 32 characters (`openssl rand -hex 32`)
     - `CORS_ORIGIN` = the web service URL (fill in after step 4)
     - *(leave `PORT` unset — Railway injects it and the API reads it)*
   - Deploy and generate a public domain (Settings → Networking). Health check: `/health`.
4. **Web service**: *New → GitHub Repo* → same repo.
   - Build: *Dockerfile Path* = `apps/web/Dockerfile`, *Root Directory* = `/`.
   - Variables: `VITE_API_URL` = the API's public URL. Railway passes service variables as
     Docker build args, so this is baked into the static build.
   - Deploy and generate a public domain.
5. **Wire CORS**: set the API's `CORS_ORIGIN` to the web domain; redeploy the API.

---

## Appendix B — Fly.io (Docker-native, portable)

Same Dockerfiles, deployed as two Fly apps + Fly Postgres.

```bash
fly launch --no-deploy --dockerfile apps/api/Dockerfile   # name: bizznex-api
fly postgres create --name bizznex-db
fly postgres attach bizznex-db -a bizznex-api             # sets DATABASE_URL
fly secrets set JWT_SECRET=$(openssl rand -hex 32) CORS_ORIGIN=https://bizznex-web.fly.dev -a bizznex-api
fly deploy -a bizznex-api --dockerfile apps/api/Dockerfile

fly launch --no-deploy --dockerfile apps/web/Dockerfile   # name: bizznex-web
fly deploy -a bizznex-web --dockerfile apps/web/Dockerfile \
  --build-arg VITE_API_URL=https://bizznex-api.fly.dev
```

Set each app's internal port (api → 3001, web → 80) in its `fly.toml`.

---

## Environment variables

**api** (`apps/api/.env.example`)

| Var | Example | Notes |
|-----|---------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?schema=public` | required |
| `JWT_SECRET` | `openssl rand -hex 32` | **required in production**: the API refuses to boot without it, or with one under 32 characters or containing `change-me` |
| `JWT_EXPIRES_IN` | `7d` | token lifetime |
| `CORS_ORIGIN` | `https://your-web-domain` | comma-separated allowed origins; **required in production** |
| `NODE_ENV` | `production` | set by the Dockerfile |
| `ENABLE_DOCS` | `true` | Swagger at `/docs`: on in development, **off in production** unless `true` |
| `TRUST_PROXY` | `1` | proxy hops in front of the API, so rate limits key on the client IP, not the proxy. Default `1` in production, off otherwise; `0` disables. Accepts any Express `trust proxy` value |
| `DEMO_RESET_MINUTES` | `30` | how stale the shared demo gets before the next demo sign-in resets it |
| `PORT` | `3001` | injected by most PaaS |

**web** (`apps/web/.env.example`)

| Var | Example | Notes |
|-----|---------|-------|
| `VITE_API_URL` | `https://your-api-domain` | baked in at **build** time |

---

## Notes

- Schema changes ship as committed migrations in `apps/api/prisma/migrations`; the
  container and CI both run `prisma migrate deploy`. **A database created earlier with
  `db push`** already has the tables, so mark the baseline as applied once before the
  first deploy: `npx prisma migrate resolve --applied 0_init` (from `apps/api`).
- **Health**: `GET /health` returns `{ status, db, timestamp }`: 200 with `status: "ok"` when
  the database answers, **503** with `status: "error"` when it doesn't. `GET /health/live` is a
  liveness check that never touches the database (for keep-awake pingers) and also returns the
  caller's IP as the API sees it, to check `TRUST_PROXY`. Neither is rate limited.
- **Container users**: the API image runs as `node` (non-root). The web image is stock
  `nginx:alpine`.
- **Content-Security-Policy**: the app's CSP is written into the built `index.html` as a `<meta>`
  by `contentSecurityPolicy()` in `apps/web/vite.config.ts`, which also hashes the inline theme
  script, so it is identical on nginx and on Render and needs no hash upkeep. It allows API calls
  to any `https:` origin (the API URL is baked in at build time); to lock it down, replace `https:`
  in `connect-src` with your API origin. If you serve images or fonts from somewhere new, add the
  host there. The case study and brand pages get their own, looser CSP as a header.
- **Other web headers**: `X-Frame-Options: DENY` (a `<meta>` CSP can't set `frame-ancestors`),
  `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` on every response, from
  `apps/web/nginx.conf` (Docker) or the `headers` in `render.yaml` (Render static site).
- **Auth** uses bearer tokens (no cookies), so CORS doesn't allow credentials.
- CI (`.github/workflows/ci.yml`) spins a Postgres service and runs typecheck, lint, unit
  tests, build, and API e2e on every push/PR. A second job builds both Docker images, boots the
  API image in production mode against Postgres (migrations on start, `/health`), and checks the
  web image serves the app with its security headers.
