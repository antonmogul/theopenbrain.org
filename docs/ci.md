# CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`
and `dev`. Five gates, in order — the cheap ones fail first:

| Gate   | Command                | Fails when                              |
| ------ | ---------------------- | --------------------------------------- |
| Format | `npm run format:check` | Any file isn't Prettier-formatted       |
| Lint   | `npm run lint:ci`      | Any ESLint **error**, or >130 warnings  |
| Unit   | `npm run test:ci`      | Any Vitest failure                      |
| Build  | `npm run build`        | The production build breaks             |
| Smoke  | `npm run test:smoke`   | A real page is broken in a real browser |

Run the whole thing locally before pushing:

```bash
npm run format:check && npm run lint:ci && npm run test:ci && npm run build && npm run test:smoke
```

`npm run format` and `npm run lint` (with `--fix`) fix most things automatically.

## The smoke test

`scripts/smoke.mjs` builds the app, serves it with `vite preview`, and loads six
routes at up to four viewport widths in headless Chromium. Each check asserts:

- **no horizontal scroll** (`maxScrollX <= 1`)
- **no page or console errors** (minus a short, justified ignore list)
- **the page actually rendered text** — catches blank-screen regressions where
  chrome renders but a data fetch failed

This exists because of OPENBRAIN-4: the chapter reader scrolled sideways at
every desktop width while all 167 unit tests passed. Nothing in the suite loaded
a page, so the whole class of layout and load-time bug was invisible. The same
run also caught a CSP gap that was silently blocking every YouTube embed in
chapter 1.

On failure it writes screenshots to `.smoke/`, which CI uploads as an artifact.

`/styleguide` and `/case-cabinet` are checked at desktop widths only — they are
unlisted internal routes (a design reference and an interaction prototype) with
fixed-pixel layouts that overflow on a phone by design. Add mobile widths when
they get a mobile layout.

## What CI does not run

**Cypress E2E.** The three specs in `cypress/e2e/` need a seeded Supabase and
would fail on missing secrets. A pipeline that is red by default gets ignored,
which is worse than no pipeline. Wiring these up — with a seeded test project or
mocked network — is tracked in OPENBRAIN-9.

Note `npm run test:unit` (Cypress component testing) currently runs **nothing**:
`cypress.config.js` declares a component runner but `cypress/component/` doesn't
exist.

## Warning ceiling

`lint:ci` allows 130 warnings against 123 today. That is deliberate headroom, not
a target — it fails immediately on any new _error_ and on more than a handful of
new warnings. The remaining warnings and the nine rules demoted in `.eslintrc.js`
are a paydown list tracked in OPENBRAIN-9. **Lower the ceiling as they're fixed.**

## Deployment

Unrelated to this pipeline. `ssh_deploy.yml` and `ssh_staging.yml` are legacy
SSH deploys triggered by pushes to the `deployment` and `staging` branches; the
live site runs on Railway per `railway.json`. Neither runs any quality gate —
consolidating them is worth doing before user testing.
