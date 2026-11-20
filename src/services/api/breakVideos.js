import { get } from "./client";
import { breakVideoOf } from "@/helper/breakVideo";

/** The route catalog is RLS scoped to published modules (or creators).
 * Prefer a live placement so editing its block also updates the standalone URL.
 * No RPC/schema dependency in the deploy-before-migration window. */
export async function fetchBreakVideo(slug) {
  if (!/^[a-z0-9-]+$/.test(slug || "")) return null;
  const paragraphs = await get(
    `paragraphs?content->blocks=cs.${encodeURIComponent(JSON.stringify([{ type: "break_video", videoSlug: slug }]))}&select=id,content&limit=1`
  );
  const block = paragraphs?.[0]?.content?.blocks?.find(
    (b) => b.type === "break_video" && b.videoSlug === slug
  );
  if (block?.src || block?.youtubeId) return breakVideoOf(block);
  try {
    const rows = await get(
      `break_videos?slug=eq.${encodeURIComponent(slug)}&select=data&limit=1`
    );
    if (rows?.[0]?.data) return breakVideoOf(rows[0].data);
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const text =
    paragraphs?.[0]?.content?.blocks?.find((b) => b.type === "text")?.content ||
    "";
  const legacy = breakVideoOf(block || { videoSlug: slug }, "", text);
  return legacy.src ? legacy : null;
}
