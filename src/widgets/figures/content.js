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
 * Lists merge item by item, and the chapter page saves only the items it
 * changed (null elsewhere), so the rest keep following the record. An
 * optional field saved as `false` is switched off: it resolves to null.
 * Values of the wrong type are ignored, so bad data can't break a figure.
 * A field marked `artwork: true` belongs to the figure's drawing (a legend,
 * the labels of its versions), so the record's value is skipped: the
 * database rows describe older artwork.
 *
 * `record` is flat: the reader's resolved animation (useAnimations spreads
 * config onto it and adds `states` from animation_states), or, on the chapter
 * page, { title, ...row.config, states } built from the media row.
 */

const isText = (v) => typeof v === "string" && v.trim() !== "";

function pick(field, saved, record, fallback) {
  if (field.optional && saved === false) return null;
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
    // Per item; the length is the schema's (a figure's frame segments fix it).
    const list = (v) => (Array.isArray(v) ? v : []);
    return (fallback || []).map(
      (d, i) => [list(saved)[i], list(record)[i], d].find(isText) ?? ""
    );
  }
  return [saved, record, fallback].find(isText) ?? "";
}

/** The widget's content for `record`, field by field. */
export function figureContent(schema, record = {}) {
  const saved =
    record?.content && typeof record.content === "object" ? record.content : {};
  const out = {};
  for (const field of schema.fields) {
    out[field.key] = pick(
      field,
      saved[field.key],
      field.artwork ? undefined : record?.[field.key],
      schema.defaults[field.key]
    );
  }
  return out;
}

/**
 * What the chapter page saves: for each field, only what differs from
 * `inherited` (the content with nothing saved). Lists keep their changed
 * items and null the rest; a list or group with no changes is left out. An
 * optional field switched off is saved as `false`.
 *
 * @param {object} schema
 * @param {object} form the edited content, figureContent's shape
 * @param {object} inherited figureContent(schema, { ...record, content: {} })
 * @param {Record<string, boolean>} [off] optional fields switched off
 */
export function contentChanges(schema, form, inherited, off = {}) {
  const same = (a, b) => (a ?? "").trim() === (b ?? "").trim();
  const out = {};
  for (const f of schema.fields) {
    if (f.key === "title") continue;
    if (f.optional && off[f.key]) {
      out[f.key] = false;
      continue;
    }
    const v = form[f.key];
    const was = inherited[f.key];
    if (f.type === "list") {
      const items = v.map((x, i) => (same(x, was[i]) ? null : x));
      while (items.length && items.at(-1) === null) items.pop();
      if (items.length) out[f.key] = items;
    } else if (f.type === "group") {
      const sub = {};
      for (const s of f.fields)
        if (!same(v[s.key], was?.[s.key])) sub[s.key] = v[s.key];
      if (Object.keys(sub).length) out[f.key] = sub;
    } else if (!same(v, was)) {
      out[f.key] = v;
    }
  }
  return out;
}

/**
 * A figure's Lottie URL with its artwork version, so a reader whose browser
 * cached an older file under the same name gets the one this widget's
 * timeline was written for (publicAssets are cached for a day).
 */
export function versionedUrl(url, version) {
  if (!version) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(version)}`;
}

/**
 * Fetch a Lottie file. Production serves the app's index.html with a 200 for
 * a missing file, so a non-JSON answer is treated as "not found" too.
 */
export async function fetchLottie(url) {
  const res = await fetch(url);
  const type = res.headers?.get?.("content-type") || "";
  if (!res.ok || (type && !type.includes("json")))
    throw new Error(
      `${url}: ${res.ok ? `not a Lottie file (${type})` : `HTTP ${res.status}`}`
    );
  return res.json();
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
  const copy = JSON.parse(JSON.stringify(data));
  const path = lottieUrl.split("?")[0];
  const base = path.slice(0, path.lastIndexOf("/") + 1);
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
