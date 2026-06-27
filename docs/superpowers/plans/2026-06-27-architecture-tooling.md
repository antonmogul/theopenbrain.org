# Architecture-Graph Tooling Implementation Plan

> **⚠️ SUPERSEDED — this is the original plan, not the shipped state.** The
> live reference for how the tooling actually works is
> [`docs/architecture/README.md`](../../architecture/README.md). Two
> corrections were discovered during implementation and are NOT reflected in
> the command examples below:
> - **madge has no `--config` flag** — the shipped scripts use
>   `--webpack-config madge.webpack.cjs --extensions js,ts,vue` (and
>   `madge.config.json` was removed as inert).
> - **dependency-cruiser is pinned to `@16.10.4`, not `@18.0.0`** — `@18`
>   requires Node ≥22 but the project runs Node 20.
> Read the README for the authoritative commands.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up an `npx`-driven, Vite-aware dependency-graph workflow (madge + dependency-cruiser) that visualizes `src/` dependencies, surfaces orphans/cycles, and enforces layering rules — without adding a permanent runtime dependency.

**Architecture:** Two committed config files (`madge.config.json`, `.dependency-cruiser.cjs`) teach both tools the `@/ → src/` alias and `.vue` parsing. Four npm scripts wrap pinned `npx` invocations. Generated artifacts (graph image, orphan/cycle/violation reports) land under `docs/architecture/`, versioned in git as a before/after baseline. dependency-cruiser encodes the agreed layering rules and exits non-zero on violation so it can later gate CI.

**Tech Stack:** Node 20.19, npm 10.8, `madge@8.0.0`, `dependency-cruiser@18.0.0`, Vue 3 SFCs, Vite alias `@ → src/`. No `tsconfig`/`jsconfig` exists. Graphviz `dot` is NOT installed locally.

## Global Constraints

- **No permanent runtime dependency** — invoke tools via pinned `npx` (`npx -y madge@8.0.0`, `npx -y dependency-cruiser@18.0.0`). Do NOT add either to `package.json` `dependencies` or `devDependencies`.
- **Never run `npm install`/`npm ci`** as part of this work — the install is fragile (requires `--legacy-peer-deps`; `npm run lint` is broken on a missing prettier dep). `npx -y` fetches tools into its own cache without touching `node_modules`.
- **Vite alias is `@ → src/`** (from `vite.config.js:43`). 150 of 267 `src/` files import via `@/`; a wrong alias config silently drops ~56% of edges.
- **Graphviz `dot` is not installed** — the visual-graph step must use a no-`dot` path or document the fallback; it must NOT hard-fail the workflow.
- **Verification gate is `npm run build` (works)** + correct graph output. No component-test convention; this is tooling, so no Vitest tests are added.
- **Layering rules to enforce** (confirmed): `stores/` ⊄ `views/`; `composables/` ⊄ `views/`; `components/` ⊄ `views/`; no circular deps; no orphans except an allowlist of entry points (`src/main.js`, router-lazy-loaded views, `*.config.*`).
- **Validation fixture:** `src/App.vue` imports `useGeneral` from `@/stores` (`src/App.vue:7`) → the edge `src/App.vue → src/stores/index.js` MUST appear in graph output. This is the alias-correctness canary.

---

## File Structure

- `madge.config.json` (create) — madge config: `@/` alias via `webpackConfig`, `.vue`/`.js`/`.ts` extensions, excludes.
- `.dependency-cruiser.cjs` (create) — dep-cruiser config: alias via `enhancedResolveOptions.alias`, `.vue` support, the forbidden-rule set, entry-point allowlist, excludes.
- `package.json` (modify, `scripts` block only) — add `graph:visual`, `graph:check`, `graph:orphans`, `graph:cycles`.
- `docs/architecture/README.md` (create) — how to regenerate, how to read, recorded baseline violations.
- `docs/architecture/.gitkeep` then generated artifacts (`graph.svg` or `graph.json`, `orphans.txt`, `cycles.txt`, `violations.txt`) (create) — committed baseline.

---

### Task 1: Validate alias resolution with madge (the canary)

Prove madge resolves `@/` BEFORE building anything else. If this fails, every later artifact is wrong.

**Files:**
- Create: `madge.config.json`

**Interfaces:**
- Produces: `madge.config.json` consumed by all later madge invocations (Tasks 2, 4). Shape: `{ "fileExtensions": [...], "webpackConfig": "<path>", "detectiveOptions": {...} }`.

- [ ] **Step 1: Create the madge config with the `@/` alias**

madge resolves webpack-style aliases via a `webpackConfig` file. Create a minimal one inline-referenced. Create `madge.config.json`:

```json
{
  "fileExtensions": ["js", "ts", "vue"],
  "tsConfig": null,
  "webpackConfig": "./madge.webpack.cjs",
  "detectiveOptions": {
    "es6": { "mixedImports": true }
  },
  "excludeRegExp": ["node_modules", "dist", "\\.d\\.ts$"]
}
```

- [ ] **Step 2: Create the webpack alias shim madge points at**

Create `madge.webpack.cjs`:

```js
const path = require("path");
module.exports = {
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    extensions: [".js", ".ts", ".vue", ".json"],
  },
};
```

- [ ] **Step 3: Run madge against the canary file and verify the alias edge resolves**

Run:
```bash
npx -y madge@8.0.0 --config madge.config.json --json src/App.vue | npx -y json5 2>/dev/null || npx -y madge@8.0.0 --config madge.config.json --json src/App.vue
```
Simpler, robust check:
```bash
npx -y madge@8.0.0 --config madge.config.json --json src/App.vue
```
Expected: JSON output where `"src/App.vue"` lists a dependency resolving into `src/stores` (e.g. `"src/stores/index.js"`). If instead you see an unresolved `"@/stores"` string or an empty dep array, the alias is NOT wired — STOP and fix `madge.webpack.cjs` before continuing.

- [ ] **Step 4: Confirm no unresolved `@/` strings leak into output**

Run:
```bash
npx -y madge@8.0.0 --config madge.config.json --json src | grep -c '"@/' || echo "0 unresolved aliases — good"
```
Expected: `0 unresolved aliases — good` (grep finds no literal `@/` keys; all resolved to real paths).

- [ ] **Step 5: Commit**

```bash
git add madge.config.json madge.webpack.cjs
git commit -m "build: add madge config with @/ alias resolution

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013mSvAAqWCV6tLgtMKKBdKv"
```

---

### Task 2: Generate orphan + cycle reports (the dead-code signal)

**Files:**
- Modify: `package.json` (`scripts` block)
- Create: `docs/architecture/orphans.txt`, `docs/architecture/cycles.txt`

**Interfaces:**
- Consumes: `madge.config.json` (Task 1).
- Produces: npm scripts `graph:orphans`, `graph:cycles`. Output text files under `docs/architecture/`.

- [ ] **Step 1: Add the orphan + cycle scripts to package.json**

In `package.json`, inside `"scripts"`, add (keep existing scripts intact):

```json
    "graph:orphans": "npx -y madge@8.0.0 --config madge.config.json --orphans src",
    "graph:cycles": "npx -y madge@8.0.0 --config madge.config.json --circular src",
```

- [ ] **Step 2: Run the cycle report and capture it**

Run:
```bash
mkdir -p docs/architecture && npm run graph:cycles | tee docs/architecture/cycles.txt
```
Expected: either "No circular dependency found!" or a numbered list of cycles. Either is a valid baseline — record whatever it reports.

- [ ] **Step 3: Run the orphan report and capture it**

Run:
```bash
npm run graph:orphans | tee docs/architecture/orphans.txt
```
Expected: a list of files nothing imports. Sanity-check: `src/main.js` should NOT appear (it's the entry point and IS referenced via index.html, though madge may still list it — note that in the README in Task 5). Pick one listed file and confirm by grep that nothing imports it:
```bash
F=$(grep -m1 -v '^$' docs/architecture/orphans.txt); echo "checking: $F"; grep -rn "$(basename "$F" | sed 's/\.[^.]*$//')" src --include='*.vue' --include='*.js' | grep -v "$F" | head
```
Expected: no import references (confirms it's a true orphan), OR references that are non-import mentions (note as a false positive).

- [ ] **Step 4: Commit**

```bash
git add package.json docs/architecture/orphans.txt docs/architecture/cycles.txt
git commit -m "build: add madge orphan + cycle reports with baseline

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013mSvAAqWCV6tLgtMKKBdKv"
```

---

### Task 3: dependency-cruiser config with layering rules

**Files:**
- Create: `.dependency-cruiser.cjs`

**Interfaces:**
- Produces: `.dependency-cruiser.cjs` consumed by `graph:check` (Task 4). Exports an object with `forbidden` rules array and `options.enhancedResolveOptions.alias`.

- [ ] **Step 1: Create the dependency-cruiser config**

Create `.dependency-cruiser.cjs`:

```js
const path = require("path");

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make the module graph impossible to reason about.",
      from: {},
      to: { circular: true },
    },
    {
      name: "stores-not-from-views",
      severity: "error",
      comment: "stores/ must not depend on views/ (inverted layering).",
      from: { path: "^src/stores" },
      to: { path: "^src/views" },
    },
    {
      name: "composables-not-from-views",
      severity: "error",
      comment: "composables/ must not depend on views/ (inverted layering).",
      from: { path: "^src/composables" },
      to: { path: "^src/views" },
    },
    {
      name: "components-not-from-views",
      severity: "error",
      comment: "components/ must not depend on views/ (inverted layering).",
      from: { path: "^src/components" },
      to: { path: "^src/views" },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Unused module — candidate for removal. Entry points are allowlisted below.",
      from: {
        orphan: true,
        pathNot: [
          "^src/main\\.js$",
          "\\.config\\.(js|cjs|ts)$",
          "^src/router",
          "^src/App\\.vue$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(node_modules|dist)" },
    enhancedResolveOptions: {
      extensions: [".js", ".ts", ".vue", ".json"],
      alias: { "@": path.resolve(__dirname, "src") },
    },
    tsPreCompilationDeps: false,
    reporterOptions: {
      dot: { collapsePattern: "node_modules/[^/]+" },
    },
  },
};
```

Note on `.vue`: dependency-cruiser 18 resolves `.vue` via `enhancedResolveOptions.extensions` above; it reads the `<script>` block's imports. No extra plugin needed for import-graph purposes.

- [ ] **Step 2: Validate the config parses and resolves the alias on the canary**

Run:
```bash
npx -y dependency-cruiser@18.0.0 --config .dependency-cruiser.cjs --output-type json src/App.vue
```
Expected: JSON where `src/App.vue` has a `dependencies` entry resolving to `src/stores/index.js` (resolved, NOT `@/stores`). If unresolved, fix the `alias` path before continuing.

- [ ] **Step 3: Commit**

```bash
git add .dependency-cruiser.cjs
git commit -m "build: add dependency-cruiser config with layering rules

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013mSvAAqWCV6tLgtMKKBdKv"
```

---

### Task 4: Wire `graph:check` + `graph:visual` scripts and capture baselines

**Files:**
- Modify: `package.json` (`scripts` block)
- Create: `docs/architecture/violations.txt`, `docs/architecture/graph.json`

**Interfaces:**
- Consumes: `.dependency-cruiser.cjs` (Task 3), `madge.config.json` (Task 1).
- Produces: npm scripts `graph:check`, `graph:visual`. Baseline artifacts under `docs/architecture/`.

- [ ] **Step 1: Add the check + visual scripts**

In `package.json` `"scripts"`, add:

```json
    "graph:check": "npx -y dependency-cruiser@18.0.0 --config .dependency-cruiser.cjs --output-type err src",
    "graph:visual": "npx -y madge@8.0.0 --config madge.config.json --json src > docs/architecture/graph.json",
```

Rationale for `graph.json` not `graph.svg`: graphviz `dot` is NOT installed, so madge's `--image graph.svg` would fail. We emit `graph.json` (the full edge list, the durable queryable artifact) and document the optional `brew install graphviz` SVG path in the README (Task 5).

- [ ] **Step 2: Run the layering check and capture the baseline (do NOT fix violations now)**

Run:
```bash
npm run graph:check | tee docs/architecture/violations.txt; echo "exit: ${PIPESTATUS[0]}"
```
Expected: either "no dependency violations found" (exit 0) OR a list of violations (exit non-zero). BOTH are acceptable — this records the *current* baseline. Do not change app code to make it pass; violations are recorded, not fixed, in this plan.

- [ ] **Step 3: Generate the JSON graph artifact**

Run:
```bash
npm run graph:visual && echo "nodes: $(grep -o '"src/' docs/architecture/graph.json | wc -l)"
```
Expected: `docs/architecture/graph.json` exists and is non-empty; node count is in the low hundreds (≈267 max). Confirm the canary edge is present:
```bash
grep -A2 '"src/App.vue"' docs/architecture/graph.json | grep stores && echo "CANARY OK: App.vue -> stores edge present"
```
Expected: `CANARY OK: App.vue -> stores edge present`. If absent, the alias config regressed — stop and fix.

- [ ] **Step 4: Confirm the app build is unaffected**

Run:
```bash
npm run build
```
Expected: build succeeds (these config files are tooling-only and not imported by the app; the only `package.json` change is added scripts). If build fails, confirm you did not alter any existing script or the `dependencies` block.

- [ ] **Step 5: Commit**

```bash
git add package.json docs/architecture/violations.txt docs/architecture/graph.json
git commit -m "build: add graph:check + graph:visual scripts with baseline artifacts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013mSvAAqWCV6tLgtMKKBdKv"
```

---

### Task 5: Architecture README with usage + recorded baseline

**Files:**
- Create: `docs/architecture/README.md`

**Interfaces:**
- Consumes: the four npm scripts (Tasks 2, 4) and baseline artifacts (Tasks 2, 4).

- [ ] **Step 1: Write the README**

Create `docs/architecture/README.md`. Fill the `<...>` baseline numbers from the actual `violations.txt` / `orphans.txt` / `cycles.txt` captured in Tasks 2 and 4 (read those files and substitute real counts — do not leave placeholders):

```markdown
# Architecture Dependency Graph

Vite-aware dependency tooling for understanding and guarding `src/` structure.
Tools run via `npx` — nothing is added to `package.json` dependencies.

## Commands

| Command | What it does |
|---|---|
| `npm run graph:visual` | Writes the full edge list to `docs/architecture/graph.json`. |
| `npm run graph:orphans` | Lists files nothing imports (dead-code candidates). |
| `npm run graph:cycles` | Lists circular dependencies. |
| `npm run graph:check` | Enforces layering rules; exits non-zero on violation. |

## Rendering a visual SVG (optional)

Graphviz is not required for the JSON graph. To render an SVG:

\`\`\`bash
brew install graphviz   # one-time
npx -y madge@8.0.0 --config madge.config.json --image docs/architecture/graph.svg src
\`\`\`

## Layering rules (enforced by graph:check)

- `stores/`, `composables/`, `components/` must NOT import from `views/`.
- No circular dependencies.
- No orphan modules, except entry points: `src/main.js`, `src/App.vue`, `src/router/*`, `*.config.*`.

## Baseline (captured 2026-06-27)

- Circular dependencies: <N from cycles.txt>
- Orphan modules: <N from orphans.txt> (see `orphans.txt`)
- Layering violations: <N from violations.txt> (see `violations.txt`)

These are recorded, not yet fixed. Re-run the commands above after each
cleanup pass to track progress toward zero.

## Notes

- `src/main.js` may appear in orphan output because it is referenced from
  `index.html`, not imported by JS — it is allowlisted in `.dependency-cruiser.cjs`.
- The `@/ → src/` alias is configured in `madge.webpack.cjs` and
  `.dependency-cruiser.cjs`; 150 of ~267 files rely on it.
```

- [ ] **Step 2: Verify no placeholders remain**

Run:
```bash
grep -n '<.*>' docs/architecture/README.md && echo "FIX: placeholders remain" || echo "no placeholders — good"
```
Expected: `no placeholders — good` (all `<...>` replaced with real counts).

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/README.md
git commit -m "docs: architecture graph usage + recorded baseline

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013mSvAAqWCV6tLgtMKKBdKv"
```

---

## Self-Review

**Spec coverage:**
- Alias-resolution config → Tasks 1, 3 ✓
- madge report generator (graph.svg/orphans/cycles) → Tasks 2, 4 (graph.json substituted for graph.svg due to no graphviz; SVG path documented) ✓
- dependency-cruiser ruleset (layering, no-cycle, no-orphan + entry allowlist) → Task 3 ✓
- README with baseline → Task 5 ✓
- Graphviz edge case → handled in Task 4 Step 1 + README ✓
- `.vue` parsing → Task 1 (extensions) + Task 3 note ✓
- Alias-validation gate against known `@/` file → Task 1 Steps 3-4, Task 3 Step 2, Task 4 Step 3 (canary `App.vue → stores`) ✓
- Noise excludes → Task 1 config + Task 3 config ✓
- Build still passes → Task 4 Step 4 ✓
- Baseline recorded not fixed → Tasks 2, 4 explicit ✓

**Placeholder scan:** README `<...>` baseline numbers are intentional fill-from-output markers with an explicit "read those files and substitute" instruction + a Step 2 grep gate that fails if any remain. No other placeholders.

**Type consistency:** Script names consistent across tasks (`graph:visual`, `graph:check`, `graph:orphans`, `graph:cycles`). Config filenames consistent (`madge.config.json`, `madge.webpack.cjs`, `.dependency-cruiser.cjs`). Canary edge (`src/App.vue → src/stores/index.js`) referenced identically in Tasks 1, 3, 4. Tool versions pinned identically (`madge@8.0.0`, `dependency-cruiser@18.0.0`) everywhere.
