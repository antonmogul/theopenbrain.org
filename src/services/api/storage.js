/**
 * Image uploads to the `chapter-media` Storage bucket (OPENBRAIN-63).
 *
 * The bucket is public to read and creator-only to write
 * (supabase/migrations/20260924000000_chapter_media_bucket.sql). An upload
 * stores the file under modules/<chapter slug>/<uuid>.<ext>, then adds an
 * `image` row to the media library (public.animations) so it can be reused
 * and shows "used in". Returns that media row.
 *
 * Lottie animations (OPENBRAIN-70 B4) upload the same way as JSON files; the
 * bucket accepts application/json once its migration is applied.
 */
import { authedRequest, getSession } from "./client";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const BUCKET = "chapter-media";
export const MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Why this file can't be uploaded, or null. Shown to the author as-is. */
export function uploadProblem(file) {
  if (!file) return "Choose an image first.";
  if (!IMAGE_TYPES[file.type])
    return "Use a JPG, PNG, WebP or GIF image. SVG and other files aren't accepted.";
  if (file.size > MAX_BYTES)
    return `That image is ${(file.size / 1048576).toFixed(1)} MB; the limit is 10 MB.`;
  return null;
}

export function publicUrl(path) {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

/** Why this file isn't an uploadable Lottie animation, or null (async). */
export async function lottieProblem(file) {
  if (!file) return "Choose a Lottie file first.";
  if (!/\.json$/i.test(file.name) && file.type !== "application/json")
    return "Use a Lottie animation exported as .json.";
  if (file.size > MAX_BYTES)
    return `That file is ${(file.size / 1048576).toFixed(1)} MB; the limit is 10 MB.`;
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return "That file isn't valid JSON.";
  }
  if (!data || typeof data.fr !== "number" || !Array.isArray(data.layers))
    return "That JSON isn't a Lottie animation (it needs a frame rate and layers).";
  return null;
}

async function putObject(path, file, contentType) {
  const token = getSession()?.access_token;
  if (!token)
    throw new Error("Your session has expired. Sign in again to upload.");
  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
        "x-upsert": "false",
        "cache-control": "31536000",
      },
      body: file,
    }
  );
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.message || "";
    } catch {
      /* not JSON */
    }
    if (res.status === 403 || /row-level security/i.test(detail))
      throw new Error("Only creators can upload files.");
    if (/mime type|not supported/i.test(detail))
      throw new Error(
        "The media library doesn't accept this file type yet (it needs the OPENBRAIN-70 update)."
      );
    throw new Error(
      `The upload failed (${res.status}${detail ? `: ${detail}` : ""}).`
    );
  }
}

/**
 * Upload a Lottie animation for chapter `slug` and add it to the media
 * library. It has no states, so it plays on repeat (config.autoLoop).
 */
export async function uploadChapterLottie(file, { slug, title }) {
  const problem = await lottieProblem(file);
  if (problem) throw new Error(problem);
  const id = uuid();
  const path = `modules/${slug || "unfiled"}/${id}.json`;
  await putObject(path, file, "application/json");
  const name =
    (title || file.name.replace(/\.[^.]+$/, "")).trim() || "Animation";
  const rows = await authedRequest("animations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      animation_key: `animationUpload${id.replace(/-/g, "")}`,
      title: name,
      media_type: "lottie",
      lottie_file_url: publicUrl(path),
      interaction_type: "auto_loop",
      config: { autoplay: true, autoLoop: true },
      file_size_bytes: file.size,
    }),
  });
  if (!rows?.length)
    throw new Error(
      "The animation uploaded but couldn't be added to the library."
    );
  return rows[0];
}

const uuid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Upload `file` for chapter `slug` and register it in the media library.
 * @param {File} file
 * @param {{ slug: string, title?: string }} opts
 */
export async function uploadChapterImage(file, { slug, title }) {
  const problem = uploadProblem(file);
  if (problem) throw new Error(problem);
  const token = getSession()?.access_token;
  if (!token)
    throw new Error("Your session has expired. Sign in again to upload.");

  const id = uuid();
  const path = `modules/${slug || "unfiled"}/${id}.${IMAGE_TYPES[file.type]}`;
  const res = await fetch(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
        "x-upsert": "false",
        "cache-control": "31536000",
      },
      body: file,
    }
  );
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.message || "";
    } catch {
      /* not JSON */
    }
    if (res.status === 403 || /row-level security/i.test(detail))
      throw new Error("Only creators can upload images.");
    throw new Error(
      `The upload failed (${res.status}${detail ? `: ${detail}` : ""}).`
    );
  }

  const name = (title || file.name.replace(/\.[^.]+$/, "")).trim() || "Image";
  const rows = await authedRequest("animations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      animation_key: `image-${id}`,
      title: name,
      media_type: "image",
      image_file_url: publicUrl(path),
      file_size_bytes: file.size,
    }),
  });
  if (!rows?.length)
    throw new Error("The image uploaded but couldn't be added to the library.");
  return rows[0];
}
