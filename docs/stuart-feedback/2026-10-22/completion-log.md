# Completion notes for Stuart

Do not send yet. Scope: the two follow-up emails of 22 October, not the preceding meeting backlog.

| Group | Research / plan | Implementation PR | Independent review | Validation | Database / deployment | Plain-English note |
|---|---|---|---|---|---|---|
| G1 Reader/Retina | Normal/reduced motion and mobile causes isolated | [PR148](https://github.com/antonmogul/theopenbrain.org/pull/148), `438090f1` | Independent review running | 72 tests; 42 Chromium/Firefox built-browser checks | No migration; not deployed | Mobile Dragon, reduced-motion stills, moving gaze trace, live cover preferences and single bibliography prepared. |
| G2 Figures/media | Main causes and published metadata researched | [PR149](https://github.com/antonmogul/theopenbrain.org/pull/149), `48de7227` | Independent review running | 40 tests; executed SQL; built-reader desktop/mobile evidence | Migration `20261022010000` unapplied; not deployed | 15-second thumbnails, per-slide captions, wider legends, Fig11 spacing, Huxley-first and consistent videos prepared. |
| G3 Phrenology | Reproduced on main and production | [PR144](https://github.com/antonmogul/theopenbrain.org/pull/144), `fa232f4c` | Request changes: keyboard focus and embedded mobile clipping; Astra fixes dispatched | 38 tests; 21 Chromium artwork cases; independent host check found clipping | No migration; not deployed | Highlights, visible-view selection and requested text repairs implemented; source material unchanged. Two review fixes pending. |
| G4 Penfield | Main/production differences researched | [PR145](https://github.com/antonmogul/theopenbrain.org/pull/145), `7bedea98` | Approved at exact head; CI pending | 54 scoped tests; Chromium and Firefox map fit, selection and event checks | Title migration `20261022020000` unapplied; not deployed | Requested title and purple linked numbers implemented, with original scans and transcripts preserved. |
| G5 Loewi/audio | Inherited parent CSP blocks data audio | [PR146](https://github.com/antonmogul/theopenbrain.org/pull/146), `e63a6ba6` | Approved at exact head; CI pending | 30 scoped tests; Chromium decoded audio; both-engine layout checks; Firefox audio inconclusive | Guarded migration `20261022030000` unapplied; not deployed | Shared narration blocker, redundant timeline label and overlapping controls fixed for review. |
| G6 Breakouts/links | Actual reader pairing and sourced proposals researched | [PR147](https://github.com/antonmogul/theopenbrain.org/pull/147), `d3fcf129` | Request changes: graph imports and adjacent-widget spacing; Astra fixes running | 18 tests; 11 browser scenarios per engine; four built-reader cases | No migration; not deployed; prototype decisions open | Desktop pairs implemented; ordinary links and lateral Descartes remain opt-in review examples. |

Final reply should name actual fixes, tested browsers/sizes, remaining design decisions, content migrations and what is genuinely live. PR creation or passing local tests alone is not deployment acceptance.

## First research checkpoints

- G1: current main already includes PR143 trigger/sequence fixes; investigates missing rendered artwork rather than duplicating those fixes.
- G2: current gallery interval is 10 seconds; the reported short figure window is the validated-in-primates paragraph (Figure 11), not the previously spaced Figure 10.
- G3: reproduced seven reported selections; parser promotes stroke-only SVG details to filled regions. Dropdown and editorial-text requests remain valid on main.
- G4: PR143 already fixes much of map fitting; remaining work is presentation labels and title, with an unapplied guarded title migration.
- G5: investigates inherited parent CSP blocking embedded data-MP3 narration; minimal media policy repair requires served-browser confirmation.
- G6: independent expansion already exists; missing behavior is desktop pairing. Lateral format remains an opt-in prototype and discussion item.
