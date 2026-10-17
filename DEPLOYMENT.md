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
- [ ] Env vars set on the target (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `VITE_API_URL`).
- [ ] CORS origin matches the deployed web domain.

---

## Local (Docker Compose)

```bash
cp apps/api/.env.example apps/api/.env      # optional for non-docker runs
docker compose up --build
# web  → http://localhost:8080
# api  → http://localhost:3001  (Swagger at /docs)
# db   → localhost:5432
```

The API container runs `prisma migrate deploy` on boot, so the schema is created automatically.
Demo data: the first demo sign-in (*Explore the demo*) creates and fills the demo
workspace. To seed it ahead of time, run from your host against the compose database (the
runtime image has no dev tools, so seeding inside the container won't work):

```bash
DATABASE_URL=postgresql://bizznex:bizznex@localhost:5432/bizznex npm run seed -w @bizznex/api
```

Demo login: **demo@bizznex.app / password**

---

## Primary target — Railway  (recommended)

Railway gives you managed Postgres + GitHub-driven deploys with almost no ops, and it's
neither Vercel nor AWS. Two services (api, web) + one Postgres plugin.

1. **Push** this repo to GitHub.
2. **Create a project** at [railway.app](https://railway.app) → *Deploy from GitHub repo*.
3. **Add PostgreSQL**: *New → Database → PostgreSQL*. It exposes `DATABASE_URL`.
4. **API service**: *New → GitHub Repo* → pick this repo.
   - Settings → **Build**: set *Dockerfile Path* = `apps/api/Dockerfile`, *Root Directory* = `/` (repo root is the build context).
   - Variables:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
     - `JWT_SECRET` = a long random string
     - `CORS_ORIGIN` = the web service URL (fill in after step 5)
     - *(leave `PORT` unset — Railway injects it and the API reads it)*
   - Deploy. The container runs `prisma migrate deploy` then starts. Generate a public domain (Settings → Networking).
5. **Web service**: *New → GitHub Repo* → same repo.
   - Build: *Dockerfile Path* = `apps/web/Dockerfile`, *Root Directory* = `/`.
   - Variables: `VITE_API_URL` = the API's public URL (e.g. `https://bizznex-api.up.railway.app`).
     Railway passes service variables as Docker build args, so this is baked into the static build.
   - Deploy and generate a public domain.
6. **Wire CORS**: set the API's `CORS_ORIGIN` to the web domain; redeploy the API.
7. **Demo data** (optional): nothing to do — the first demo sign-in creates it. To seed
   ahead of time, run `npm run seed -w @bizznex/api` from your machine with `DATABASE_URL`
   set to the Railway Postgres URL.

Done — open the web domain, register or use the demo account.

---

## Appendix A — Fly.io (Docker-native, portable)

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

## Appendix B — Render

Create a **PostgreSQL** instance, then two services from this repo:
- **Web Service** (api): Docker, Dockerfile `apps/api/Dockerfile`; env `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
- **Static Site / Web Service** (web): Docker, Dockerfile `apps/web/Dockerfile`; build arg `VITE_API_URL`.

---

## Environment variables

**api** (`apps/api/.env.example`)

| Var | Example | Notes |
|-----|---------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?schema=public` | required |
| `JWT_SECRET` | long random string | **required in production** (the API refuses to boot without it) |
| `JWT_EXPIRES_IN` | `7d` | token lifetime |
| `CORS_ORIGIN` | `https://your-web-domain` | comma-separated allowed origins; **required in production** |
| `NODE_ENV` | `production` | set by the Dockerfile |
| `SWAGGER_ENABLED` | `false` | hides `/docs`; on by default |
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
- CI (`.github/workflows/ci.yml`) spins a Postgres service and runs typecheck, lint, unit
  tests, build, and API e2e on every push/PR.
