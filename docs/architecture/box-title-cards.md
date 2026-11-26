# Box title cards (OPENBRAIN-94)

`sections.box_card` is nullable JSONB, passed unchanged by chapterTransform.
The reader normalizes it through `helper/boxCard.mjs`:

```json
{
  "enabled": true,
  "image": {
    "src": "/publicAssets/example.webp",
    "alt": "Description",
    "position": "50% 30%"
  },
  "layers": [
    {
      "src": "/publicAssets/background.webp",
      "depth": 0.1,
      "alt": "Background"
    }
  ],
  "quote": "An optional quotation"
}
```

All fields are optional. Null falls back to the current lead picture and opening text. An omitted quote derives the opening text; an empty quote suppresses it. `enabled: false` preserves a box without an opening card (the seed uses this for Descartes, whose picture comes later, and NGF, which opens with a video). Creators can enable either in the Title card controls. Image and layer sources are root-relative paths or HTTP(S) URLs. Up to eight layers share the same canvas, ordered back to front, with depth clamped to 0–1. The optional position is two percentages.

Pinned desktop cards render layers; phones and reduced motion render the original `image`, or a static stack when no original is supplied. An image without layers remains flat. A new card image does not delete an existing, different figure from the box. Its fullscreen control opens its own artwork.

The card flies into part 1's figure only when its flat image source matches that lead figure's source. Different artwork, including layers without a matching flat image, fades in place with the card's ground as the track appears; it never hides or flies into the track's own figure. The same source-match check controls still-card deduplication.

The chapter editor's box placement controls use MediaPicker/ImageUpload and the existing chapter-media bucket. A committed input change emits one undoable `setBoxCard` PATCH; preview scrubbing does not save. Before migration the editor disables the controls. Existing published-edit confirmation and section RLS remain in place.

## Motion and landing contract

Only a pinned rail follows behind the page. Native document position and native track scrollLeft remain exact. A critically damped spring (150 ms mean delay) drives transform offsets on RailPart and the card, and opacity on the card. No wheel/touch interception or document smoothing is added. Large jumps, off-stage travel and native horizontal navigation settle immediately. Resize measures the untransformed layout; `data-rail-max` holds that extent so visual overflow cannot inflate it. `railXOf` removes `data-rail-visual-offset` before calculating a destination.

The card occupies 1.1 screens, centrally defined in `boxTitleCard.js`: image-only hold (0–10%), copy arrival (10–25%), reading hold (25–42%), picture travel (42–90%), and final handoff (90–100%). The existing 0.2-screen rail lead follows before sections slide. `useExploreRail` includes the card in both the pause length and `data-rail-lead`, so timeline, search and readerJump use the same arithmetic. Reduced motion has no pin, spring or holds; phones retain native paging. Pane departure remains page-driven through usePaneBoxExit.

## Release

Deploy reader/editor/assets first, then push `20261124079400_sections_box_card.sql`. Until SQL, reader fallback continues and editor explains the missing column. Seed writes only null cards in History's seven named boxes, preserving author changes on replay. Existing published-read/creator-write section policies apply unchanged; the PGlite test exercises those real policies.

Hippocrates assets are Maura's aligned PNGs converted to 1440px-wide WebP with alpha retained, quality 82 / alpha quality 90. See the ticket evidence report for exact bytes and browser results.
