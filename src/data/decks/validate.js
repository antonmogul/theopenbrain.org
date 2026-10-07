/**
 * Deck entries against the layout schemas in fields.js (OPENBRAIN-129).
 *
 * An entry is { id, label, notes?, layout, props, hidden?, source? }, the
 * shape src/data/decks/*.js uses and public.decks.slides stores.
 *
 * normalizeSlide() makes any stored entry safe to render: only declared
 * props, coerced to their types (it never fills scalar defaults; the
 * components do). For every bundled entry it is the identity.
 * validateSlide() / validateDeck() return problems,
 *   { slideId, path, level: 'error'|'warn', code, message },
 * with `path` relative to the entry ("props.people.2.name", "label").
 * Errors block Publish; warnings don't. Deck-level problems have slideId
 * null. The database checks only the array, 100 slides and 1 MB, so adding a
 * layout never needs a migration.
 */
import { ICON_NAMES, LAYOUT_SCHEMAS, ROLE_OPTIONS } from "./fields.js";
import { summaryFromCounts } from "./text.js";

export { summaryFromCounts };

export const SCHEMA_VERSION = 1;
export const MAX_SLIDES = 100;
export const MAX_BYTES = 1048576;
export const SLIDE_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const LABEL_MAX = 40;
const TEMPLATE_PREFIX = /^T\d+ · /;
const EYEBROW_NUMBER = /^(\d{2}) · /;

const OMIT = Symbol("omit");
const TEXT_TYPES = new Set(["text", "longtext"]);
const STRING_TYPES = new Set([
  "text",
  "longtext",
  "enum",
  "icon",
  "roleColor",
  "imageSrc",
  "mediaUrl",
]);
const IMAGE_KEYS = ["src", "alt", "placeholder", "figure"];

const isObject = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

/** A JSON-safe deep copy that also reads through Vue proxies. */
export function deepClone(value) {
  if (Array.isArray(value)) return value.map(deepClone);
  if (isObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value))
      if (v !== undefined && typeof v !== "function") out[k] = deepClone(v);
    return out;
  }
  return value;
}

// ── normalisation ──────────────────────────────────────────────────────────
function str(v) {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint")
    return String(v);
  return OMIT;
}

// A whole number inside the descriptor's range: a slide draws what it is
// given (one bar per chapter), so an out-of-range count must never reach it.
function int(v, d = {}) {
  if (v === undefined || v === null) return OMIT;
  let n = Number.isInteger(v) ? v : Number.parseInt(v, 10);
  if (!Number.isFinite(n)) n = 0;
  if (d.min !== undefined) n = Math.max(n, d.min);
  if (d.max !== undefined) n = Math.min(n, d.max);
  return n;
}

function normalizeImage(v) {
  if (!isObject(v)) return OMIT;
  const out = {};
  for (const k of IMAGE_KEYS) {
    const s = str(v[k]);
    if (s !== OMIT) out[k] = s;
  }
  return out;
}

function normalizeField(d, v) {
  if (STRING_TYPES.has(d.type)) return str(v);
  switch (d.type) {
    case "position": {
      const s = str(v);
      return s === "" ? OMIT : s;
    }
    case "bool":
      return typeof v === "boolean" ? v : OMIT;
    case "int":
      return int(v, d);
    case "image":
      return normalizeImage(v);
    case "strings":
      if (v === undefined || v === null) return d.required ? [] : OMIT;
      if (!Array.isArray(v)) return [];
      return v.map(str).filter((s) => s !== OMIT);
    case "list":
      if (v === undefined || v === null) return d.required ? [] : OMIT;
      if (!Array.isArray(v)) return [];
      return v.map((item) => normalizeFields(d.of, isObject(item) ? item : {}));
    case "group":
      if (!isObject(v)) return d.required ? {} : OMIT;
      return normalizeFields(d.fields, v);
    case "optional":
      if (!isObject(v)) {
        if (d.off === "omit" || v === undefined) return OMIT;
        return null;
      }
      return withDefaults(normalizeFields(d.fields, v), d.defaults);
    default:
      return OMIT;
  }
}

// An optional group switched on keeps every key it has defaults for: a
// partial legend would leave the trajectory slide's other labels empty.
function withDefaults(obj, defaults) {
  for (const [k, v] of Object.entries(defaults || {}))
    if (!(k in obj)) obj[k] = v;
  return obj;
}

function normalizeFields(fields, obj) {
  const out = {};
  for (const [key, d] of Object.entries(fields)) {
    const n = normalizeField(d, obj?.[key]);
    if (n !== OMIT) out[key] = n;
    if (d.type === "imageSrc")
      for (const sibling of [d.altKey, d.placeholderKey]) {
        if (!sibling) continue;
        const s = str(obj?.[sibling]);
        if (s !== OMIT) out[sibling] = s;
      }
  }
  return out;
}

/**
 * The entry with only what its layout declares, each value its field's
 * type. Pure and idempotent; an unknown layout comes back as a copy.
 */
export function normalizeSlide(entry) {
  if (!isObject(entry)) return entry;
  const schema = LAYOUT_SCHEMAS[entry.layout];
  if (!schema || !Object.hasOwn(LAYOUT_SCHEMAS, entry.layout))
    return deepClone(entry);
  const out = {};
  for (const key of ["id", "label", "notes"]) {
    const s = str(entry[key]);
    if (s !== OMIT) out[key] = s;
  }
  out.layout = entry.layout;
  out.props = normalizeFields(
    schema.fields,
    isObject(entry.props) ? entry.props : {}
  );
  if (typeof entry.hidden === "boolean") out.hidden = entry.hidden;
  if (isObject(entry.source)) out.source = deepClone(entry.source);
  return out;
}

// ── URLs ────────────────────────────────────────────────────────────────────
/**
 * Would the site's Content-Security-Policy (index.html) load this as an
 * image ('img') or a video ('media')? Empty, a same-site path, Supabase
 * Storage, and for images YouTube's thumbnail host.
 */
export function cspAllowed(url, kind = "img") {
  if (url === undefined || url === null || url === "") return true;
  const s = String(url).trim();
  if (s.startsWith("/") && !s.startsWith("//")) return true;
  let u;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.hostname.endsWith(".supabase.co")) return true;
  return kind === "img" && u.hostname === "i.ytimg.com";
}

/**
 * Will a page load `url` under the site's CSP? cspAllowed() (what a deck
 * should store), plus what the policy also lets through: data: and blob:
 * images, blob: media, and absolute addresses on the page's own `origin`.
 * The slide components check it before they request anything, because a
 * refused request is logged as a console error and only then fails.
 */
export function cspLoads(url, kind = "img", origin = "") {
  const s = String(url ?? "").trim();
  if (cspAllowed(s, kind)) return true;
  if (/^blob:/i.test(s) || (kind === "img" && /^data:/i.test(s))) return true;
  return Boolean(origin) && origin !== "null" && s.startsWith(`${origin}/`);
}

const urlShaped = (s) => s.startsWith("/") || /^https?:\/\//i.test(s);

// ── validation ─────────────────────────────────────────────────────────────
const chars = (s) => [...s].length;
const filled = (v) =>
  typeof v === "string"
    ? v.trim() !== ""
    : Array.isArray(v)
      ? v.length > 0
      : isObject(v)
        ? Object.values(v).some(filled)
        : v !== undefined && v !== null && v !== false;
const optionValues = (d) => (d.options || []).map((o) => o.value ?? o);
const asText = (v) =>
  typeof v === "string" ? v : str(v) === OMIT ? "" : str(v);
const showing = (d, obj) => {
  if (typeof d.showWhen !== "function") return true;
  try {
    return Boolean(d.showWhen(obj ?? {}));
  } catch {
    return true;
  }
};

function checkSource(src, kind, path, name, push) {
  if (!src) return;
  if (!urlShaped(src))
    push(
      "error",
      "E_URL",
      path,
      `${name}: use a path starting with / or an https:// address.`
    );
  else if (!cspAllowed(src, kind))
    push(
      "warn",
      "W_CSP",
      path,
      `${name}: the site blocks ${kind === "media" ? "videos" : "images"} from this address. Upload the file or use a /publicAssets/ path.`
    );
}

function checkText(v, d, path, name, push) {
  const s = asText(v);
  if (d.required && !s.trim())
    push("error", "E_REQUIRED", path, `${name} is required.`);
  if (d.maxChars && chars(s) > d.maxChars)
    push(
      "warn",
      "W_LENGTH",
      path,
      `${name}: ${chars(s)} characters; it is designed for ${d.maxChars}.`
    );
  if (/[\r\n]/.test(s))
    push(
      "warn",
      "W_NEWLINE",
      path,
      `${name}: line breaks aren’t shown on the slide.`
    );
}

function checkFields(fields, obj, base, prefix, push) {
  for (const [key, d] of Object.entries(fields)) {
    const path = `${base}.${key}`;
    const name = prefix ? `${prefix} · ${d.label}` : d.label;
    const v = obj?.[key];
    if (!showing(d, obj) && filled(v))
      push(
        "warn",
        "W_HIDDEN_FIELD",
        path,
        `${name} isn’t shown with the current settings.`
      );

    switch (d.type) {
      case "text":
      case "longtext":
        checkText(v, d, path, name, push);
        break;
      case "enum":
      case "icon":
      case "roleColor":
        if (v === undefined || v === null || v === "") {
          if (d.required)
            push("error", "E_REQUIRED", path, `${name} is required.`);
        } else if (!optionValues(d).includes(v))
          push(
            "error",
            "E_ENUM",
            path,
            `${name}: “${v}” isn’t one of the options.`
          );
        break;
      case "int": {
        const lo = d.min ?? 0;
        const hi = d.max ?? Infinity;
        if (
          (d.required || v !== undefined) &&
          !(Number.isInteger(v) && v >= lo && v <= hi)
        )
          push(
            "error",
            "E_INT",
            path,
            hi === Infinity
              ? `${name} must be a whole number, ${lo} or more.`
              : `${name} must be a whole number from ${lo} to ${hi}.`
          );
        break;
      }
      case "image": {
        const img = isObject(v) ? v : {};
        const src = asText(img.src).trim();
        checkSource(src, "img", `${path}.src`, name, push);
        if (src && !asText(img.alt).trim())
          push(
            "warn",
            "W_ALT",
            `${path}.alt`,
            `${name}: add alt text that describes the image.`
          );
        if (!src && d.warnEmpty !== false)
          push(
            "warn",
            "W_PLACEHOLDER",
            `${path}.src`,
            `${name}: no image yet, so the placeholder shows.`
          );
        break;
      }
      case "imageSrc": {
        const src = asText(v).trim();
        checkSource(src, "img", path, name, push);
        if (d.altKey && src && !asText(obj?.[d.altKey]).trim())
          push(
            "warn",
            "W_ALT",
            `${base}.${d.altKey}`,
            `${name}: add alt text that describes the image.`
          );
        if (!src && d.warnEmpty !== false)
          push(
            "warn",
            "W_PLACEHOLDER",
            path,
            `${name}: no image yet, so the placeholder shows.`
          );
        break;
      }
      case "mediaUrl": {
        const src = asText(v).trim();
        checkSource(src, "media", path, name, push);
        if (!src && d.warnEmpty !== false)
          push(
            "warn",
            "W_PLACEHOLDER",
            path,
            `${name}: no video yet, so the placeholder shows.`
          );
        break;
      }
      case "strings": {
        if (v === undefined || v === null) break;
        const items = Array.isArray(v) ? v : [];
        checkCount(items, d, path, name, push);
        const seen = new Set();
        items.forEach((item, i) => {
          const itemPath = `${path}.${i}`;
          checkText(
            item,
            { maxChars: d.maxChars },
            itemPath,
            `${name} ${i + 1}`,
            push
          );
          const s = asText(item).trim();
          if (d.unique && s) {
            if (seen.has(s))
              push(
                "error",
                "E_DUPLICATE",
                itemPath,
                `${name}: “${s}” is listed twice.`
              );
            seen.add(s);
          }
        });
        break;
      }
      case "list": {
        if (v === undefined || v === null) {
          if (d.required)
            push("error", "E_REQUIRED", path, `${name} is required.`);
          break;
        }
        const items = Array.isArray(v) ? v : [];
        checkCount(items, d, path, name, push);
        const seen = new Set();
        items.forEach((item, i) => {
          const itemPath = `${path}.${i}`;
          const itemName = `${name} ${i + 1}`;
          checkFields(
            d.of,
            isObject(item) ? item : {},
            itemPath,
            itemName,
            push
          );
          if (d.uniqueBy) {
            const key = asText(item?.[d.uniqueBy]).trim();
            if (key && seen.has(key))
              push(
                "error",
                "E_DUPLICATE",
                `${itemPath}.${d.uniqueBy}`,
                `${name}: “${key}” is used twice; each needs its own ${d.of[d.uniqueBy].label.toLowerCase()}.`
              );
            if (key) seen.add(key);
          }
        });
        break;
      }
      case "group":
        if (isObject(v)) checkFields(d.fields, v, path, name, push);
        else if (d.required)
          push("error", "E_REQUIRED", path, `${name} is required.`);
        break;
      case "optional":
        if (isObject(v)) checkFields(d.fields, v, path, name, push);
        break;
      default:
        break;
    }
  }
}

function checkCount(items, d, path, name, push) {
  const n = items.length;
  const min = d.min ?? 0;
  const max = d.max ?? Infinity;
  if (n < min || n > max)
    push(
      "error",
      "E_COUNT",
      path,
      max === Infinity
        ? `${name}: at least ${min}.`
        : `${name}: ${n} ${n === 1 ? "item" : "items"}; this layout takes ${min === max ? max : `${min} to ${max}`}.`
    );
  else if (d.designCount !== undefined && n !== d.designCount)
    push(
      "warn",
      "W_DESIGN_COUNT",
      path,
      `${name}: designed for ${d.designCount}; this has ${n}.`
    );
}

/**
 * Problems in one entry. `visiblePosition` is its 1-based place among the
 * slides that are shown (null when hidden), for the eyebrow numbers; it
 * defaults to `position` for a shown slide. `total` is accepted for callers
 * that pass the deck size; nothing needs it yet.
 */
export function validateSlide(
  entry,
  { position = null, visiblePosition } = {}
) {
  const out = [];
  const slideId =
    isObject(entry) && typeof entry.id === "string" ? entry.id : null;
  const push = (level, code, path, message) =>
    out.push({ slideId, path, level, code, message });
  if (!isObject(entry)) {
    push("error", "E_LAYOUT", "", "This slide is empty.");
    return out;
  }

  if (typeof entry.id !== "string" || !entry.id)
    push("error", "E_ID", "id", "The slide has no id.");
  else if (!SLIDE_ID_RE.test(entry.id))
    push(
      "error",
      "E_ID",
      "id",
      "Slide ids use lowercase letters, digits and dashes (at most 64)."
    );
  const label = asText(entry.label);
  if (!label.trim()) push("error", "E_REQUIRED", "label", "Label is required.");
  else if (chars(label) > LABEL_MAX)
    push(
      "warn",
      "W_LENGTH",
      "label",
      `Label: ${chars(label)} characters; keep it under ${LABEL_MAX}.`
    );

  const schema = Object.hasOwn(LAYOUT_SCHEMAS, entry.layout)
    ? LAYOUT_SCHEMAS[entry.layout]
    : null;
  if (!schema) {
    push("error", "E_LAYOUT", "layout", `Unknown layout “${entry.layout}”.`);
    return out;
  }
  const props = isObject(entry.props) ? entry.props : {};
  checkFields(schema.fields, props, "props", "", push);

  const shownAt =
    visiblePosition !== undefined
      ? visiblePosition
      : entry.hidden === true
        ? null
        : position;
  const eyebrow = props.eyebrow;
  const match = typeof eyebrow === "string" && EYEBROW_NUMBER.exec(eyebrow);
  if (match && shownAt && showing(schema.fields.eyebrow, props)) {
    if (Number(match[1]) !== shownAt)
      push(
        "warn",
        "W_EYEBROW",
        "props.eyebrow",
        `The eyebrow says ${match[1]} but this is slide ${shownAt}. Renumber eyebrows to fix every slide.`
      );
  }

  for (const rule of schema.rules || [])
    for (const p of rule(props) || [])
      push(
        p.code.startsWith("E_") ? "error" : "warn",
        p.code,
        `props.${p.path}`,
        p.message
      );
  return out;
}

/** UTF-8 bytes of the slides as Postgres prints jsonb (", " and ": "). */
export function deckByteLength(value) {
  const encoder = new TextEncoder();
  const walk = (v) => {
    if (Array.isArray(v))
      return 2 + v.reduce((n, x, i) => n + walk(x) + (i ? 2 : 0), 0);
    if (isObject(v)) {
      const entries = Object.entries(v).filter(([, x]) => x !== undefined);
      return (
        2 +
        entries.reduce(
          (n, [k, x], i) =>
            n +
            encoder.encode(JSON.stringify(k)).length +
            2 +
            walk(x) +
            (i ? 2 : 0),
          0
        )
      );
    }
    return encoder.encode(JSON.stringify(v ?? null)).length;
  };
  return walk(value);
}

/** Every problem in a deck: each slide's, duplicate ids, size and emptiness. */
export function validateDeck(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const out = [];
  const seen = new Set();
  let visible = 0;
  list.forEach((entry, i) => {
    const hidden = isObject(entry) && entry.hidden === true;
    if (!hidden && isObject(entry)) visible += 1;
    out.push(
      ...validateSlide(entry, {
        position: i + 1,
        visiblePosition: hidden ? null : visible,
        total: list.length,
      })
    );
    const id = isObject(entry) ? entry.id : null;
    if (typeof id === "string" && id) {
      if (seen.has(id))
        out.push({
          slideId: id,
          path: "id",
          level: "error",
          code: "E_ID",
          message: `Slide ${i + 1} has the same id (“${id}”) as an earlier slide.`,
        });
      seen.add(id);
    }
  });

  const deck = (code, message) =>
    out.push({ slideId: null, path: "", level: "error", code, message });
  if (list.length > MAX_SLIDES)
    deck(
      "E_DECK_SIZE",
      `The deck has ${list.length} slides; the limit is ${MAX_SLIDES}.`
    );
  else {
    const bytes = deckByteLength(list);
    if (bytes > MAX_BYTES)
      deck(
        "E_DECK_SIZE",
        `The deck is ${(bytes / MAX_BYTES).toFixed(1)} MB; the limit is 1 MB.`
      );
  }
  if (visible === 0) deck("E_EMPTY_DECK", "The deck has no slides to show.");
  return out;
}

// ── new slides ──────────────────────────────────────────────────────────────
function defaultFields(fields) {
  const out = {};
  for (const [key, d] of Object.entries(fields)) {
    switch (d.type) {
      case "text":
      case "longtext":
        if (d.required) out[key] = d.label;
        break;
      case "enum":
        if (d.default !== undefined || d.required)
          out[key] = d.default ?? optionValues(d)[0];
        break;
      case "icon":
        if (d.required) out[key] = "book";
        break;
      case "roleColor":
        if (d.required) out[key] = "creator";
        break;
      case "int":
        out[key] = 0;
        break;
      case "image":
        out[key] = { src: "", alt: "" };
        break;
      case "strings":
        if (d.required) out[key] = [];
        break;
      case "list":
        if (d.required) {
          const n = d.designCount ?? d.min ?? 0;
          out[key] = Array.from({ length: n }, (_, i) => defaultItem(d, i, n));
        }
        break;
      case "group":
        if (d.required) out[key] = defaultFields(d.fields);
        break;
      default:
        break;
    }
  }
  return out;
}

// List items whose key must not repeat get distinct values.
function defaultItem(d, i, n) {
  const item = defaultFields(d.of);
  const key = d.uniqueBy;
  if (!key || n < 2) return item;
  const k = d.of[key];
  if (TEXT_TYPES.has(k.type)) item[key] = `${k.label} ${i + 1}`;
  else if (k.type === "roleColor")
    item[key] = ROLE_OPTIONS[i % ROLE_OPTIONS.length].value;
  else if (k.type === "icon") item[key] = ICON_NAMES[i % ICON_NAMES.length];
  else if (k.type === "enum")
    item[key] = optionValues(k)[i % optionValues(k).length];
  return item;
}

/** Minimal props that validate with no errors: required text is its label. */
export function defaultsFor(layout) {
  const schema = Object.hasOwn(LAYOUT_SCHEMAS, layout)
    ? LAYOUT_SCHEMAS[layout]
    : null;
  return schema ? defaultFields(schema.fields) : {};
}

function randomHex() {
  const c = globalThis.crypto;
  if (c?.getRandomValues)
    return c
      .getRandomValues(new Uint32Array(1))[0]
      .toString(16)
      .padStart(8, "0");
  return Math.floor(Math.random() * 0x100000000)
    .toString(16)
    .padStart(8, "0");
}

/** "s-" + 8 hex digits, not in `existingIds`. */
export function newSlideId(existingIds = []) {
  const taken = new Set(existingIds);
  let id;
  do id = `s-${randomHex()}`;
  while (taken.has(id));
  return id;
}

/** A deep copy with a fresh id; a template's "T7 · " label prefix goes. */
export function cloneEntry(entry, existingIds = []) {
  const copy = deepClone(entry);
  copy.id = newSlideId(existingIds);
  if (typeof copy.label === "string")
    copy.label = copy.label.replace(TEMPLATE_PREFIX, "");
  return copy;
}

// Can a value from field `from` (null: unknown layout) fill field `to`?
function compatible(from, to, value) {
  const same = from?.type === to.type;
  const keys = (fields) =>
    Object.keys(fields || {})
      .sort()
      .join(",");
  switch (to.type) {
    case "text":
    case "longtext":
      return typeof value === "string" && (!from || TEXT_TYPES.has(from.type));
    case "enum":
    case "icon":
    case "roleColor":
    case "position":
      return optionValues(to).includes(value);
    case "bool":
      return typeof value === "boolean";
    case "int":
      return Number.isInteger(value);
    case "image":
      return isObject(value) && (!from || same);
    case "imageSrc":
    case "mediaUrl":
      return typeof value === "string" && (!from || same);
    case "strings":
      return Array.isArray(value) && (!from || same);
    case "list":
      return Array.isArray(value) && same && keys(from.of) === keys(to.of);
    case "group":
    case "optional":
      return (
        (value === null || isObject(value)) &&
        same &&
        keys(from.fields) === keys(to.fields)
      );
    default:
      return false;
  }
}

/**
 * The entry in another layout: props the two layouts share (same key, a
 * value the new field takes) carry over, the rest start from defaultsFor.
 * `dropped` lists the old props keys with content that don't survive.
 */
export function carryOver(entry, toLayout) {
  if (!Object.hasOwn(LAYOUT_SCHEMAS, toLayout)) return { entry, dropped: [] };
  const fromFields = Object.hasOwn(LAYOUT_SCHEMAS, entry?.layout)
    ? LAYOUT_SCHEMAS[entry.layout].fields
    : null;
  const old = isObject(entry?.props) ? entry.props : {};
  const props = defaultsFor(toLayout);
  const carried = new Set();
  for (const [key, d] of Object.entries(LAYOUT_SCHEMAS[toLayout].fields)) {
    if (!(key in old)) continue;
    const from = fromFields ? fromFields[key] : null;
    if (fromFields && !from) continue;
    if (compatible(from, d, old[key])) {
      props[key] = deepClone(old[key]);
      carried.add(key);
    }
  }
  const dropped = Object.keys(old).filter(
    (k) => !carried.has(k) && filled(old[k])
  );
  return {
    entry: normalizeSlide({ ...deepClone(entry), layout: toLayout, props }),
    dropped,
  };
}

/**
 * Eyebrows numbered "NN · …" set to each slide's place among the shown
 * slides. Returns a new array; untouched entries are the same objects.
 */
export function renumberEyebrows(entries) {
  let visible = 0;
  return (Array.isArray(entries) ? entries : []).map((entry) => {
    if (!isObject(entry) || entry.hidden === true) return entry;
    visible += 1;
    const eyebrow = entry.props?.eyebrow;
    const match = typeof eyebrow === "string" && EYEBROW_NUMBER.exec(eyebrow);
    const number = String(visible).padStart(2, "0");
    if (!match || match[1] === number) return entry;
    return {
      ...entry,
      props: {
        ...entry.props,
        eyebrow: `${number} · ${eyebrow.slice(match[0].length)}`,
      },
    };
  });
}

/** The DOM id of the control for `path` ("props.people.2.name") on a slide. */
export function fieldId(slideId, path) {
  return `deck-field-${slideId}-${String(path ?? "").replaceAll(".", "-")}`;
}
