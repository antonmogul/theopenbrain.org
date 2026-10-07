# Slide decks (`/deck`, Dashboard → Decks)

The funder slide deck from the Claude Design handoff "Open Brain Funding
Deck" (7 Oct 2026), rebuilt as Vue components. Since OPENBRAIN-129 decks are
edited in the creator dashboard and stored in Supabase; the code keeps a
frozen October copy as the fallback. The pages that present a deck are
**unlisted**: no nav link, `noindex` on the page, shared by URL.

| URL                               | What                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/deck`                           | The published deck a creator chose to show there (the funding deck, once the seed is pushed). Falls back to the bundled October copy: six pitch slides, then A1–A3. |
| `/deck#4`                         | Opens on slide 4 (the hash follows the slide on screen). Works on every deck URL.                                                                                   |
| `/deck/s/<token>`                 | A published deck by its share link. No sign-in. Never falls back: an old or wrong link says "This link isn't available".                                            |
| `/deck/templates`                 | Slide templates T1–T15, bundled. Also the Add-slide gallery in the editor.                                                                                          |
| `/dashboard?section=decks`        | The deck list (creators).                                                                                                                                           |
| `/dashboard/decks/<slug>`         | The editor (creators).                                                                                                                                              |
| `/dashboard/decks/<slug>/present` | Presents the unpublished working copy, with speaker notes (creators).                                                                                               |

The editor names `/deck` by the host it is open on ("Show this deck at
theopenbrainorg-production.up.railway.app/deck" in production today), so the
address it gives is one that serves the deck. The theopenbrain.org domain
still points at the 2023 site; once it moves, the same labels read
theopenbrain.org/deck with no code change.

## Presenting

- **← / →**, ↑ / ↓, PgUp / PgDn, Space: previous / next. Home / End: first /
  last. **1–9**: jump to that slide. On a touch screen, tap the left or
  right half.
- **F**: full screen. **N**: speaker notes for the current slide. Funders
  never receive notes, so on their copy there is no Notes button and N does
  nothing. That holds for the bundled copy `/deck` falls back to as well:
  the page drops its notes unless a creator is signed in.
- **PDF** (overlay button) or the browser's Print: one slide per page at
  1920×1080. Choose "Save as PDF" and turn margins off if the browser asks.
- **Edit** (overlay link, signed-in creators only, never printed): opens the
  deck in the editor in a new tab.

The overlay (counter and buttons) fades after a few seconds; move the
pointer to bring it back. Hidden slides are skipped.

## Making and editing a deck

**Dashboard → Decks** (last item in the creator nav) lists the decks, with a
search box and All / Drafts / Published / Archived filters. Each card shows
the first slide, the status, "Unpublished changes" when the working copy is
ahead of what funders see, and "Shown at /deck" on the pinned deck. Card
actions: Edit, Present (new tab), Copy link (published decks), and More:
Duplicate, Archive / Restore, Delete.

**New deck** asks for:

- a title;
- a link name (the slug), filled in from the title. It appears only in
  creator URLs and is fixed once the deck exists: the public read functions
  leave it out unless a creator asks, and uploaded images are filed under
  the deck's id, not its slug. Lowercase letters, digits and dashes; `new`,
  `present`, `s` and `templates` are reserved;
- the kind: Funding, Pitch or Talk;
- what to start from: Blank (one title slide), Copy of the funding deck (the
  bundled October copy, 9 slides) or Every template (15 slides).

**The editor** (`/dashboard/decks/<slug>`, 1024 px and wider; narrower
screens get Present draft and Share only) has three parts:

- **Slide rail**: thumbnails in order. Click to select, ↑ / ↓ to move the
  selection, drag or Alt+↑ / Alt+↓ to reorder, Delete or Backspace to remove
  (with Undo). Each item's menu has Duplicate, Hide when presenting / Show,
  Add slide below and Delete. **+ Add slide** opens a gallery of blank
  layouts, the templates and the funding deck's slides.
- **Preview**: the selected slide at 1920×1080, scaled to fit. If text runs
  off the slide, the editor says so.
- **Form**: label, layout, hide when presenting, speaker notes, then one
  field per prop of the layout. Lists keep to the counts the layout can draw
  (columns take 2 to 4 items, the trajectory up to 3 milestones, ...). Text
  fields get smart punctuation when you leave them (“ ” ’ — …). The
  trajectory form can write the summary sentence from the counts, and can
  check the live chapter count against the catalog. Each chapter count is 0
  to 200 (one bar per chapter): more is an error, and a stored count over
  the cap is drawn as 200.

Edits **autosave** a second after you stop typing, to a working copy only
creators can see. The header shows "Saved 14:02", "Saving…" or "Not saved ·
Retry"; Cmd/Ctrl+S saves now. Undo / Redo (Cmd/Ctrl+Z, Shift+Cmd+Z or
Ctrl+Y outside text fields) go back 50 steps. If another tab or creator saved
the deck first, a dialog offers "Load theirs" or "Keep mine" (focus starts on
its text, so a keystroke can't answer it). After "Load theirs", Undo brings
your version back and saves it over theirs. A save whose reply was lost (the
connection dropped after it left) is recognised as this tab's own on the
next save, not reported as a conflict.

**Problems (n)** lists what is wrong, slide by slide; clicking one jumps to
the field. Errors (a required field empty, a list over its limit, a
duplicate, an unknown layout, no visible slides, ...) block Publish.
Warnings don't: text over its length, an image without alt text, an empty
image or video slot (funders see the placeholder), an address the site
blocks, text running off the slide, a trajectory summary that disagrees with
its chapter counts, and eyebrows numbered by hand ("03 · ...") that no
longer match the slide's position. **Renumber eyebrows** (in Problems and
the More menu) fixes the last one.

**Present draft** saves, then presents the working copy in a new tab, notes
included, starting on the selected slide.

## Publishing and sharing

**Publish** copies the working copy into a frozen snapshot, which is all that
funders and `/deck` ever see. Later edits stay private until you press
**Publish changes**. Every publish also stores a revision in the database;
there is no screen to browse or restore them yet. **Discard unpublished
changes** (More menu, can be undone) puts the working copy back to the
published version: the database copies the snapshot it holds
(`discard_deck_changes`), so if another tab published meanwhile, the copy
that comes back is the one funders see now.

**Share** holds:

- the funder link, `/deck/s/<token>`, with Copy. Add `#N` to open on slide N.
  "Open as a funder sees it" opens it in a new tab (signed in as a creator,
  you also see the notes there);
- **Show this deck at `<site>/deck`** (published decks only). One deck is
  shown there at a time; switching it on for one deck turns it off for the
  other. Switching it off only ever unpins this deck, so a dialog left open
  while another creator pinned a different deck can't take /deck from it;
- **Make a new link**: the old link stops working at once;
- **Unpublish**: the link stops working, and if the deck was shown at
  `/deck`, `/deck` goes back to the bundled copy. The link and the last
  snapshot are kept, so publishing again brings the same link back; showing
  it at `/deck` has to be switched on again.

Archiving a deck does the same as unpublishing it; Restore brings it back as
a draft.

Things to know before sending a link:

- **The link is the only key.** Anyone who has it can open the deck, without
  signing in, until you make a new link or unpublish. There is no expiry, no
  per-funder link and no view count.
- **Speaker notes are never sent to funders.** The database strips them from
  `/deck` and shared links unless the viewer is a signed-in creator, and the
  page strips them from the bundled fallback.
- **Hidden slides** stay in the deck and are left out of what funders get, so
  one deck can serve several funders.

## What `/deck` shows

`/deck` asks the database for the pinned published deck
(`rpc/get_pinned_deck`). It shows the bundled October copy
(`src/data/decks/funding.js`) instead when:

- the site has no Supabase configuration;
- the request fails, or takes more than 5 seconds;
- the decks migration has not been pushed yet;
- no deck is pinned: the pinned deck was unpinned, unpublished, archived or
  deleted.

Nothing new is exposed by the fallback: that copy is already in the public
JS bundle. The page tells you which one you got: `.deck-view` carries
`data-deck-source="db"` or `"bundled"`.

## Images and video

Every image slot offers three ways in:

- **Upload** a JPEG, PNG, WebP or GIF up to 10 MB. It goes to the public
  `chapter-media` bucket under `decks/<deck id>/` (the uuid, never the
  slug), not into the chapter media library. An upload that finishes after
  you selected another slide still lands on the slide it was for.
- **From the library**: pick an existing image from the chapter media
  library (read-only).
- **Paste a URL**.

Uploaded and library images have **public URLs**: anyone who has the address
can open them, deck link or not. Put nothing confidential in an image. Only
creators can list the bucket
(`20261007010200_chapter_media_no_listing.sql`; before that push, the
publishable key could list every folder and file name in it).

The site's Content Security Policy (`index.html`) loads images only from the
site itself (`/…`, e.g. `/publicAssets/deck/stuart.jpg`) and from
`https://*.supabase.co/…` (plus `https://i.ytimg.com/…`); videos only from the
site and `https://*.supabase.co/…`. An address anywhere else is flagged in the
form and shows the placeholder to funders without being requested (a refused
request would log an error on every page showing the slide), as does an
image that fails to load.

- **Alt text**: every image field has one; an image without it is a warning.
- **Team headshots**: portrait crops work best (the box is about 4:5);
  the position control moves the crop to the top or bottom.
- **Video** (the feature walkthrough): a URL only, no upload, because
  `chapter-media` refuses video and caps files at 10 MB. Export the
  walkthrough as MP4 (H.264) and either commit it under
  `public/publicAssets/deck/` (`/publicAssets/deck/feature-walkthrough.mp4`)
  or upload it to Supabase Storage yourself and paste that URL. Optionally
  add a poster image.
- **Template screenshots**: the screen, phone and device slots are image
  fields like any other.

Deleting a deck does not delete the images uploaded for it.

## Where things live

- **Database**: `supabase/migrations/20261007010000_decks.sql` adds `decks`
  (one row per deck: the working `slides`, the `published_slides` snapshot,
  `share_token`, `pinned`, and a `version` the editor's saves compare and
  swap) and `deck_revisions` (a row per publish). Only creators can read or
  write either table. The public reads through `get_shared_deck(token)` and
  `get_pinned_deck()`, which drop hidden slides, notes and the slug; the
  editor publishes with `publish_deck()`, discards with
  `discard_deck_changes()` and pins with `set_pinned_deck()` (unpinning is a
  PATCH of its own row). See `docs/production-sql.md` for pushing it.
- **Slide data**: each slide is `{ id, label, notes, layout, props, hidden }`.
  `layout` names a component in `src/components/deck/slides/layouts.js`;
  `props` are that component's props, plain text only.
- `src/data/decks/fields.js`: one field schema per layout (what the form
  shows, limits, required fields). A test keeps its keys and required flags
  equal to each component's props, so a new layout needs a schema entry but
  no migration.
- `src/data/decks/validate.js`: normalising, validation (the Problems list),
  defaults for a new slide, layout switching.
- `src/data/decks/index.js`: the bundled decks, the New deck starters and
  the Add-slide gallery. `text.js`: slugs and smart punctuation.
- `src/data/decks/funding.js`: the frozen October copy (fallback, seed and
  story fixture). `src/data/decks/templates.js`: the templates.

## Regenerating the seed

`supabase/migrations/20261007010100_seed_funding_deck.sql` is generated from
`funding.js` and inserts it as the published deck `funding`, pinned to
`/deck` unless another deck already is:

```bash
npm run deck:seed-sql              # rewrite the migration from funding.js
npm run deck:seed-sql -- --check   # exit 1 if it is out of date
```

It is `on conflict (slug) do nothing`, so it never overwrites a deck edited
in the dashboard. Regenerate it only before it has been pushed. After that,
editing `funding.js` changes the bundled fallback and the stories, never the
live deck: edit the live deck in Dashboard → Decks.

## Components

`src/components/deck/`:

- `DeckStage.vue`: scaling, navigation, overlay, notes, print, the Edit link.
- `DeckSlide.vue`: the 1920×1080 canvas; imports `deck.css` (slide
  typography, the pinned light palette, role colours, print page size).
- `DeckImage.vue` (falls back to its placeholder when the file fails),
  `DeviceFrame.vue` (browser / phone / tablet), `DeckIcon.vue` (dashboard nav
  glyphs + globe and code).
- `slides/*.vue`: the layouts.
- `SlidePreview.vue`: one slide scaled into a box, for the editor and the
  thumbnails. It never mounts `DeckStage`.
- `editor/`: the rail, form, fields and dialogs of the editor.

The views are `DeckView.vue` (every presenting URL) and `DeckEditorView.vue`;
the list is `components/dashboard/sections/DecksSection.vue`. The data goes
through `useDecks` (list and writes), `useDeckEditor` (the open deck) and
`useDeckSource` (where DeckView's slides come from). Stories live under
**Deck** in Storybook (`Deck/Editor/*` for the editor parts), with the
section under Dashboard and the pages under Views.

The deck pins the light palette so a viewer's dark theme or accent
preference does not recolour it.

## Known limits

- Editing is through the form; there is no typing on the slide itself, and
  no colours, fonts, free positioning, rich text or links.
- No video upload, and no revision history screen (the revisions are
  stored).
- The editor needs a screen at least 1024 px wide.
- `deck.css` sets a 1920×1080 print page. Once deck styles have loaded (a
  deck, the editor or the Decks section), it also applies to a dashboard page
  printed in the same tab.
