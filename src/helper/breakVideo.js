/** Published blocks own video metadata. The asset inventory keeps old blocks
 * playable between deploying the reader and applying OPENBRAIN-61's migration. */
const assets = Object.keys(
  import.meta.glob([
    "/public/publicAssets/video/breakSections/*.mp4",
    "/public/publicAssets/videos/*.mp4",
    "/public/publicAssets/images/breakVideos/*.png",
    "/public/publicAssets/videos/*.webp",
    "/public/publicAssets/images/placeholders/*.webp",
  ])
).map((path) => path.replace(/^\/public/, ""));

export function breakVideoOf(block = {}, title = "", text = "") {
  const slug = block.videoSlug || block.slug || "placeholder";
  const src = block.src || assets.find((path) => path.endsWith(`/${slug}.mp4`));
  const poster =
    block.poster ||
    assets.find(
      (path) => path.endsWith(`/${slug}.png`) || path.endsWith(`/${slug}.webp`)
    ) ||
    (slug === "placeholder"
      ? assets.find((path) => path.endsWith("/monaLisa.webp"))
      : "");
  const label = block.title || title || slug.replaceAll("-", " ");
  return {
    ...block,
    slug,
    src,
    poster,
    ...(["baden", "dowling-and-werblin"].includes(slug)
      ? { posterPlay: "chapter" }
      : {}),
    ...(block.posterPlay ? { posterPlay: block.posterPlay } : {}),
    title: label,
    caption:
      block.caption ||
      [label, block.text || text, block.credit || block.credits]
        .filter(Boolean)
        .join(" — "),
  };
}
