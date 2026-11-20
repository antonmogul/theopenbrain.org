/* Database figure resolution. A missing record must be visible in diagnostics. */
export function resolveAnimationRecord(id, dbList, warn = console.warn) {
  if (!id) return null;
  const record = Array.isArray(dbList) ? dbList.find((a) => a.id === id) : null;
  if (record) return record;
  warn(
    `[animations] "${id}" not found in Supabase — the figure will not render`
  );
  return null;
}

/** Whether a resolved record carries display or interaction configuration. */
export function isConfigBearing(animation) {
  return (
    !!animation &&
    Object.keys(animation).some(
      (key) => !["id", "name", "title", "transition"].includes(key)
    )
  );
}

/**
 * Does the figure's Lottie asset actually exist? A resolved DB record is no
 * guarantee: production serves the SPA with `serve -s`, which rewrites a
 * MISSING /publicAssets/animations/<id>.json to index.html with HTTP 200 +
 * text/html — lottie-web then throws an uncaught responseText error and the
 * figure renders an empty stage. Checking status AND content-type catches
 * both the honest-404 (vite preview) and the SPA-rewrite (production) cases.
 */
/**
 * Where a figure's Lottie file lives: its own URL when it was uploaded in the
 * CMS (animations.lottie_file_url → animation.lottieUrl, OPENBRAIN-70 B4),
 * else the file named after its key in public/publicAssets/animations.
 */
export function lottiePath(animation) {
  // The row's own URL wins. For bundled figures it equals the key's path,
  // except animationRetinalCellTypes3, whose key has no file of its own and
  // whose row points at animationRetinalCellTypes.json.
  // This authored asset contains one AE expression. Its reviewed derivative
  // bakes the same trim-path values without requiring unsafe-eval; custom
  // author URLs retain precedence and the historical source stays untouched.
  if (
    animation?.id === "animationEyeMovements" &&
    (!animation.lottieUrl ||
      animation.lottieUrl ===
        "/publicAssets/animations/animationEyeMovements.json")
  )
    return "/publicAssets/animations/derived/animationEyeMovements.json";
  if (animation?.lottieUrl) return animation.lottieUrl;
  if (animation?.id === "animationRetinalCellTypes3")
    return "/publicAssets/animations/animationRetinalCellTypes.json";
  return animation?.id ? `/publicAssets/animations/${animation.id}.json` : "";
}

/**
 * The same check for a raster (the History opener's still,
 * OPENBRAIN-171): a HEAD that comes back ok with an image type. A missing
 * file under `serve` is index.html with a 200, which only the type reveals,
 * and probing first keeps the <img> 404 the browser would log off the
 * console.
 */
export async function imageAssetOk(url, fetchImpl = fetch) {
  if (!url) return false;
  try {
    const res = await fetchImpl(url, { method: "HEAD" });
    return (
      res.ok && (res.headers.get("content-type") || "").startsWith("image/")
    );
  } catch {
    return false;
  }
}

/**
 * `target` is a figure id (key) or a full path/URL from lottiePath().
 */
export async function lottieAssetOk(target, fetchImpl = fetch) {
  if (!target) return false;
  const url = /^(\/|https?:)/.test(target)
    ? target
    : `/publicAssets/animations/${target}.json`;
  try {
    const res = await fetchImpl(url, { method: "HEAD" });
    return res.ok && (res.headers.get("content-type") || "").includes("json");
  } catch {
    return false;
  }
}

/** Renderers receive a resolved database record, never a placement stub. */
export function resolveAnimationConfig(propAnimation, warn = console.warn) {
  if (propAnimation?.id && !isConfigBearing(propAnimation))
    warn(
      `[animations] "${propAnimation.id}" has no display config in Supabase — rendering with the bare prop`
    );
  return propAnimation ?? null;
}
