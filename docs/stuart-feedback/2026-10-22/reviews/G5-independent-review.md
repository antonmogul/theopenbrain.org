# G5 independent review — PR #146

PR: https://github.com/antonmogul/theopenbrain.org/pull/146
Reviewed head: `e63a6ba65125ad302df1dd12cc27349df3f3e703`
Reviewed base/main: `3f1bcd8171632503ac5bea8c822ea67d3c889940`
Implementation commit: `123bb6ebf2aec0bc7a0338b0605752f11a61df87`
Reviewer: fresh independent Codex worker, task `task_0765b32dd937`, dispatch `ctx_d43a9fd8c9e8`; not implementation owner.

## Verdict

**APPROVE at the reviewed SHA: no actionable correctness/security/regression findings.** This is a code-review verdict, not authorization to merge or a claim of deployed acceptance. CI remained in progress at the live GitHub check; Firefox audio, physical sound output and post-release reader acceptance remain outstanding.

Read the coordinator README/developerbrief, R12a–c, G5 research plan and delivery report. Independently inspected the complete exact-head diff against main, including embedded upload/migration payload, tests, kit documentation/archive, browser harness and evidence. No source edits, live database access/writes, merge, deployment, credentials or external messages were made.

## Independently reproduced evidence

| Area | Evidence / result |
|---|---|
| Scoped unit + SQL | 30/30 tests across five files passed with `HISTORY_SQL_HARNESS=/tmp/tahiti-smoke/node_modules/@electric-sql/pglite`; SQL actually executed, no skips. |
| Parent CSP | `index.html:44`: only `data:` added to media-src; other directives unchanged. Inherited policy negative controls reproduced data-media CSP violations, error 4, zero decoded waveform in Chromium and Firefox. |
| Chromium narration | Real user clicks, actual widgetHost, app CSP and scripts-only sandbox: Loewi waveform peak 0.751572, readyState 4, time 1.0211 s; Retina center-surround peak 0.747232, readyState 4, time 1.007883 s; no media policy violations. Bare control peak 0.756689. |
| Firefox narration | Bare unsandboxed/no-CSP control: time 0, readyState 1, peak 0 despite running AudioContext. Fixed widget policy no longer blocks media, but decoded audio remains **INCONCLUSIVE**. This matches the report and does not establish a widget regression. |
| Both-engine layout | Re-ran all 14 captions at 1280×800, 900×600, 700×600, 390×600, 390×420. Positive text-to-transport gaps throughout, no horizontal overflow, source reachable, keyboard Restart/Next and explicit reduced-motion state passed. |
| Original collision | Independently reproduced baseline label overlap at 900 px: Chromium 51.046875 px and Firefox 50.96666 px. Fixed desktop labels do not overlap; redundant timeline Figure 1 button absent while scientific SVG Figure 1 remains. |
| Actual Vue host | Separate reviewer harness mounted real `WidgetFrame.vue`, current upload and parent CSP. All 14 captions passed at 900×600/700×600 default fit and 390×420/320×420 scrollable reader mode; scale 1 throughout, minimum gaps 10/10/10.5/10.5 px, no horizontal overflow/page errors, keyboard Restart/Next and source scrolling passed under browser reduced-motion preference. |
| Source preservation | Examined narrow upload diff and ran comparisons: every embedded asset digest, full timeline JSON, credit and SVG markup/coordinates unchanged (except whitespace-only SVG line). Narration/transcripts and seek data retained; only redundant timeline button skipped. |
| Kit and patch hygiene | ZIP members byte-match source authoring-kit files; `git diff --check` passed. |

Browser rerun:

```sh
G5_ARTIFACTS=/tmp/openbrain-G5-independent-browser \
G5_FIREFOX_EXECUTABLE=/tmp/openbrain-g5-browsers/firefox-1538/firefox/Nightly.app/Contents/MacOS/firefox \
G5_ALLOW_AUDIO_CONTROL_FAILURE=1 node scripts/widget-narration-browser.mjs
```

Machine-readable independent results: `/tmp/openbrain-G5-independent-browser/results.json` and `/tmp/openbrain-G5-independent-mounted.json`.
Reviewer-mounted harness: `/tmp/openbrain-G5-independent-mounted.mjs` (uses preexisting untracked host entry only as a read-only Vite module; creates no source files).
Screenshots: `/tmp/openbrain-G5-independent-browser/` and `/tmp/openbrain-G5-independent-mounted-{900,700,390,320}.png`; visually inspected phone caption/transport screenshot.
Initial reviewer-harness setup encountered an occupied port and raw-module serving configuration error; corrected in the temporary harness and completed on port 63146. These were harness issues, not product failures; no other processes were stopped.

## Correctness, security and migration assessment

- `src/widgets/uploads/loewi-vagusstoff.html:40–46`: min-content grid sizing and non-shrinking caption/control rows remove the flex shrink overlap; size containment prevents the SVG intrinsic size forcing a larger layout. At short mobile heights content scrolls, rather than overlapping or silently hiding source credit. Both standalone host and mounted Vue behavior verified.
- `src/widgets/uploads/loewi-vagusstoff.html:521–524`: skips only redundant Figure 1 timeline presentation, preserving TL chapters used by recording cursor and all remaining seek targets. Does not modify scientific labels, scan or historical migration.
- `index.html:44` plus unchanged `widgetHost.js`/`WidgetFrame.vue`: scripts-only opaque-origin sandbox, connect-src none inside widget, referrer policy and script/frame restrictions remain. Adding embedded media permission is narrowly appropriate to actual data-URI narration; no autoplay delegation or network bridge added.
- `supabase/migrations/20261022030000_g5_loewi_caption_layout.sql:743–753`: locks exact slug before checking; exact final content no-ops; missing prerequisite and unknown/intervening author HTML fail closed; only html/updated_at changed. Tests executed success, metadata/unrelated-row preservation, idempotence, missing upload and edited-author rejection. Historical fit migration stays immutable; test now reads that migration's historical payload rather than treating the latest authoring file as immutable.
- Existing error-handling/audio implementation is preserved. Test distinguishes decoder output from synthetic media-time seeks and documents physical-output limits. Reduced-motion behavior remains user initiated; narration does not auto-start on load.

## Sibling integration and remaining requirements

Live file inventories for PR #144 (G3), #145 (G4), #147 (G6, head d3fcf1295a6c6e5575bbc1045af9caffb9bf44c6) show no changed-file overlap with G5. G4 migration timestamp `20261022020000` differs from G5 `20261022030000`. G1/G2 were not available as open PRs at the check; final integrated reader behavior and any later host/CSP/kit edits still need review. This is not a combined-branch acceptance run.

1. Require green exact-head CI before merge. Both GitHub checks were still IN_PROGRESS when checked; reviewer reran scoped tests and browser checks, not full lint/build.
2. Validate Firefox narration in a working media decoder/runtime and physical audio output; cover other Retina clips/widgets as needed. Do not label Firefox audio passed from currentTime alone.
3. Authorized code deployment and guarded migration application are separate operations. Re-check current stored upload before applying; stop and review if its prerequisite guard rejects an intervening author edit.
4. After release/migration, verify the real authenticated reader and server CSP, desktop/mobile/keyboard/reduced-motion, narration and source credit. No current-production acceptance is claimed.

PR-ready review text: “Reviewed e63a6ba65125ad302df1dd12cc27349df3f3e703 against 3f1bcd8171632503ac5bea8c822ea67d3c889940. No actionable findings: independently passed 30 scoped unit/SQL tests, reproduced original CSP audio failure and corrected Chromium decoded narration, checked all captions in Chromium/Firefox plus actual Vue host at desktop/mobile sizes, and verified source preservation and migration guards. Approve code, subject to green CI; Firefox audio remains inconclusive because its bare control also fails, with deployment/migration and live acceptance still separate.”
