/**
 * Where an `image` block's `src` points (OPENBRAIN-60).
 *
 * Seeded chapters store a key ("GABAergic") that the reader has always
 * resolved to /publicAssets/images/<key>.png; uploaded images (plan Phase 3)
 * store a full URL. Both the reader and the editors go through this.
 */
export function imageUrl(src) {
  if (!src) return "";
  if (
    /^(https?:)?\/\//.test(src) ||
    src.startsWith("/") ||
    src.startsWith("data:")
  )
    return src;
  return `/publicAssets/images/${src}.png`;
}
