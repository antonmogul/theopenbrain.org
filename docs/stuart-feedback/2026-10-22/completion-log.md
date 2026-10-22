# Completion notes for Stuart

Do not send yet. Scope: the two follow-up emails of 22 October, not the preceding meeting backlog.

| Group | Research / plan | Implementation PR | Independent review | Validation | Database / deployment | Plain-English note |
|---|---|---|---|---|---|---|
| G1 Reader/Retina | Normal/reduced motion and mobile causes isolated | [PR148](https://github.com/antonmogul/theopenbrain.org/pull/148), `77d928f9` | Approved at corrected exact head; CI pending | 2442 tests; 42 Chromium/Firefox built-browser checks | No migration; not deployed | Mobile Dragon, reduced-motion stills, moving gaze trace, live cover preferences and single bibliography prepared. |
| G2 Figures/media | Main causes and published metadata researched | [PR149](https://github.com/antonmogul/theopenbrain.org/pull/149), `48de7227` | Approved at exact head; CI pending | 40 tests; executed SQL; built-reader desktop/mobile evidence | Migration `20261022010000` unapplied; not deployed | 15-second thumbnails, per-slide captions, wider legends, Fig11 spacing, Huxley-first and consistent videos prepared. |
| G3 Phrenology | Reproduced on main and production | [PR144](https://github.com/antonmogul/theopenbrain.org/pull/144), `aa6d1e35` | Approved at corrected exact head; CI pending | 2439 tests; 21 artwork cases; 27 host/viewport/motion regression cases | No migration; not deployed | Highlights, visible-view selection and requested text repairs implemented; source material unchanged. Both review corrections independently verified. |
| G4 Penfield | Main/production differences researched | [PR145](https://github.com/antonmogul/theopenbrain.org/pull/145), `7bedea98` | Approved at exact head; CI pending | 54 scoped tests; Chromium and Firefox map fit, selection and event checks | Title migration `20261022020000` unapplied; not deployed | Requested title and purple linked numbers implemented, with original scans and transcripts preserved. |
| G5 Loewi/audio | Inherited parent CSP blocks data audio | [PR146](https://github.com/antonmogul/theopenbrain.org/pull/146), `e63a6ba6` | Approved at exact head; CI pending | 30 scoped tests; Chromium decoded audio; both-engine layout checks; Firefox audio inconclusive | Guarded migration `20261022030000` unapplied; not deployed | Shared narration blocker, redundant timeline label and overlapping controls fixed for review. |
| G6 Breakouts/links | Actual reader pairing and sourced proposals researched | [PR147](https://github.com/antonmogul/theopenbrain.org/pull/147), `36f25bf2` | Approved at corrected exact head; CI pending | 26 tests; 17 Storybook and six real-reader cases per engine | No migration; not deployed; prototype decisions open | Desktop pairs, continuous widget seams and mobile nested artwork corrected; links/lateral reading remain opt-in. |

Final reply should name actual fixes, tested browsers/sizes, remaining design decisions, content migrations and what is genuinely live. PR creation or passing local tests alone is not deployment acceptance.

## First research checkpoints

- G1: current main already includes PR143 trigger/sequence fixes; investigates missing rendered artwork rather than duplicating those fixes.
- G2: current gallery interval is 10 seconds; the reported short figure window is the validated-in-primates paragraph (Figure 11), not the previously spaced Figure 10.
- G3: reproduced seven reported selections; parser promotes stroke-only SVG details to filled regions. Dropdown and editorial-text requests remain valid on main.
- G4: PR143 already fixes much of map fitting; remaining work is presentation labels and title, with an unapplied guarded title migration.
- G5: investigates inherited parent CSP blocking embedded data-MP3 narration; minimal media policy repair requires served-browser confirmation.
- G6: independent expansion already exists; missing behavior is desktop pairing. Lateral format remains an opt-in prototype and discussion item.

## Final code-review handoff — 22 October, 19:03 UTC

All six implementation PRs have independent approval at the exact heads above. Review findings were corrected by Astra and re-reviewed for G1, G3 and G6. Original review reports and correction re-reviews are retained under [reviews](reviews/). This is local code approval, not a GitHub approving-review event or release approval.

- GitHub CI at the latest snapshot: main lint/test/build/Storybook workflow still in progress for every PR. History fixture workflow passed for PR145, PR146 and PR149; pending for corrected PR144, PR147 and PR148. Earlier failed commits in PR147/148 were superseded; current commits have no reported failed checks at this snapshot.
- Three migration files are committed and unapplied: G2 `20261022010000`, G4 `20261022020000`, G5 `20261022030000`. Versions are distinct. No live database write, merge or deployment occurred in this follow-up run.
- Combined sibling-PR integration is a separate acceptance gate. Preserve G1 lifecycle and G2 video hunks in IllustrationComp. Re-run combined reader/media/widget checks after authorized integration.
- Firefox narration remains inconclusive because a bare audio control also fails in the test runtime; Chromium decoded narration is verified. Physical audio and authenticated deployed acceptance remain outstanding.
- Stuart's next-week choices remain open: final breakout format, lateral-reading scope, source-link policy and navigation. Proposals remain Storybook-only.
- Completion notes are prepared, not emailed. No follow-up email was sent in this run.

## Draft wording for Stuart — unsent

We have worked through both follow-up emails and prepared six reviewed PRs covering Retina artwork and references, gallery/media presentation, phrenology highlights and text, Penfield labels and title, Loewi layout and narration, and paired Explore cards. Independent reviewers found several issues during the first pass; these were corrected and reviewed again. The changes are not live yet: CI, combined release checks and the three content migrations remain separate steps. We have kept the final breakout/link-format choices for our discussion next week, and Firefox narration still needs a working-browser audio check.
