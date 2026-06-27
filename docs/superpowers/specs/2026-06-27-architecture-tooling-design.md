# Architecture-Understanding Tooling — Design

**Date:** 2026-06-27
**Branch context:** `refactor/tier1-dead-code` (Tier-1 dead-code refactor #1–#20 complete, not yet merged)
**Status:** Approved — ready for implementation plan

## Goal & Scope

Stand up a **Vite-aware dependency-graph workflow** so we can:

1. **See** how the ~267 `src/` files (176 `.vue`, 90 `.js`, 1 `.ts`, ~44k LOC) actually depend on each other — to refactor with confidence.
2. **Enforce** the architectural boundaries we care about as the cleanup continues.

No permanent runtime dependency. Everything runs via `npx` plus config files committed to the repo.

**Origin:** User initially considered installing `graphify` (a Python/`uv` semantic knowledge-graph tool). During brainstorming we determined that for the stated goal — *understand how files depend on each other in a Vue 3 + Vite app* — a Vite-aware import-graph tool (`madge` + `dependency-cruiser`) is higher signal-per-effort and resolves the `@/ → src/` alias correctly, which tree-sitter-based tools do not. `graphify` was set aside as overkill for a code-structure goal.

### Out of scope
- Feeding docs/PDFs/vault content into a semantic graph.
- Runtime profiling.
- Adding anything to the npm `dependencies` block (the install is fragile — requires `--legacy-peer-deps`, lint already broken on missing prettier).
- Tier-2 dead-code *removal* (this work only surfaces candidates; removal is a separate effort).

## Components

Four small, independent pieces — each does one thing:

1. **Alias-resolution config** — `.dependency-cruiser.cjs` plus the madge config needed to resolve `@/ → src/` and treat `.vue`/`.js`/`.ts` as resolvable. **This is the linchpin** — without it every `@/` import is an invisible edge and the graph is meaningless.
2. **madge report generator** — npm script `graph:visual` emitting:
   - `docs/architecture/graph.svg` (whole-app dependency graph)
   - circular-dependency list
   - orphan list (files nothing imports → Tier-2 dead-code candidates)
3. **dependency-cruiser ruleset** — npm script `graph:check` encoding layering rules:
   - `stores/` and `composables/` must not import from `views/`
   - `components/` must not import from `views/`
   - no orphans — **except an allowlist of legitimate entry points** (`main.js`, router-lazy-loaded views, any `*.config.*`), otherwise the rule flags real entry points as false positives
   - no circular dependencies
   Exits non-zero on violations so it can later gate CI.
4. **`docs/architecture/README.md`** — how to regenerate the graph, how to read it, and the **current known violations recorded as a baseline** (so the starting state is documented, not silently accepted).

## Data Flow & Usage

```
src/**  ──▶  [alias config]  ──▶  madge        ──▶  graph.svg + cycles.txt + orphans.txt
                              └─▶  dep-cruiser  ──▶  violations report (exit code)
```

- `npm run graph:visual` → regenerate the picture + orphan/cycle lists on demand.
- `npm run graph:check` → boolean "did we break a boundary." Run before each refactor commit.
- Both invoke **pinned** versions via `npx` so nothing lands permanently in `node_modules` unless we later choose to add them to `devDependencies`.
- Deliverable artifacts (`graph.svg`, reports) committed under `docs/architecture/` for a versioned before/after as the cleanup progresses.

## Error Handling & Edge Cases

- **Graphviz dependency:** madge SVG output needs `graphviz` (`dot`) locally. Detect whether `dot` is present; if not, fall back to madge JSON output / dependency-cruiser's built-in DOT, or document `brew install graphviz`.
- **`.vue` parsing:** madge parses the `<script>` block of SFCs; dependency-cruiser needs `.vue` extension config. Both configured and verified against a known file (e.g. confirm `DashboardView.vue` imports appear).
- **Noise:** exclude `node_modules`, `dist/`, and generated files from the start so the graph is signal-only.
- **Alias-config validation gate:** first run validates the alias config against a file we *know* uses `@/` imports — if that edge is missing, the config is wrong; stop and fix before generating reports.

## Testing / Verification

Verification gate is "does it produce a correct graph," not a unit test (consistent with this repo's conventions — Vitest is for app code; no test convention for tooling). Acceptance criteria:

- `graph:visual` produces a non-empty SVG where a hand-checked `@/` import (verified against actual source) appears as an edge.
- Orphan list sanity-checked against 1–2 files known to be used / unused.
- `graph:check` runs and reports the *current* violation count, recorded as baseline. Zero violations is **not** required on day one.
- `npm run build` still passes (nothing added touches the build).

## Notes / Constraints carried from project memory

- `npm install` requires `--legacy-peer-deps`; `npm run lint` is broken (missing prettier). → favor `npx`, avoid disturbing the install.
- Verify with `npm run build` (works). No component-test convention.
- Vite path alias is `@ → src/`.
