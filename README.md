# The Open Brain

An interactive, open-access neuroscience textbook — free, forever, for anyone. Built with Vue 3 and Supabase in collaboration with the Tanenbaum Open Science Institute at the Montreal Neurological Institute, McGill University. Editor: Stuart Trenholm; chapter authors: Arjun Krishnaswamy and Stuart Trenholm; design and illustration: Malpeso Studio.

Readers get chapters with interactive Lottie/GSAP figures, highlighting and notes, quizzes, flashcards, Python labs and an AI tutor. Professors get courses and analytics. Creators author chapters from markdown or DOCX through a dashboard wizard.

## Where it runs

- This fork deploys from `main` on Railway (`railway.json`); the deployment URL is not recorded in the repo.
- The original 2023 single-chapter site by Jonas von Arb (the `upstream` remote) is at theopenbrain.org.

## Quick start

Requirements: Node 20.20 (`.nvmrc`), a Supabase project with this repo's migrations applied.

```bash
nvm use
npm ci --legacy-peer-deps        # peer conflicts are known; plain npm ci fails
cp .env.example .env             # then fill in the two Supabase values
npm start                        # Vite dev server
```

`.env` needs at least:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Without them the app builds and serves, but every chapter route renders only the shell. `VITE_AI_API_URL` / `VITE_AI_API_KEY` are optional (the AI tutor returns mock answers when unset).

## Scripts

| Command                           | What it does                                                |
| --------------------------------- | ----------------------------------------------------------- |
| `npm start`                       | Dev server (`vite --mode development`)                      |
| `npm run build`                   | Production build to `dist/`                                 |
| `npm run preview`                 | Serve the production build on :4173                         |
| `npm test`                        | Vitest unit suite (`src/**/__tests__/`)                     |
| `npm run test:smoke`              | Build preview + Playwright smoke of real routes at 4 widths |
| `npm run test:e2e`                | Cypress (3 stubbed specs; not in CI)                        |
| `npm run storybook`               | Storybook on :6006                                          |
| `npm run storybook:coverage`      | Fail if a component has no story                            |
| `npm run storybook:smoke:ci`      | Build + mount every story in Chromium                       |
| `npm run lint` / `lint:ci`        | ESLint (auto-fix / CI mode with a warning budget)           |
| `npm run format` / `format:check` | Prettier write / check                                      |
| `npm run graph:*`                 | Dependency graph: `visual`, `orphans`, `cycles`, `check`    |
| `npm run clean`                   | Wipe and reinstall with `--legacy-peer-deps`                |

## Testing and CI

`.github/workflows/ci.yml` runs on every PR and on pushes to `main`/`dev`: Prettier check → ESLint → Vitest → production build → Storybook coverage check → Storybook build → smoke every story → Playwright smoke of the production build. Cypress is excluded because its specs need a seeded database. Smoke content assertions switch on when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set as repository secrets.

## Repository layout

See `CLAUDE.md` for the full architecture guide (routes, stores, composables, data flow, design tokens). In short:

- `src/` — the Vue app (`views/` one per route, `components/` by feature, `composables/` for data and auth, `stores/` for Pinia UI state, `widgets/` for the ported research widgets, `styles/brand.css` for design tokens)
- `supabase/migrations/` — schema and content seeds
- `scripts/` — smoke test, Storybook checks, chapter importers
- `docs/` — reference docs and archived session reports (`docs/README.md`)
- `public/publicAssets/` — fonts, Lottie animations, 3D models

## Content

Chapters are rows in Supabase (`modules` → `sections` → `paragraphs`, plus `animations` and `references`), loaded by `src/composables/useChapter.js`. Live today: `the-retina` (chapter 1), `visual-perception-ux` (chapter 2, temporary — a removal migration exists), and `foundations-of-neuroscience` (chapter 3). Chapter 1's source of truth is still `src/assets/json_backend/text.json`, imported by `scripts/import-chapter-1-to-supabase.mjs`.

To add a chapter, sign in as a creator and open the Chapter Wizard at `/dashboard?section=chapter-wizard`: set the metadata, upload markdown or DOCX (plus an optional `.bib`/`.ris` bibliography), review the detected section structure, and publish. Follow the heading conventions in `public/templates/chapter-template.md` — H2 for sections, H3/H4 for nested subsections.

## Contributing

Branch as `feat|fix|chore|docs/openbrain-<ticket>-<slug>`, open a PR into `main` on `antonmogul/theopenbrain.org`, and keep CI green. Never reformat `src/widgets/source/` — those files are the widget authors' originals and are shown unchanged in the widget library.
