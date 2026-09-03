# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Open Brain is an interactive, open-access neuroscience textbook built with Vue 3, developed with collaborators at the Montreal Neurological Institute (McGill University). It started in 2023 as a single-chapter reader for "The Retina" and has grown into a multi-chapter platform: chapters live in Supabase, readers can highlight and annotate text, students get quizzes, flashcards, Python labs and an AI tutor, professors get courses and analytics, and creators author chapters through a dashboard and a markdown/DOCX import wizard. Interactive figures use Lottie/GSAP; a set of ported research widgets (signal detection, attention, colour vision, retinal circuits, ...) and 3D prototypes live behind unlinked routes.

## Development Commands

### Development Server

```bash
npm start
# or
npm run watch:local
```

Runs the development server with Vite in development mode. Chapter content comes from Supabase, so you need a `.env` (see Environment Variables) or every chapter route renders only the app shell.

### Build Commands

```bash
npm run build              # Production build
npm run build:dev          # Development build
npm run build:stage        # Staging build
npm run build:prod         # Production build (explicit)
```

All builds automatically clear the `dist` directory before building (via `prebuild` script).

### Preview Builds

```bash
npm run preview            # Preview production build on port 4173
npm run serve:dev          # Build and preview development
npm run serve:stage        # Build and preview staging
npm run serve:prod         # Build and preview production
```

### Testing

```bash
npm test                   # Vitest unit suite (src/**/__tests__/) — the real one
npm run test:watch         # Vitest in watch mode
npm run test:ci            # Vitest with the default reporter (what CI runs)
npm run test:smoke         # Playwright smoke test against the preview build (scripts/smoke.mjs)
npm run smoke              # Same smoke script against an already-running server (--base URL)
npm run test:e2e           # Open Cypress (3 specs, stubbed with cy.intercept; not in CI)
npm run test:e2e:ci        # Run those Cypress specs headless (not in CI)
```

### Storybook

```bash
npm run storybook                  # Storybook dev server on :6006
npm run build-storybook            # Static build to storybook-static/
npm run storybook:coverage         # Fail if any src component lacks a story (scripts/check-storybook-coverage.mjs)
npm run storybook:coverage:admin   # Same, scoped to dashboard/admin components
npm run storybook:coverage:student-views  # Same, scoped to student components + views
npm run storybook:smoke:all        # Mount every story in Chromium; fail on console errors / non-localhost requests
npm run storybook:smoke:ci         # Serve storybook-static on :6010 and run smoke:all (what CI runs)
npm run storybook:smoke:chapter    # Chapter-only subset of the story smoke
```

Story naming follows `.storybook/taxonomy.md` (Foundations / Student / Chapter / Dashboard / Views).

### Linting and Formatting

```bash
npm run lint               # ESLint with auto-fix
npm run lint:ci            # ESLint, no fix, --max-warnings=120 (what CI runs)
npm run format             # Prettier --write .
npm run format:check       # Prettier --check . (what CI runs)
```

### Dependency Graph

```bash
npm run graph:visual       # madge → docs/architecture/graph.json (full edge list)
npm run graph:orphans      # Files nothing imports
npm run graph:cycles       # Circular dependencies
npm run graph:check        # dependency-cruiser layering rules (.dependency-cruiser.cjs)
```

See `docs/architecture/README.md`. These run via `npx -y`; nothing is added to `package.json`.

### What CI runs

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main` and `dev`, on Node 20.20.0 with `npm ci --legacy-peer-deps`, in this order: `format:check` → `lint:ci` → `test:ci` → `build` → `storybook:coverage` → `build-storybook` → `storybook:smoke:ci` → `test:smoke`. Cypress is deliberately excluded (its specs would need a seeded Supabase). `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are read from repository secrets; without them the build still passes but the smoke test drops its chapter-content assertions and keeps the structural ones (no horizontal scroll, no unexpected console errors, HTTP < 400).

### Deployment

```bash
npm run deploy             # deploy.sh: git push --follow-tags
npm version <patch|minor|major>  # Bumps version, then postversion runs deploy
```

Railway builds and serves `main` (`railway.json`: `npm run build`, then `serve -s dist -l $PORT`). There is no separate deploy step beyond pushing.

### Clean Install

```bash
npm run clean              # Clear cache, remove node_modules, reinstall with --legacy-peer-deps
```

## Architecture

### Tech Stack

- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **Build Tool**: Vite 5 (`@vitejs/plugin-vue` 5)
- **State Management**: Pinia 2 (UI state) + module-scope composables (auth, prefs, data)
- **Routing**: Vue Router 4
- **Styling**: Tailwind CSS 3 over CSS custom properties in `src/styles/brand.css`
- **Backend**: Supabase (Postgres + Auth + REST). Almost all access is hand-rolled `fetch` against the REST API (`src/services/api/client.js`, `src/utils/authHelpers.js`); a `supabase-js` client exists in `src/lib/supabase.js` and is used only by `useModules`, `useProfile` and `EditorView`.
- **Animations**: GSAP, Lottie (`lottie-web`); `three` + `@google/model-viewer` for the 3D skull prototype (`/phrenology-3d`). `@formkit/auto-animate` is in `package.json` but nothing in `src/` imports it.
- **Content tooling**: TipTap (block editor), `marked` (markdown import), `mammoth` (DOCX import), Pyodide (Python playground and labs), Chart.js (dashboards)
- **Testing**: Vitest (unit, `src/**/__tests__/`, happy-dom) + Storybook 10 (story build and exhaustive story smoke, both in CI) + Playwright browser smoke (`scripts/smoke.mjs`, in CI) + 3 Cypress specs (stubbed with `cy.intercept`, excluded from CI)
- **Tooling**: ESLint 8, Prettier 3, Node 20.20 (`.nvmrc`)

### Directory Structure

```
src/
├── assets/
│   ├── json_backend/       # Legacy Chapter 1 JSON (text.json, animations.json, ...) — see Data Architecture
│   └── styles/             # admin-theme.css (dashboard)
├── components/
│   ├── chapter/            # Reader: TextComp, HighlightRenderer, ReaderSidebar, ReaderTopBar, ...
│   │   ├── text/           # Paragraph/section renderers, BreakImages, HoverImg
│   │   ├── Illus/          # Illustration/Lottie figure components
│   │   ├── sidebar/        # Reader sidebar panels
│   │   ├── highlight-toolbar/
│   │   └── demos/          # Story-only demo catalog
│   ├── dashboard/
│   │   ├── shared/         # Design-system primitives (Button, Switch, FormField, Badge, ...)
│   │   ├── sections/       # Creator dashboard sections
│   │   └── chapters/       # Chapter Wizard steps + ChapterBlockEditor
│   ├── UI/                 # Legacy reader controls (some are re-export shims to dashboard/shared)
│   ├── Navigation/         # Menus
│   ├── quiz/  flashcard/  student/  settings/  lab/  ai/   # Student-facing features
│   ├── styleguide/         # /styleguide reference page
│   ├── Editor/             # TipTap editor
│   └── dev/                # Dev-only helpers (role override, debug)
├── composables/            # ~40 composables: useAuth, useChapter, useHighlights, usePreferences, ...
├── services/api/           # REST client (client.js), chapters.js, versions.js
├── stores/                 # Pinia: index.js (useGeneral, useText), animation.js, comments.js, auth.js, student.js
├── widgets/                # catalog.js (widget registry), source/ (authors' original HTML), python/
├── styles/                 # brand.css (tokens), fonts.css, dashboard-sections.css
├── helper/                 # animationResolve, chapterTheme, readingProgress, widget maths (sdt, retinabox, ...), perlin.ts
├── utils/                  # authHelpers.js (REST auth), format.js
├── lib/                    # supabase.js (supabase-js client, limited use)
├── mocks/                  # caseFiles.js, phrenology.js — prototype data
├── constants/  data/       # dashboard constants, playground demos
├── views/                  # One component per route (see Routing)
├── __stories__/  stories/  test/   # Storybook + test support
├── router/index.js
├── App.vue, main.js, index.css
```

Other top-level folders: `supabase/migrations/` (schema + seeds), `scripts/` (smoke, Storybook checks, chapter importers), `cypress/`, `.storybook/`, `docs/` (see `docs/README.md`), `claude/` (older planning notes), `public/publicAssets/` (fonts, Lottie JSON, models), `public/templates/chapter-template.md`.

### Key Architecture Patterns

#### State Management

**Pinia stores**

- **useGeneral** (`src/stores/index.js`): UI state (menus, modals, navigation), first-visit flag in localStorage, one-shot scroll-position return target (`savedPosition`), progress.
- **useText** (`src/stores/index.js`): the chapter tree the reader renders. Initial state is `assets/json_backend/text.json` (or its localStorage `sections` mirror); `ChapterView` replaces it wholesale with the Supabase-transformed chapter via `updateText("*", data)`.
- **useAnimation** (`src/stores/animation.js`): GSAP/Lottie animation state.
- **useCom** (`src/stores/comments.js`): comments on highlighted text.
- **useAuthStore** (`src/stores/auth.js`): auth _modal_ UI state only (`activeAuth`, `authView`, error/success messages). It does not hold the session.
- **useStudentStore** (`src/stores/student.js`): student dashboard state.

**Composables** (`src/composables/`, module-scope refs, not Pinia)

- **useAuth** is the real auth source: `user`, `session`, `profile`, `loading`, sign-in/up/out. It is built on `src/utils/authHelpers.js`, which talks to Supabase Auth over REST and stores the session in localStorage under `sb-<project-ref>-auth-token` (it bypasses `supabase-js` because of issues with `sb_publishable_*` keys). It also keeps `services/api/client.js` in sync so authenticated REST calls carry the token. `devRoleOverride` (DEV only) lets you view the app as another role.
- **useChapter** loads and transforms a chapter (see Data Architecture). **useChapterCatalog** lists published modules for `/chapters`.
- **useHighlights** persists highlights to the Supabase `highlights` table per user; **useHighlightRenderer** / **useTextSelection** drive the reader UI.
- **usePreferences** (`src/composables/usePreferences.js`):
  - Owns user-facing display prefs: `theme`, `accent`, `fontPair`, `readingSize`, `lineLength`, `reduceMotion`.
  - Module-scope refs (single source of truth, not a Pinia store).
  - localStorage keys are `ob.*` namespaced. Supabase `user_preferences` table syncs (debounced 800ms) when authenticated; LS-only when anonymous.
  - Rendering contract: components style off `data-*` attributes on `<html>` (`data-theme`, `data-accent`, `data-fontpair`, `data-reduce-motion`), not directly off the composable's values.
  - Dirty-tracking: server hydration skips fields the user has changed in this session so anonymous → signed-in transitions don't clobber unsaved changes.
  - To add a new pref: add LS key + default + watch + apply function in `usePreferences.js`; add column to `user_preferences` migration; add field to hydrate logic; add UI control on `SettingsView`.
- Dashboard/professor/student data composables (`useDashboard*`, `useProfessor*`, `useStudentCourses`, `useQuizzes`, `useFlashcards`, `useCodeLabs`, `useAITutor`, ...) each wrap REST calls through `services/api/client.js`, usually via `useCrudResource` / `withAsyncState`.

#### Routing

Routes are defined in `src/router/index.js`. All views except `HomeView` are lazy-loaded.

**Public reader routes**

- `/` — `HomeView` (marketing home). The guard redirects signed-in users to `/chapters`.
- `/chapters` — chapter library (published modules).
- `/chapter/:number` — chapter overview.
- `/chapter/:number/:slug` — the reader (`ChapterView`).
- `/chapter/break/:video?` — break video.
- `/playground` — Pyodide Python playground.
- `/widgets` — widget library gallery (not in nav; shared with authors).
- `/styleguide` — design-system reference (not in nav).

**Role-gated routes** (`meta.requiresAuth` + `meta.requiredRole`)

- `/dashboard` — creator dashboard. Only `requiresAuth`, but the guard sends students to `/student` and professors to `/professor`, so it is creator-only in effect. `?section=chapter-wizard` opens the Chapter Wizard (`/dashboard/chapter/new` redirects there).
- `/editor` — creator.
- `/professor` — professor.
- `/student` — student.

**Auth-only routes** (`meta.requiresAuth`)

- `/quiz/:quizId`, `/flashcards/:moduleId`, `/enroll/:courseId`, `/lab/:labId`, `/settings`.

**Unlinked prototype and widget routes** (no nav link; open the URL directly)

- `/case-cabinet` (History chapter prototype, mock data in `src/mocks/caseFiles.js`)
- `/phrenology`, `/phrenology-3d` (History chapter, 2D SVG and model-viewer GLB)
- Attention chapter widgets: `/sdt`, `/biased-competition`, `/contrast-response`, `/posner-cueing`, `/feature-attention`
- Retina/V1 chapter widgets: `/color-vision`, `/visual-pathway`, `/direction-selectivity` (Pyodide), `/v1-camera` (WebGL2), `/retinabox`

Every widget is registered in `src/widgets/catalog.js`; the library renders the Vue port next to the author's original HTML from `src/widgets/source/` (kept byte-for-byte, excluded from Prettier).

**`router.beforeEach`** (in order):

1. `/` with a session in localStorage → `/chapters`.
2. Leaving `chapter` stores `{ route, position }` in `useGeneral.savedPosition`; `scrollBehavior` applies it once and only when returning to the same `fullPath`. `?resume=1` scrolls to top and lets `ChapterView` restore the saved reading position after fonts/images settle.
3. Legacy `about` transition metadata.
4. If `to.meta.requiresAuth`: read the session from localStorage (`sb-<ref>-auth-token`, expired sessions are dropped); no session → `/`. In DEV only, `useAuth().devRoleOverride` short-circuits the role check. Otherwise, for `requiredRole` routes and `/dashboard`, fetch `profiles?id=eq.<uid>&select=role` over REST with the session token and redirect to the user's own dashboard on mismatch. A failed profile fetch is logged and the navigation proceeds.

**`router.afterEach`** sets `data-chapter` on `<html>` (`applyChapterAttr`) so `brand.css` can switch chapter colour ramps.

#### Data Architecture

**All chapters load from Supabase.** `src/composables/useChapter.js` fetches, over REST, `modules?slug=eq.<slug>` → `sections?module_id=eq.<id>` → `paragraphs?section_id=in.(...)` (with `is_subsection_header`, `subsection_level`, `animation_id`, `animation_trigger`) → `animations?id=in.(...)` for the linked animation keys. `transformModuleToChapterFormat` then converts that flat result into the legacy `text.json` shape the reader components expect:

```
sections → paragraphs → subSection → paragraphs → subSubSection
```

`reconstructNesting` rebuilds `subSection` / `subSubSection` from `subsection_level` / `is_subsection_header`, and `mergeConsecutiveSubSections` folds consecutive subsection headers into one wrapper. `ChapterView` pushes the result into `useText`.

Live modules today (`/chapter/<number>/<slug>`):

- `the-retina` — chapter 1, imported from `text.json` by `scripts/import-chapter-1-to-supabase.mjs`; figures/animation states seeded by the `2026*_seed_chapter1_*` migrations.
- `visual-perception-ux` — chapter 2, a temporary demo module. `supabase/migrations/20260828000000_remove_temporary_visual_perception_ux.sql` deletes it; check the project's applied migrations before assuming it is gone.
- `foundations-of-neuroscience` — chapter 3, the "History" chapter, seeded by the `20260605*_seed_chapter_foundations*` migrations (generated with `scripts/import_foundations_chapter.py`).

Schema and seeds live in `supabase/migrations/` (initial schema, RLS fixes, references, highlight tags, user preferences, profiles, animation tables, reading-progress hardening). `supabase/seeds/professor_test_data.sql` and `supabase/seed_dashboard_data.sql` are dev fixtures.

**Legacy JSON under `src/assets/json_backend/`**

- `text.json` — Chapter 1 source of truth for the importer, and the initial state of `useText` before a chapter loads.
- `animations.json` — per-record fallback for figures. `src/helper/animationResolve.js` resolves an animation key DB-first, then from this JSON, and warns loudly when neither has it; `lottieAssetOk` HEAD-checks `/publicAssets/animations/<id>.json` because `serve -s` rewrites missing files to `index.html`. The `Illus/*` components import it directly.
- `breakVideos.json`, `infosImages.json` — still imported by `BreakImages`, `BreakView`, `HoverImg`.
- `menu.json`, `footnoets.json` — no longer imported by anything in `src/`.

**Adding a chapter**: use the Chapter Wizard at `/dashboard?section=chapter-wizard` (creator role). It takes metadata, then markdown or DOCX content plus an optional `.bib`/`.ris` bibliography (`useContentParser`, `useBibParser`), lets you fix the section structure, and writes modules/sections/paragraphs/references through the REST client. The expected heading structure is documented in `public/templates/chapter-template.md` (H2 = section, H3 = subsection, H4 = sub-subsection).

**User data**: highlights (`highlights` table), notes, reading progress, quiz/flashcard results, preferences and enrolments are all per-user Supabase rows. The `useText` localStorage `sections` mirror and the JSON import/export in `ExportField.vue` are legacy Chapter 1 behaviours that still exist.

#### Vite Configuration

- Path alias: `@` → `src/`
- `vite-plugin-html` injects `NODE_ENV` and `VITE_PAGE_TITLE` into `index.html`
- Version number exposed via the `__VERSION__` global (from `package.json`)
- `<model-viewer>` is registered as a custom element for the Vue compiler
- Manual vendor chunks: `vendor-lottie`, `vendor-gsap`, `vendor-supabase`, `vendor-vue`
- Development mode keeps commented-out module aliases for local module checkouts

#### Styling

- **Tailwind Configuration** (`tailwind.config.js`):
  - Breakpoints: `xs` 480px, `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1300px, `2xl` 1500px. The reader switches to the pinned two-column (text + figure pane) layout at `xl`; between `md` and `xl` the figure pane is hidden.
  - `width: text` / `width: illus` derive from `--reader-prose-w` in `brand.css` (40vw prose, figure pane fills the rest) so the two panes cannot drift.
  - Colours and fonts come from the tokens below, not from literal values.

#### Design System (Tokens & Typography)

CSS custom properties in `src/styles/brand.css` are the single source of truth for color, font roles, and reading-prefs CSS vars. Tailwind's `tailwind.config.js` consumes the same tokens via `rgb(var(--color-x) / <alpha-value>)`.

Conventions:

- **Theme** — `[data-theme="light|dark"]` on `<html>`. System mode resolved live via `matchMedia`.
- **Accent** — `[data-accent="magenta|teal|amber|mono"]` on `<html>` overrides `--color-accent`.
- **Font pair** — `[data-fontpair="ibm-plex-legacy|newsreader|literata|georgia|sans"]` on `<html>` overrides `--font-body`, `--font-ui`, `--font-mono`. Default `:root` binds these to IBM Plex (today's behavior); `data-fontpair="newsreader"` etc. swap them.
- **Reduce motion** — `[data-reduce-motion="1"]` on `<html>` zeroes animation durations globally.
- **Pre-paint** — Inline `<script>` in `index.html` reads localStorage and sets the `data-*` attributes + reading-size/measure CSS vars before CSS loads, preventing flash. Maps in that script must stay in sync with `usePreferences.js`.

Variable web fonts (Newsreader, Inter Tight, JetBrains Mono, Literata) self-hosted under `public/publicAssets/fonts/`. Latin subset only (~260KB total). Declared in `src/styles/fonts.css`.

Tailwind exposes semantic color names (`bg`, `paper`, `ink`, `mute`, `line`, `accent`, `complete`, `warn`) plus legacy aliases (`lightest`, `lighter`, `magenta`, `violet`, `green`, etc.) that resolve to the same tokens — both work during the migration. Drop legacy aliases only as you migrate the consuming components.

#### Key Features

1. **Text Highlighting**: select text in the reader to create highlights, saved per user to Supabase (`useHighlights`), with tags, notes and a trending-highlights view.
2. **Study tools**: quizzes, flashcards, Python labs (Pyodide) and an AI tutor (`VITE_AI_API_*`, mock responses when unset).
3. **Roles**: creator (dashboard, editor, Chapter Wizard), professor (courses, students, analytics), student (courses, progress).
4. **Reading progress and scroll memory**: progress is tracked per user; leaving and returning to a chapter restores the position.
5. **Interactive figures**: Lottie/GSAP illustrations driven by scroll and click triggers stored on paragraphs.
6. **Widget library**: research widgets ported to Vue and rendered beside the authors' originals for verification.

## Important Notes

- Use `--legacy-peer-deps` when installing dependencies (`npm ci --legacy-peer-deps`; `npm run clean` does the same).
- The router is injected into Pinia stores using `markRaw()` to prevent reactivity issues.
- Window scroll position for the reader is tracked in the store, not in browser history.
- Text highlighting injects `<mark>` tags into the rendered paragraph DOM.
- The reader is desktop-first: the two-column layout needs 1300px+. Public routes (`/`, `/chapters`, chapter pages) must still render without horizontal scroll at 390px — the smoke test checks them at 390/1280/1440/1920. Internal and widget routes (`/styleguide`, `/case-cabinet`, `/sdt`, ...) are checked at desktop widths only and are allowed to overflow on phones by design.
- Do not reformat `src/widgets/source/` — those files are the authors' originals and are excluded from Prettier on purpose.

## Environment Variables

Copy `.env.example` to `.env`. Vite modes (development, staging, production) select `.env.<mode>` files as usual.

- `VITE_SUPABASE_URL` — Supabase project URL (required for any chapter content)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase publishable key (legacy `VITE_SUPABASE_ANON_KEY` is still accepted)
- `VITE_AI_API_URL`, `VITE_AI_API_KEY` — optional; the AI tutor returns mock responses without them
- `VITE_PAGE_TITLE` — injected into `index.html`
- `NODE_ENV` — set by the npm scripts

## Version Management

Version is defined in `package.json` and:

- Exposed globally as `window.__VERSION__` via Vite config
- Accessible in components via `app.config.globalProperties.$version`
- `npm version <patch|minor|major>` bumps it and the `postversion` hook runs `deploy.sh` (`git push --follow-tags`); Railway then builds `main`

## Conventions

- **Branches**: `feat|fix|chore|docs/openbrain-<ticket>-<slug>` (e.g. `docs/openbrain-24-claude-md-readme-refresh`). Ticket ids are `OPENBRAIN-N`.
- **Pull requests**: into `main` on `github.com/antonmogul/theopenbrain.org` (`origin`). The `upstream` remote (`jonasvonarb/theopenbrain.org`) is the 2023 original and is read-only for us.
- **Deploys**: Railway builds `main` (`railway.json`). Pushing to `main` deploys.
- **Installs**: always `--legacy-peer-deps`. Node 20.20.0 via `.nvmrc` (Storybook 10 needs 20.19+).
- **Before pushing**: `npm run format:check && npm run lint:ci && npm test && npm run build` mirrors the cheap half of CI.

## Project Context & Documentation

In-repo docs are indexed in `docs/README.md` (current reference docs vs. archived session reports).

Detailed project documentation, PRDs, tickets and roadmap are maintained in the Artificial Brain vault:
`/Users/antonmacmini/Documents/Github/Artificial-Brain/vault/02-projects/11eight/open-brain`

- `tickets/` — `OPENBRAIN-N-<slug>.md` ticket files
- `open-brain-complete-roadmap.md`, `plans/`, `status/`, `session-logs/`
- Phase specs (`ralph-phase*.md`), meeting notes, chapter source material
