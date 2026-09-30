# Keeping Figma and the code in sync

The code is the source of truth for design tokens. The Figma design system file ("Open Brain — Design System", `NAjmvySrMHLtWYqn2zi4h4`) mirrors it with variables, each carrying its CSS name as code syntax.

## The contract: `tokens/tokens.json`

`npm run tokens:export` reads `src/styles/brand.css` (colours, chapter ramps, radius, layout, the type scale) and `src/index.css` (the weight and font role of each `.t-*` class) and writes `tokens/tokens.json`. It is generated; don't edit it by hand.

`src/__tests__/tokens.test.js` fails whenever the CSS and `tokens.json` disagree, so a token change can't land without the file being regenerated.

## When you change a token

1. Change it in `src/styles/brand.css` (or the `.t-*` class in `src/index.css`).
2. Run `npm run tokens:export` and commit `tokens/tokens.json` with the change.
3. Update the Figma variable to match. Values come from the Primitives collection (Theme and Chapter alias into it); type sizes are in the Type collection's modes: Desktop and Phone from `tokens.json`, Tablet equal to Phone, and Laptop halfway between (the fluid 768–1280px ramp in brand.css, at 1024px).
4. Check for drift: run `npm run tokens:figma-expected`, paste its output into `EXP` in `scripts/tokens/figma-check.js`, and run that snippet through the Figma MCP `use_figma` tool (in Claude Code: ask Claude to "check the Figma design system for token drift"). It returns `{ checked, drift }`; `drift` must be empty.

Writing Figma variables from CI would need Figma's REST Variables API, which requires an Enterprise plan; until then step 3 is manual (or done by Claude through the Figma MCP), and step 4 proves it.

## Last check

- 30 Sep 2026 (after the Laptop and Tablet Type modes): 128 values, 0 drift.
- 30 Sep 2026: 88 values with `scripts/tokens/figma-check.js` (after OPENBRAIN-118 added the 10 `ui/size-*` sizes in both Type modes), 0 drift. First, manual run: 70 values (Theme light/dark, all 20 chapter-ramp steps, 10 type roles × 2 sizes, radius, layout), 0 drift.

## What is in the Figma file but not in `tokens.json`

- `Reader/*` text styles and the Type collection's `reader/*` sizes: measured from the live reader, which sizes its headings and body in its own CSS rather than from the `.t-*` scale. Reconciling them is design-system cleanup work (see the programme notes).
- Component-level `UI/*` text styles (e.g. `UI/Caps 11`): literal sizes in component CSS, mirrored as they are.
- `color/highlight/*`: the highlighter's colours from `src/composables/useHighlights.js`, which differ from brand.css's `--color-mark*`.
