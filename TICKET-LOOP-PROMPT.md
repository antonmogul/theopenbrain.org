Work through the Open Brain tickets below **one at a time, in this exact order**. Finish one completely — merged and deployed — before starting the next. Do not batch them, do not work ahead.

```
/Users/antonmacmini/Documents/Github/Artificial-Brain/vault/02-projects/11eight/open-brain/tickets/OPENBRAIN-11-wire-data-chapter-colour-ramps.md
/Users/antonmacmini/Documents/Github/Artificial-Brain/vault/02-projects/11eight/open-brain/tickets/OPENBRAIN-6-case-cabinet-demo-ready-unify-close.md
/Users/antonmacmini/Documents/Github/Artificial-Brain/vault/02-projects/11eight/open-brain/tickets/OPENBRAIN-10-finish-animation-supabase-migration.md
/Users/antonmacmini/Documents/Github/Artificial-Brain/vault/02-projects/11eight/open-brain/tickets/OPENBRAIN-7-skull-hotspots-calibrate-and-wire-chapter-colour.md
/Users/antonmacmini/Documents/Github/Artificial-Brain/vault/02-projects/11eight/open-brain/tickets/OPENBRAIN-9-production-readiness-paydown.md
```

Repo: `/Users/antonmacmini/code/theopenbrain.org` (Vue 3 + Vite + Pinia + GSAP + Tailwind + Supabase).

---

## Per-ticket loop

### 1. Read and scope

Read the ticket in full. It contains file paths and line numbers — **verify each one still exists before trusting it**; the codebase moved after a repo-wide prettier pass on 2026-08-05, so line numbers may have shifted.

Restate the scope in one paragraph before writing code. If the ticket has a "Do NOT" or "out of scope" section, honour it exactly.

If a ticket turns out to be already done, or blocked by something outside its scope: **write that finding into the ticket, mark it accordingly, and move to the next one.** Do not invent work to fill it.

### 2. Branch

```bash
git checkout main && git pull
git checkout -b fix/openbrain-<N>-<short-slug>
```

### 3. Build it

Match the surrounding code's style and comment density. Comments explain _why_, not _what_.

**Write tests for anything with logic.** Vitest is the real suite (`npm test`, 167 tests, `src/**/__tests__/`). Extract pure logic into a helper and test it rather than trying to test through the DOM. Do not chase coverage on GSAP/WebGL rendering itself — test the seams around it.

### 4. Confirm it's actually complete — this is the gate

A ticket is NOT done because the code compiles. Prove it:

```bash
npm run format:check    # must exit 0
npm run lint:ci         # must exit 0
npm test                # all green — currently 167
npm run build           # must succeed
npm run test:smoke      # 22/22 browser checks
```

**Then verify in a real browser.** `npm start` → http://localhost:5173. Load the routes the ticket touches, interact with them, check the console is clean. For animation work use `node scripts/filmstrip.mjs` (drives the GSAP timeline via `window.__cc` and writes frames to `.filmstrip/`) and **actually look at the images**.

Walk the ticket's "Definition of done" checklist item by item and confirm each one. If you can't verify an item, say so explicitly rather than ticking it.

### 5. PR

```bash
git push -u origin HEAD
gh pr create -R antonmogul/theopenbrain.org --base main --title "..." --body "..."
```

⚠️ The repo is a **fork** — always pass `-R antonmogul/theopenbrain.org` or `gh` targets the upstream (`jonasvonarb`) and fails.

PR body: what changed, why, how you verified it, and what you deliberately did NOT do.

### 6. Review with Codex, then fix

```bash
codex exec --sandbox read-only "Review the diff on branch <branch> in /Users/antonmacmini/code/theopenbrain.org against main. Focus on correctness, silent failure modes, and regressions to existing behaviour. Be adversarial — try to find what breaks. List findings by severity with file:line."
```

Triage every finding. **Fix the real ones.** For anything you disagree with, say why in the PR — don't silently ignore it. Re-run the full gate from step 4 after fixing.

### 7. Merge and monitor the deploy

```bash
gh pr merge <N> -R antonmogul/theopenbrain.org --merge
```

Railway **auto-deploys from `main`** — do not run `railway up`, the push is the deploy.

```
project     open-brain-explorer   3f827b66-78d8-4c39-a146-928bc2d04910
service     theopenbrain.org      e9fa703d-d1f2-4318-826d-7fbc2e43b979
production  8358c245-6453-4c4f-a9d2-f274a690e575
            https://theopenbrainorg-production.up.railway.app
```

```bash
railway link -p 3f827b66-78d8-4c39-a146-928bc2d04910 -e 8358c245-6453-4c4f-a9d2-f274a690e575 -s e9fa703d-d1f2-4318-826d-7fbc2e43b979
railway deployment list        # wait for SUCCESS
node scripts/smoke.mjs --base https://theopenbrainorg-production.up.railway.app
```

**Wait for SUCCESS and a passing smoke run before moving on.** If the deploy fails or smoke regresses, fix forward — that's part of the ticket, not the next one.

Note: `VITE_*` vars are baked in at build time, so changing one requires a rebuild.

### 8. Close the ticket

Edit the ticket file. Set `status: review` in the frontmatter and append:

```markdown
## ✅ Implemented YYYY-MM-DD — PR #N

**What changed** — the actual edits, file by file.
**How it was verified** — commands run, routes loaded, what you looked at.
**Codex findings** — each one, and how it was resolved.
**Deploy** — deployment ID and the production smoke result.
**Not done / deferred** — anything left, and why. Be honest here.
```

If you discovered something worth its own ticket, write it as a new
`OPENBRAIN-<next>-<slug>.md` in the same folder using the same frontmatter shape,
and bump the counter in
`/Users/antonmacmini/Documents/Github/Artificial-Brain/vault/system/ticket-counters.md`.

Then **start the next ticket from step 1.**

---

## Rules

- **One ticket at a time**, fully merged and deployed before the next.
- **Never force-push, never `git push --force`, never rewrite `main`'s history.**
- **Do not touch `.env` or print secrets.** They're already set in Railway.
- **`main` must stay green.** If the gate fails, fix it before merging.
- **Report honestly.** If tests fail, say so with output. If you skipped something, say that. Never mark a ticket done that you couldn't verify.
- If you're genuinely blocked, or the ticket asks for a product decision (e.g. "ship 3D or keep 2D"), **stop and ask** — don't guess.

## Context that will save you time

- **Demo chapter is chapter 3** — `/chapter/3/foundations-of-neuroscience`. Chapter 1 is `/chapter/1/the-retina`.
- Unlisted prototype routes: `/case-cabinet`, `/phrenology`, `/phrenology-3d`, `/styleguide`.
- Case cabinet dev flags are URL-gated: `?slow=3` slow-mo, `?scrub=1` timeline scrubber.
- Dev server **5173**, preview **4173**.
- Cypress is nearly empty — 3 e2e specs, and `npm run test:unit` runs **zero** tests. Vitest is the real suite.
- `docs/ci.md` explains the pipeline. `docs/chapter1-parity/` documents a past bug where the app read empty arrays with no error — that silent-empty failure mode recurs in this codebase, so guard against it.
