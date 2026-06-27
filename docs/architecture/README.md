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

### Exact npm script implementations

```bash
# graph:visual — full edge list as JSON (273 nodes)
npx -y madge@8.0.0 --webpack-config madge.webpack.cjs --extensions js,ts,vue --json src > docs/architecture/graph.json

# graph:orphans — files nothing imports
npx -y madge@8.0.0 --webpack-config madge.webpack.cjs --extensions js,ts,vue --orphans src

# graph:cycles — circular dependency detection
npx -y madge@8.0.0 --webpack-config madge.webpack.cjs --extensions js,ts,vue --circular src

# graph:check — layering rule enforcement (exits non-zero on violation)
npx -y dependency-cruiser@16.10.4 --config .dependency-cruiser.cjs --output-type err src
```

## Rendering a visual SVG (optional)

Graphviz is not required for the JSON graph. To render an SVG:

```bash
brew install graphviz   # one-time
npx -y madge@8.0.0 --webpack-config madge.webpack.cjs --extensions js,ts,vue --image docs/architecture/graph.svg src
```

Note: `dot` (graphviz) is NOT installed by default; the SVG step will fail without it.

## Layering rules (enforced by graph:check)

- `stores/`, `composables/`, `components/` must NOT import from `views/`.
- No circular dependencies.
- No orphan modules, except entry points: `src/main.js`, `src/App.vue`, `src/router/*`, `*.config.*`.

Rules are defined in `.dependency-cruiser.cjs` at the repo root.

## Baseline (captured 2026-06-27)

- Circular dependencies: **0**
- Orphan modules: **58** (see `orphans.txt`)
- Layering violations: **0** (see `violations.txt`)

These are recorded, not yet fixed. Re-run the commands above after each
cleanup pass to track progress toward zero.

## Artifact formats and gotchas

### graph.json key format

Keys in `graph.json` are repo-relative WITHOUT a `src/` prefix — e.g.,
`"App.vue"`, `"stores/index.js"` — because `src` is the scan root passed to
madge. Do NOT expect a `src/` prefix when querying the JSON.

### Header preamble in .txt artifacts

`orphans.txt`, `cycles.txt`, and `violations.txt` were captured via
`npm run ... | tee`, so each file begins with two npm header lines:

```
> theopenbrain.org@0.1.18 graph:...
> npx -y ...
```

Consumers parsing these files as raw lists should skip those header lines.

### Node counts: madge vs. dependency-cruiser

madge reports **273 nodes** in `graph.json`; dependency-cruiser cruises
**242 modules**. This is not a contradiction — the two tools apply different
filters and inclusion heuristics. Both counts are correct for their
respective tools.

## Notes

- `src/main.js` may appear in orphan output because it is referenced from
  `index.html`, not imported by JS — it is allowlisted in `.dependency-cruiser.cjs`.
- The `@/ → src/` alias is configured in `madge.webpack.cjs` and via
  `tsconfig.json` paths for dependency-cruiser; 150 of ~267 files rely on the alias.
- `dependency-cruiser` is pinned to `@16.10.4` for Node 20 compatibility.
