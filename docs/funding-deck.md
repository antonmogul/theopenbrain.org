# Funding deck (`/deck`)

The funder slide deck from the Claude Design handoff "Open Brain Funding
Deck" (7 Oct 2026), rebuilt as Vue components. It is **unlisted**: no nav
link, `noindex` on the page, shared by URL.

| URL               | What                                                    |
| ----------------- | ------------------------------------------------------- |
| `/deck`           | The deck: six pitch slides, then appendix A1–A3 (roles) |
| `/deck#4`         | Opens on slide 4 (the hash follows the slide on screen) |
| `/deck/templates` | Slide templates T1–T15 for future decks                 |

## Presenting

- **← / →**, ↑ / ↓, PgUp / PgDn, Space: previous / next. Home / End: first /
  last. **1–9**: jump to that slide. On a touch screen, tap the left or
  right half.
- **F**: full screen. **N**: speaker notes for the current slide.
- **PDF** (overlay button) or the browser's Print: one slide per page at
  1920×1080. Choose "Save as PDF" and turn margins off if the browser asks.

The overlay (counter and buttons) fades after a few seconds; move the
pointer to bring it back.

## Editing the content

All copy lives in data, not in the components:

- `src/data/decks/funding.js` — the deck (text, speaker notes, team, numbers).
- `src/data/decks/templates.js` — the templates, with placeholder copy.

Each entry is `{ id, label, notes, layout, props }`. `layout` names a
component in `src/components/deck/slides/layouts.js`; `props` are that
component's props. To add a slide, copy a template entry into
`funding.js`, give it a new `id`, and replace the text.

The trajectory strip is drawn from `chapters: { live, inProgress, funded,
unfunded }`; a test checks that the summary sentence matches those numbers,
so update both together.

## Photos and the video

Slots without a file show a dashed placeholder naming what goes there.

- **Team headshots**: put the image in `public/publicAssets/deck/` (e.g.
  `stuart.jpg`) and set `photo: "/publicAssets/deck/stuart.jpg"` on that
  person in `funding.js`. Portrait crops work best (the box is about 4:5);
  `photoPosition: "top"` moves the crop.
- **Feature walkthrough** (slide 3): export or record the walkthrough as
  MP4 (H.264), put it at `public/publicAssets/deck/feature-walkthrough.mp4`
  and set `src` on the `textbook-today` entry. Optionally add a `poster`
  image. A file that fails to load falls back to the placeholder.
- **Template screenshots**: `screen: { src, alt }` (or `image`, `screens`)
  on the template entry.

## Components

`src/components/deck/`:

- `DeckStage.vue` — scaling, navigation, overlay, notes, print.
- `DeckSlide.vue` — the 1920×1080 canvas; imports `deck.css` (slide
  typography, the pinned light palette, role colours, print page size).
- `DeckImage.vue`, `DeviceFrame.vue` (browser / phone / tablet),
  `DeckIcon.vue` (dashboard nav glyphs + globe and code).
- `slides/*.vue` — the layouts. Stories live under **Deck** in Storybook.

The deck pins the light palette so a viewer's dark theme or accent
preference does not recolour it.
