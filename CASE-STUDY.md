# BizzNex — Design Case Study & Rebuild

This document records how the BizzNex visual identity was designed, and how the
application was rebuilt on top of it. The canonical, interactive style guide lives
alongside this file as **[`BizzNex-Style-Guide.html`](./BizzNex-Style-Guide.html)**
(open it in any browser).

**See it live:** the app is at **[bizznex.cheruvathoor.com](https://bizznex.cheruvathoor.com)** (click *Explore the demo*), and the
full interactive case study is at [bizznex.cheruvathoor.com/case-study.html](https://bizznex.cheruvathoor.com/case-study.html).

---

## 1. The design journey

The style guide went through four iterations, each responding to a specific critique.

| Iteration | Direction | What it introduced | Why it changed |
|-----------|-----------|--------------------|----------------|
| **v1 · Aurora** | Light, Apple-style | Refined the original periwinkle look — one gradient, glassy rounded cards | Baseline; still flat |
| **v2 · Living** | Animated & editorial | Breathing aurora background, Fraunces serif display, click-to-copy, dark toggle | Wanted more "interesting" |
| **v3 · Command Center** | 2026 SaaS | Dark-first, bento dashboard, Stripe-grade table, AI card, ⌘K palette | Researched Linear/Stripe/Vercel |
| **v4 · Editorial** ✅ | Container-less | **Killed the boxes** — asymmetric grid, hairlines, warm paper, one accent, ledger table | Fixed the "everything is a box / AI-generated" feel |

**v4 is the adopted system.**

## 2. Research inputs

Three research passes fed the final system:

- **Why AI UIs look generic** — the root cause is distributional convergence on
  Tailwind/shadcn defaults, whose core habit is *containerization*: every element
  becomes a bordered, shadowed, rounded card.
- **Editorial / container-less layout** — group with a named-line grid, whitespace
  (Gestalt proximity), hairline rules, asymmetric splits, bleed and overlap; present
  data in borderless tables with tabular numerals.
- **North stars** — Mercury, Linear, Attio, Stripe, Anthropic (data-dense but human),
  plus editorial studios (AREA 17, RoAndCo) for type and grid.

## 3. The design system (v4)

- **Palette** — warm paper (`#F5F1E9`) / deep warm ink (`#211D16`); **one accent**
  (`#5B41E0`); the "aurora" survives only as a single soft mesh field. Warm-charcoal
  dark mode. No pure white, no violet rainbow.
- **Type** — **Fraunces** (serif display) × **IBM Plex Sans** (UI) × **IBM Plex Mono**
  (data / spec-labels). Hierarchy by size + weight, not tint.
- **Radius** — one value, `3px`. Rectangles near-sharp; only marks (dots, avatars) round.
- **Grouping** — whitespace + single hairline rules. *Delete every border and the
  structure still reads.*
- **Signature** — folio numbers, mono `§` spec-labels, paper grain.
- **Motion** — one easing curve `cubic-bezier(.22,1,.36,1)`; used only on entrances and
  hover, never on static blocks.

Full component coverage (buttons, toggles, inputs, indicators, iconography, motion,
space/radius/elevation) is documented interactively in the style guide.

## 4. The rebuilt application

The original React app (since removed from the repo) was rebuilt on this
system.

**Stack change:** dropped Fluent UI, MUI, framer-motion, styled-components and the
Google-Maps dependency in favour of a lightweight, custom Aurora component layer.
Kept **React 18 + TypeScript + Vite + Redux Toolkit + react-intl**.

**What's implemented (all features preserved + improved):**

- **App shell** — sidebar + topbar, responsive, light/dark toggle, EN/ES/FR language
  switch, global search.
- **Dashboard** — computed live from the store: spend, active projects, open tasks,
  completion; an aggregated area chart, a borderless recent-projects table with
  sparklines, an AI insight pull-quote, and a "this week" task list.
- **Projects** — full CRUD for projects and tasks via editorial modals, per-project
  progress, inline complete toggles, status pills as dots.
- **Tasks** — all tasks grouped by status with one-click status cycling.
- **Tools** — Calculator, Assistant (Brenda, search launcher), Notes (CRUD),
  Publisher (media upload + multi-platform + simulated publish), Notifications
  (login gate + aggregated feed), Newsletter (compose + analytics), Events
  (category/radius search).
- **Persistence** — projects and notes are saved to `localStorage` (the original had
  no persistence).
- **i18n** — English, Spanish and French with a live language switch (Spanish/French
  are real translations, not English copies).

**Verified:** `tsc -b` clean, `vite build` clean (107 modules), dev server serves 200.

## 5. Run it

The app has since been rebuilt as a full-stack monorepo (NestJS + Prisma + PostgreSQL
API, React web, JWT auth). See the root [README](./README.md) and
[DEPLOYMENT.md](./DEPLOYMENT.md).

```bash
npm install
docker compose up --build     # web :8080 · api :3001/docs
# or local dev (bring your own Postgres):
npm run dev                   # web :3005 · api :3001
```
