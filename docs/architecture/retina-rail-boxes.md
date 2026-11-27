# Retina rail boxes (OPENBRAIN-98)

The existing nullable `sections.rail` field is the chapter-independent opt-in. A box with `rail: true` supports widget and non-video demo paragraphs as full-page rail parts, including a box containing only one widget. A paragraph's ID remains its timeline and readerJump target. Legacy History slug defaults retain their trailing widget bands until explicitly opted in.

`RailPart` renders a screen part outside the text columns. `WidgetBreakout` and `BreakSection` keep their stages inside that part: they do not teleport or introduce another full-screen scroll hold. The widget receives the measured remaining height, scrolls internally when needed, and mounts when its part intersects the viewport. RetINaBox's old launch card remains supported before migration; on the rail the title card is its landing screen and entering the part loads the widget. Narrow screens use the same native swipe pages as History, and reduced motion uses flat cards and an unpinned scroller.

Widget blocks may supply `part`, an authored string matching `[a-z0-9-]{1,40}`. The host passes it as `html[data-ob-part]`; it does not inject widget-specific CSS. The colour explorer's one marked CSS block selects one of its four original sections. All scientific scripts, text, artwork and references remain in the source. The last part includes Notes and the footer; without a part the original complete explorer remains unchanged.

Title-card images additionally support `fit: "contain"` and `video`. `image.src` is always the still image. A video loops only on the pinned desktop card with motion enabled, offers Pause image, and falls back to the still on phones, reduced motion and pause. All videos stay muted and inline. Diagram and logo cards use contain to keep their complete artwork visible; paintings use the existing cover treatment.

## Content and treatment

| Box                    | Title-card art                                                | Treatment |
| ---------------------- | ------------------------------------------------------------- | --------- |
| Pupillary light reflex | Eye dilate loop with still fallback                           | dark      |
| Refractive errors      | Glasses Apostle, Conrad von Soest (1403)                      | dark      |
| Blind spot             | Both-eye perimetry from Stuart's SVG                          | pale      |
| Phototransduction      | Existing Max Schultze rod/cone drawing                        | dark      |
| Visual cycle           | Stuart's rhodopsin Warhol image                               | dark      |
| Colour vision          | Existing Ishihara-style plates                                | dark      |
| RetINaBox              | Existing logo, filling the title-card canvas without cropping | dark      |

The main Retina figure pane remains paper. Dark panels follow History and the existing interactive surfaces; pale keeps the perimetry diagram in its paper setting. The colour-vision box contains Dalton's original paragraph and citation 69, followed by The sliver we can see, One wavelength (three numbers), Three lights are enough, and Losing a channel. The former colour-blindness plate is now the landing image. Blind-spot direction 1 fixes the right eye on the man, and both targets are 15% smaller around their existing centres.

## Assets and release

New images are derived from Stuart's supplied files in `/Volumes/Brain/artifacts/stuart-2026-11-26/images/images/`. The 13 MB perimetry SVG is rasterized at 1536×768 then encoded as WebP, with both fields retained. The original file stays in the source artifact folder. Existing Schultze, test-plate and RetINaBox artwork is reused.

The eye loop is Greyson Orlando's public-domain [Eye dilate](https://commons.wikimedia.org/wiki/File:Eye_dilate.gif), converted to muted inline MP4 with a WebP still. It retains its original colours.

Deploy this reader and its assets first, then apply `20261127079800_retina_colour_rail_parts.sql`, then `20261127079810_retina_rail_boxes.sql`. The first migration guards the published upload hash. The second guards the source placements and nesting, keeps all eight existing paragraph IDs, resets their former subsection nesting inside the new boxes, and adds three paragraphs for the other colour parts. No paragraphs, references, figures or reading-progress records are deleted. Replay preserves edited cards and content. The existing `sections.rail` and `sections.box_card` schema migrations must already be applied.

## Verification

The published Retina fixture remains a published export. `Retina Full Reader / Rail Boxes` is a separately labelled pending-content story. `scripts/retina-rail-fixture-browser.mjs` checks seven rails, contained widget stages, the Dalton paragraph, and the four independently rendered colour parts at 1920, 1331 and 375. This lane runs alongside the published Retina and History browser lanes in CI.

`scripts/retina-rail-overlay.mjs` executes the exact box SQL in PGlite against a read-only live snapshot. `scripts/retina-rail-browser.mjs` overlays those rows using Playwright routing, captures before/after frames, and checks readerJump, map jumps, Skip, overflow and reduced motion. Its `.env`-backed application reads are GET-only; neither script writes to a live database. Evidence lives under `/Volumes/Brain/artifacts/feedback-2026-11-24/OPENBRAIN-98/`.
