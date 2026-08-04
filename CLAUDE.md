# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

예술IN (Yesulin) is a service for managing applicant intake and screening from performance audition postings. The repo is a monorepo with a Spring Boot backend and a Next.js frontend for the producer-facing admin screens (`README.md` describes an eventual `frontend-producer` / `frontend-applicant` split, but today all frontend code lives in `frontend/`).

The backend is currently a bare Spring Boot scaffold (no controllers, entities, or Flyway migrations yet). The frontend implements the **applicant screening** flow end-to-end against MSW mocks, with real endpoint paths already fixed so the backend can be built to match.

`docs/index.html` is the standalone vanilla-JS prototype the current frontend was ported from. It is a design/behavior reference, not shipped code — consult it when screen intent or wording is ambiguous.

## Commands

### Frontend (`frontend/`)

```bash
npm run dev      # start Next.js dev server (Turbopack, localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
```

There is no test runner configured in `frontend/package.json` yet.

### Backend (`backend/`)

```bash
./gradlew bootRun                 # run the Spring Boot app
./gradlew build                   # compile + run checks
./gradlew test                    # run all tests (JUnit 5 / Jupiter)
./gradlew test --tests "art.yesulin.YesulinApplicationTests"   # run a single test class
```

Java toolchain is pinned to Java 25 via Gradle (`backend/build.gradle.kts`); Gradle will provision it automatically if it isn't installed locally. No local MySQL/Docker setup exists yet — `application.yml` currently only sets `spring.application.name`, and there are no datasource credentials or Flyway migrations to run against.

## Architecture

### Backend

Spring Boot 4.1, Java 25, package root `art.yesulin`. Dependencies are in place for `spring-boot-starter-data-jpa`, `spring-boot-starter-webmvc`, Flyway (`flyway-mysql`), and MySQL, but no domain code exists yet — `YesulinApplication.java` is the only class. When adding the first real feature, follow the API contract already defined by the frontend/docs (see below) rather than inventing new shapes.

### Frontend

Next.js 16 App Router, React 19, Tailwind CSS v4, TypeScript. Structure is feature-based:

- `src/app/` — routes. `/producers/**` is the producer admin area; its layout (`src/app/producers/layout.tsx`) sets `noindex, nofollow` metadata and wraps children in `MswProvider` + `ToastProvider` + `ProducerShell`.
- `src/features/<domain>/` — one folder per business domain (today: `screening`), holding `types.ts` (the domain model + request/response shapes), `api.ts` (thin `fetch` wrapper over `/api/<domain>` REST paths), and domain logic with no JSX (`filters.ts`, `labels.ts`, `routes.ts`, `print.ts`, `use-screening-query.ts`).
- `src/components/<domain>/` — UI per domain (`screening/`), plus `producers/` (shell, tree nav, resizer) and `mocks/` (`MswProvider`).
- `src/mocks/` — MSW handlers (`handlers.ts`) plus `screening/` (seed catalog, generated applicants, in-memory review store, aggregation/serialization), started by `mocks/browser.ts`.

**Domain model** (see `docs/performance-management.md` before touching anything under `features/screening`, `components/screening`, or `/producers/**`): `Performance → Posting → Role → Application`. Two invariants the backend must mirror — screening runs **per role** (round-close state is keyed on `(role, round)`), and a review is keyed on `(application, round)` so later rounds never overwrite earlier records.

**Mocking convention:** `MswProvider` (client component) lazily imports and starts the MSW worker before rendering children, gated by `NEXT_PUBLIC_API_MOCKING` — set it to `disabled` once the real backend is wired up. MSW only starts inside `/producers`, so server-rendered/public routes never pay for or depend on mock init code. The mock store lives in browser memory, so reviews and round-close state reset on reload; applicant data is regenerated from a **fixed seed** so counts stay comparable across reloads.

**Mutations return the whole screen.** `PATCH /api/screening/review` and `POST /api/screening/round/close` respond with a fresh `ScreeningBoardResponse` (the close endpoint returns the *next* round's board), so the client swaps state instead of refetching. Keep that shape if you add mutations.

**API/ownership convention:** clients never send an owner/producer ID in requests; the server resolves it from auth context and must scope every read and write by owner. The MSW layer does **not** model this yet — it assumes all mock data belongs to one producer. Add the ownership check when building the real backend.

**Public vs. admin rendering split** (planned, see docs): admin screens under `/producers` are client-rendered and excluded from indexing. Public applicant-facing pages (not yet built) are meant to be Server Components with `generateMetadata` for SEO, kept free of MSW bootstrapping.

### Frontend coding conventions

`frontend/.agents/skills/` vendors Vercel's `agent-skills` (pinned via `frontend/skills-lock.json`) as house style for this codebase:

- **Composition patterns** (`vercel-composition-patterns`): avoid boolean-prop proliferation in favor of composition; use compound components with shared context; lift shared state into provider components instead of prop-drilling; prefer children over `renderX` props.
- **React 19 APIs**: no `forwardRef` (ref is a normal prop); prefer `use()` over `useContext()`.
- **React best practices** (`vercel-react-best-practices`): a large rule set covering rendering, re-render avoidance, async/data-fetching, and bundle-size patterns — consult `rules/` in that skill directory when in doubt on a specific pattern.

Two lint rules bite often and are not negotiable via suppression:

- `react-hooks/set-state-in-effect` (React Compiler) rejects a synchronous `setState` inside an effect body. Derive during render, reset child state with a `key`, or move the update into the event handler that caused it. `useScreeningQuery` and `ScreeningBoard` show the derive-during-render pattern.
- `jsx-a11y/role-supports-aria-props` rejects `aria-selected` on a plain `<button>`. Use `aria-current` (stepper) or `aria-pressed` (toggle) instead.

Keep source files under **250 pure LOC** (non-blank, non-comment); split by responsibility when a file approaches it.

**Tailwind v4 cascade layers:** every element-selector rule in `src/app/globals.css` must live inside `@layer base`. Unlayered CSS beats *all* layered CSS regardless of specificity, so a stray `button { color: inherit }` silently kills every `text-*` utility on buttons, and `* { border-color: … }` kills every `border-*` color utility. Custom classes (`.num`) go in `@layer utilities`. The design tokens live in a plain `:root` block plus `@theme inline`.

## Documentation discipline

`docs/README.md` sets the team's documentation policy: whenever a change affects user flows/business rules, API request/response shape, auth/state-transition/data-lifecycle behavior, the MSW↔backend contract, env vars/local run steps, or current limitations/decisions the team needs to know, the relevant doc under `docs/` must be updated **in the same unit of work** as the code change — implementation isn't considered done if the doc and code disagree. Purely internal refactors with no external/contract impact don't need doc updates.

`docs/온보딩.md` is the human onboarding doc (how to run, screen tour, code map, contract-first workflow, troubleshooting). Keep its "실행하기" and "코드 지도" sections true if commands or the folder layout change.

`docs/performance-management.md` is the living spec (domain layering, round rules, screen routes, API contract, MSW behavior, ownership rules, known limits) for the producer `공연 관리` area — which today means the applicant screening flow. Read it before changing anything under `features/screening`, `components/screening`, or `/producers/**`, and update it alongside any behavior change in that area.
