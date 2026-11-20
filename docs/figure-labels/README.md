# Numbered figure headings (OPENBRAIN-69)

`FigureHeading.vue` draws the record label before its title for renderers that do not own a numbered toolbar: legacy Lotties and video flips, uploads, and split/transition widgets. It uses `railFigureLabel`, also used by the image shell, so numeric labels are padded and box letters stay letters. Unnumbered figures keep their existing presentation. No migration or uploaded artwork changes are needed.

In the pane the heading sits at the artwork's foot, aligned with History's toolbar. Dark ground uses its warn accent and white ink; paper uses the OPENBRAIN-66 chapter-deep accent and paper ink. Captioned Lotties reserve space above the heading. A full-width figure's heading paints its own ground so an underlying pane label cannot show through it. Inline legacy figures and upload bands receive the same record number on phones.

History's existing shell and figure-widget toolbars retain their rendering. The coordinator explicitly approved adding the missing FIG 24 to Loewi, in both layouts. Its before/after screenshots are in [69/](69/).

The published Retina lane checks all 26 distinct records: exactly one visible label, the mono face, caption clearance, artwork/media and controls, upload bridge reports, and page overflow. It also sweeps the full chapter at 450px intervals, reading pane `innerText` on desktop and visible labels on phones. It runs in the existing CI Storybook build; the job limit is 35 minutes to accommodate the added screenshots and sweep (the previous lane used 23 of its 25 minutes).

```sh
GITHUB_ACTIONS=true STORYBOOK_URL=http://127.0.0.1:6010 npm run retina:fixture:browser
GITHUB_ACTIONS=true STORYBOOK_URL=http://127.0.0.1:6010 READER_ENGINE=webkit READER_WIDTHS=1440,390 READER_FIXTURE_OUT=/path/to/webkit npm run retina:fixture:browser
```

Chromium remains the hosted engine. The optional WebKit run records its exact native icon and sandbox service-worker diagnostics separately from application errors. Both engines verify the fonts actually used by the reader instead of waiting indefinitely for WebKit's unused font faces. The fixture is a read-only published export dated 20 November 2026; its named YouTube player is an offline stand-in. This lane does not establish production deployment or UAT acceptance.
