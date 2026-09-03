# docs/

Two kinds of files live here. **Current reference docs** describe how the repo works today and should be kept accurate. **Archived session reports** are records of past investigations and refactors; they were true when written and are kept for provenance, not maintained. Dates are the last commit touching the path (`git log -1 --date=short -- <path>`), with the document's own date in parentheses where it states one.

## Current reference docs

| Path                                 | What it is                                                                                                                     | Last commit |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `ci.md`                              | The CI gates and how to run them locally. Predates the Storybook coverage/build/smoke steps now in `.github/workflows/ci.yml`. | 2026-08-05  |
| `architecture/README.md`             | Dependency-graph tooling: `npm run graph:visual`, `graph:orphans`, `graph:cycles`, `graph:check` and the layering rules.       | 2026-08-05  |
| `storybook/student-view-coverage.md` | Storybook coverage table for student components and full-page views.                                                           | 2026-08-28  |
| `typography-normalization.md`        | Typography tokens and role classes, plus the migration plan for components (updated 2026-06-30).                               | 2026-08-05  |

Generated outputs, regenerate rather than edit: `architecture/graph.json` (`npm run graph:visual`, Prettier-ignored), `architecture/orphans.txt` (`npm run graph:orphans`), `architecture/cycles.txt` (`npm run graph:cycles`), `architecture/violations.txt` (`npm run graph:check`).

Related reference outside this folder: `.storybook/taxonomy.md` (story naming), `public/templates/chapter-template.md` (chapter import format), `CLAUDE.md` (architecture guide).

## Archived session reports

| Path                   | What it records                                                                                                                                                 | Last commit                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `chapter1-parity/`     | Diagnosis and fix of Chapter 1 rendering differently from Supabase than from `text.json`: root cause, fix plan/report, post-seed checklist, live-fetched dumps. | 2026-08-05 (written 2026-07-11 to 2026-07-29) |
| `font-refactor/`       | Plan and report for removing the `font-size: 62.5%` root hack and rebasing the Tailwind scale.                                                                  | 2026-08-05 (written 2026-07-10/11)            |
| `audit-fixes/`         | Status of the audit-fix groundwork branch derived from the Nov 2025 scorecard.                                                                                  | 2026-08-05 (written 2026-07-10)               |
| `superpowers/`         | Specs, plans and audits from the spring 2026 design refresh, dashboard redesign and architecture-tooling work (`specs/`, `plans/`, `audits/`).                  | 2026-08-05 (written 2026-04-13 to 2026-06-27) |
| `animation-migration/` | Screenshots from the Chapter 1 animation → Supabase migration (figure pane, interactive figure, clicked state).                                                 | 2026-08-05                                    |
| `chapter1-layout/`     | Before/after reader screenshots at 1280/1440/1920 for the chapter layout fix.                                                                                   | 2026-08-05                                    |
| `case-cabinet/`        | Filmstrip frames of the Case Cabinet open/close interaction prototype (`/case-cabinet`).                                                                        | 2026-08-05                                    |
| `phrenology/`          | Renders of the 2D skull and the optimised/recalibrated 3D skull GLB (`/phrenology`, `/phrenology-3d`).                                                          | 2026-08-05                                    |

When a report's conclusions change the code, update `CLAUDE.md` or the relevant reference doc rather than the report.
