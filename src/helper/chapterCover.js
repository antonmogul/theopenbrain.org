/*
 * Chapter cover image for the opener hero (OPENBRAIN-32).
 *
 * Resolution order: modules.cover_image_url (migration 20260911000100)
 * → code-side map by slug → the neutral default. The slug map exists so the
 * covers Sonia has already chosen render before the column is populated in
 * production; a DB value wins once it is set.
 *
 * The Attention painting is the low-resolution export of the image in
 * Sonia's frame (1495:34229); the full-resolution asset is still hers to
 * supply — replace the file, not the map.
 */
export const DEFAULT_COVER = "/publicAssets/images/background.jpg";

export const COVER_BY_SLUG = Object.freeze({
  // Anton's choice, 24 Sep: Matisse's girl reading, shared with Attention
  // until that chapter gets its own. Set a cover on the chapter page to
  // override (OPENBRAIN-67).
  "foundations-of-neuroscience":
    "/publicAssets/images/attention-matisse-reader.jpg",
  "the-retina": "/publicAssets/images/00-matisse-bg.jpg",
  "attention-and-working-memory":
    "/publicAssets/images/attention-matisse-reader.jpg",
});

function isUsableUrl(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function coverForModule(module) {
  if (!module || typeof module !== "object") return DEFAULT_COVER;
  if (isUsableUrl(module.cover_image_url)) return module.cover_image_url.trim();
  return COVER_BY_SLUG[module.slug] || DEFAULT_COVER;
}
