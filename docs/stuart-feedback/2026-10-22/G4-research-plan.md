# G4 — Penfield maps and labels (R09, R10)

## Research, 22 October 2026

- Base and freshly fetched `origin/main`: `3f1bcd8171632503ac5bea8c822ea67d3c889940` (PR143).
- Main already fits each full scan to the map viewport using both dimensions, resets magnification on case changes, switches cases immediately and reverses the drawer animation. Preserve these fixes; do not reimplement them.
- The current [demo](https://theopenbrainorg-production.up.railway.app/case-cabinet) still renders the older cabinet DOM. Deployment lag explains the reported clipped maps; it does not explain away the label request.
- The [original Retina chapter](https://theopenbrain.org/chapter) remains the 2023 reference (bundle `index.31e00edc.js`). It has no History/Penfield cabinet to reproduce; its visual vocabulary is the reference, not an alternative Penfield dataset.
- R09 is present in main's placement and stored-title migration: `Be Penfield`. Reader database content and fallback placements must both be updated, alongside standalone/catalog naming.
- R10 is present in main: black numerals belong to the immutable source PNGs and the clickable marker's span is visually hidden. Main has square outlines rather than the reported earlier circles.
- Inspected all seven original scans. There are 47 transcript points, 45 mapped points and 82 distinct events. G.P. 16 and G.E. 4 deliberately have no map coordinates. Some numerals lie very close to anatomical lines; whole-map redrawing/inpainting or generic circular masks would risk scientific detail.

## Implementation

1. Use hand-bounded SVG presentation masks in original image coordinates, replacing only mapped printed numerals with purple IBM Plex button text at the existing hotspot coordinates. Keep original PNGs, JSON, source hashes and transcripts byte-for-byte intact. Keep G.P. `17d` visible because it is not a mapped transcript point.
2. Add an explicit original-scan toggle and original-file link. The toggle removes both masks and map buttons, while the complete point list remains usable. Label the default as a presentation view.
3. Preserve PR143 fit/switch/motion behavior. Verify both portrait multi-view scans in full, fit after zoom and switching, narrow-screen map/notes navigation, keyboard selection and Escape, OS and explicit reduced motion.
4. Apply the corrected exact title to the placement and standalone/catalog. Add a uniquely named, guarded, idempotent SQL migration that changes only the known old title in History case-cabinet blocks; test untouched unrelated/custom blocks and a second application. Do not apply it to live Supabase.
5. Run source-integrity, component, migration and browser checks; scoped lint/format and production build. Browser checks must count every patient/point/event and inspect actual map artwork, label positions, scrolling and interactions. Deliver a focused PR and independent-review handoff.

## Boundaries

No source scan regeneration, fabricated coordinates, changes to scientific text, live database writes, merge or deployment. No open Stuart discussion decision is assigned to G4. Dense source labels remain inherently close at full-map fit; magnification and equivalent large point-list controls remain available.
