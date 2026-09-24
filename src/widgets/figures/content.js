/*
 * Figure widget content (OPENBRAIN-80).
 *
 * A figure widget's editable content lives in `animations.config.content`,
 * which creators can write (animation_states is read-only to everyone). For
 * each schema field the first of these that is set wins:
 *
 *   1. config.content[key]  what the chapter page saved
 *   2. the record's own value  title, the legacy config flags, state rows
 *   3. schema.defaults[key]  the original's content (theopenbrain.org)
 *
 * `record` is flat: the reader's resolved animation (useAnimations spreads
 * config onto it and adds `states` from animation_states), or, on the chapter
 * page, { title, ...row.config, states } built from the media row.
 */

const isSet = (v) =>
  v !== undefined &&
  v !== null &&
  !(typeof v === "string" && v.trim() === "") &&
  !(Array.isArray(v) && v.length === 0);

function pick(field, saved, record, fallback) {
  if (field.type === "group") {
    const out = {};
    for (const sub of field.fields) {
      out[sub.key] = pick(
        sub,
        saved?.[sub.key],
        record?.[sub.key],
        fallback?.[sub.key]
      );
    }
    return out;
  }
  if (field.type === "list") {
    // Per item, so one saved label doesn't blank the others; the length is
    // the schema's (a figure's frame segments fix it).
    const n = (fallback || []).length;
    return Array.from({ length: n }, (_, i) =>
      [saved?.[i], record?.[i], fallback[i]].find(isSet)
    );
  }
  return [saved, record, fallback].find(isSet) ?? fallback ?? "";
}

/** The widget's content for `record`, field by field. */
export function figureContent(schema, record = {}) {
  const saved = record?.content || {};
  const out = {};
  for (const field of schema.fields) {
    out[field.key] = pick(
      field,
      saved[field.key],
      record?.[field.key],
      schema.defaults[field.key]
    );
  }
  return out;
}

/**
 * Prepare a Lottie file loaded as data: image assets resolve against the
 * file's own folder (lottie-web only does that for `path` loads), and an
 * image the chapter page replaced points at its new URL. Returns a copy.
 *
 * @param {object} data parsed Lottie JSON
 * @param {string} lottieUrl where it was fetched from
 * @param {Record<string,string>} replace asset file name → new image URL
 */
export function prepareLottie(data, lottieUrl, replace = {}) {
  const copy = structuredClone(data);
  const base = lottieUrl.slice(0, lottieUrl.lastIndexOf("/") + 1);
  for (const asset of copy.assets || []) {
    if (typeof asset.p !== "string" || asset.p.startsWith("data:")) continue;
    const url = replace[asset.p];
    if (url) {
      // e: 1 makes lottie-web use `p` as the image src as it stands.
      asset.u = "";
      asset.p = url;
      asset.e = 1;
    } else if (!/^(https?:)?\/\//.test(asset.u || "") && !asset.e) {
      asset.u = base + (asset.u || "");
    }
  }
  return copy;
}
