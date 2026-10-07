# History interactive appendix data

The History widgets use the original `Foundations_ST7_NM3_LL.docx` appendix, SHA-256 `c8118d6d3be7c1f8cc4a6b3ca5893192acab7c33c8f7798fbeab64048b6dbd9f`.

- `penfieldAppendix.json` contains all seven cases, 47 distinct patient/point pairs and 82 separate stimulation events. The original wording, repeated events, alphanumeric point IDs and clinician annotations are preserved. Each event has its own ID and source block reference.
- `phrenologyAppendix.json` contains faculties I–XXXIII, original quotations, associated images and exact captions. Historical claims are labelled as historical, not accepted neuroscience.
- The 35 PNGs under `public/publicAssets/images/foundations/appendix` are byte-identical originals: 28 faculty illustrations and seven brain maps. Image hashes and Word relationship IDs are retained in the JSON. Loading a single detail panel does not preload every image.
- `phrenologyLabelAnchors.json` contains number-label positions within existing SVG region shapes and the corresponding SVG hashes. Existing region paths were not redrawn. Number anchors were calculated from interior pixels within the skull silhouette; the SVG display mask prevents purple regions extending beyond that silhouette.
- Source block references are zero-based top-level Word body-block indices in this exact document version. They are not printed page numbers.

## Deliberate source exceptions

1. Faculty XXII, Weight, has no labelled location or illustration in the source. Its text is available in the faculty picker, without an invented hotspot.
2. G.P. has transcript points 14, 15 and 16, but the original map labels 14, 15 and 17d. Point 16 remains text-selectable with an explanation; it is not silently mapped to 17d.
3. G.E. has transcript point 4, but no visible point 4 in the supplied map. Its original notes remain available through the point list.
4. Source captions for faculty VI and XI conflict with their headings. Captions are preserved and accompanied by explicit editorial notes.

The 45 brain-map click targets mark centres of printed numbers, manually checked against the source image pixels. These are not invented anatomical boundaries. Coordinates use the full, uncropped original image; keep its aspect ratio. Enlarging a map scales the image and its targets together.

## Regression coverage

The source-hash fixture was derived independently from the original appendix extraction. Tests check all quotation paragraphs, every imported image, correct case and faculty numbering, event identities, source exceptions, SVG anchor freshness, selection, repeated dismissal, focus restoration, and the WebGL-unavailable source-content fallback. Browser measurements of displayed skull bounds remain a separate visual QA step.
