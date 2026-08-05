/*
 * Animation source resolution — DB-first with JSON fallback (OPENBRAIN-10).
 *
 * DECISION on animations.json's fate: it STAYS, as the Chapter-1 / offline
 * fallback. Chapter 1 is still the hardcoded legacy chapter (see CLAUDE.md) and
 * the Supabase animation_states/animation_variants seeding is what the
 * chapter1-parity work exists to verify — until every one of the 32 figures is
 * confirmed complete in the DB, retiring the JSON would swap a working source
 * for an unproven one. Revisit when Chapter 1 itself moves to Supabase.
 *
 * Resolution is per-RECORD, not per-source: a figure missing from the DB still
 * resolves from the JSON even when other DB rows exist. The expensive failure
 * mode here is silence — an unresolvable figure renders nothing — so a miss
 * warns loudly by default (call sites may defer the warning until their async
 * source has settled; see IllustrationInline). See docs/chapter1-parity/ for
 * the debugging session that silent-empty cost.
 */

/**
 * Find a full animation record by key ("animationEyeStructur"), preferring the
 * Supabase-shaped list, falling back to the animations.json list. Returns null
 * (and warns) when neither source has it.
 */
export function resolveAnimationRecord(
  id,
  dbList,
  jsonList,
  warn = console.warn
) {
  if (!id) return null;
  const db = Array.isArray(dbList)
    ? dbList.find((a) => a.id === id)
    : undefined;
  if (db) return db;
  const json = Array.isArray(jsonList)
    ? jsonList.find((a) => a.id === id)
    : undefined;
  if (json) return json;
  warn(
    `[animations] "${id}" not found in Supabase or animations.json — the figure will not render`
  );
  return null;
}

/**
 * Does this animation object already carry its display config? DB-backed
 * chapters pass fully-shaped objects (useAnimations spreads the config JSONB);
 * Chapter 1's legacy path passes bare {name,id,title,transition} stubs that
 * need the JSON lookup. This is IllustrationComp's original heuristic,
 * extracted so every consumer applies the same test.
 */
export function isConfigBearing(animation) {
  return (
    !!animation &&
    (animation.clickTriggered !== undefined ||
      animation.loop !== undefined ||
      animation.illuImage !== undefined ||
      animation.flip !== undefined ||
      animation.switch !== undefined)
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
export async function lottieAssetOk(id, fetchImpl = fetch) {
  if (!id) return false;
  try {
    const res = await fetchImpl(`/publicAssets/animations/${id}.json`, {
      method: "HEAD",
    });
    return res.ok && (res.headers.get("content-type") || "").includes("json");
  } catch {
    return false;
  }
}

/**
 * Resolve the config object for a figure passed as a prop: the prop itself
 * when it is config-bearing (DB path), else the JSON record (legacy path),
 * else the bare prop — with a warning, since a config-less figure renders but
 * loses its interactive behaviour.
 */
export function resolveAnimationConfig(
  propAnimation,
  jsonList,
  warn = console.warn
) {
  if (isConfigBearing(propAnimation)) return propAnimation;
  const json = Array.isArray(jsonList)
    ? jsonList.find((x) => x.id === propAnimation?.id)
    : undefined;
  if (json) return json;
  if (propAnimation?.id) {
    warn(
      `[animations] "${propAnimation.id}" has no config in Supabase or animations.json — rendering with the bare prop`
    );
  }
  return propAnimation ?? null;
}
