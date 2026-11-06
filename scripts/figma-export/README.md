# Figma widget export (Nov 2026, OPENBRAIN-141 / 162)

One-off tooling that walked the rendered research widgets and chapter pages
with Playwright, wrote a compact layout tree per widget, uploaded the raster
images, and rebuilt each frame inside Figma through `use_figma`.

Kept so the Widget Library pages can be regenerated; nothing in the app
imports these files.

| File                                                          | Role                                                                         |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `extract.mjs`                                                 | Walk one rendered route and write `out/<name>.json` + images                 |
| `jobs.mjs` / `run.mjs`                                        | Every extraction job, run three at a time                                    |
| `states/*.js`                                                 | Per-widget state scripts (tabs, sliders) applied before extraction           |
| `batch.mjs` / `up.mjs`                                        | Upload images, record the Figma image hashes                                 |
| `pack.mjs` / `builder.js`                                     | Turn an extract into the Figma build payload; `builder.js` runs inside Figma |
| `scaffold2.mjs` / `scaffold2.body.js`                         | Page scaffolds for the 14 chapter uploads                                    |
| `ds-colors.txt` / `ds-text.json` / `map-*.json` / `maps.json` | Design-system variable keys and node maps                                    |
| `probe*.mjs`                                                  | Ad-hoc layout probes used while iterating                                    |

The widgets were served locally on `:5191` (Vite), `:5192` (RetinaBox) and
`:5193` (chapter scratchpad). Output lands in `out/` (ignored).
