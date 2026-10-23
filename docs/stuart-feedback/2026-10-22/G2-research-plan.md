# G2 — figures, galleries and media

Baseline: origin/main `3f1bcd81` (PR #143). Production was last verified at PR #140 by the coordinator; live reader inspection is read-only and does not establish a deployment SHA. Original reference: https://theopenbrain.org/chapter; demo: https://theopenbrainorg-production.up.railway.app.

## Research and implementation plan

- **R04**: `FigureImages` still advances at 10 seconds and renders dots. Change to 15 seconds and square, labelled image thumbnails with a horizontally scrollable strip. Preserve hover/focus/visibility/manual/reduced-motion pauses; prevent a first-slide player from advancing while watched.
- **R13**: `IllustrationPlaceholder` always uses the figure-level caption for galleries, while `FigureImages` separately shows slide captions below. Figure 19 has two Galvani plates without individual captions, followed by the squid film (`ZSCUbYyrHug`). Make the shell's single legend follow its shared selected index, and add plate captions by separating the existing authored friction-machine/atmospheric-electricity description, preserving its source attribution and the original overall caption.
- **R11**: the shell legend has a `62ch` width cap and shares a flex row with the expand control. Use the available width below the heading and expand control; preserve long-caption scrolling and art space.
- **R08**: the exact “Fritsch and Hitzig’s work was validated soon afterwards in primates” paragraph introduces **Figure 11**, not Figure 10. Existing round-3 migration gives the preceding Figure 10 paragraph one screen of bottom room (room before this paragraph); add one screen below the exact Figure 11 paragraph using the existing `animationFlags.room` path. No SectionComp changes or global spacers.
- **R14**: `20261011000000_history_manuscript_videos.sql` appends the Huxley interview (`KbA3RLz3xUQ`) to Figure 21 after Eccles. Reorder existing JSON items only, preserving the Eccles caption on its own item so it cannot appear over Huxley. Do not confuse it with Figure 19's squid film.
- **R17**: original Retina uses dedicated break routes with local MP4 interviews (observed Neitz source, autoplay, muted and loop), plus the waves YouTube illustration. Main retains those separate presentations while History has a 16:9 click-to-load `VideoEmbed` pattern. Extend that established component to local MP4 sources and reuse it in Retina cards, legacy illustration video and break routes; keep source URLs, original posters, titles and descriptions. Use square controls and explicit reduced-motion CSS.

## Boundaries and validation

G1 owns IllustrationComp lifecycle; G2 changes only its video template/import. G6 owns SectionComp pairing; G2 needs no edits there. All data corrections ship in a uniquely named, idempotent migration, unapplied to live Supabase. Preserve source scans, hashes, content and coordinates. Fixture tests cover 15-second timing, pause rules, per-slide shell/modal legends, media source preservation and migration idempotence/guards; browser QA checks actual artwork, keyboard and desktop/mobile layout at port 6102. Scoped lint/format and production build follow. No merge, deployment or external email.

## Research confirmation

Read-only browser reproduction on the demo confirmed Figure 19's top legend is unchanged after Next, Figure 21 begins with Eccles, and the exact validated-in-primates trigger owns Figure 11 without a room attribute. The original Neitz break page uses the same local MP4 with muted autoplay/loop. Production Retina links also resolve incorrectly beneath `/chapter/2/chapter/break/...`; inline reuse removes that relative-route defect. Existing placeholder-labelled clips remain placeholders; this change does not supply missing interviews.

Primary documentation consulted: [YouTube player parameters](https://developers.google.com/youtube/player_parameters) for explicit player starts and preserved source IDs, and [WAI carousel guidance](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) for named native controls and avoiding automatic live-region announcements. The implementation retains the existing temporary focus/hover pauses requested in R04, adds an explicit pause/resume control, and keeps manual selection stopped until explicit resume.
