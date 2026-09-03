/**
 * Chapter 1 text-parity helpers (pure, no I/O).
 *
 * Shared by the importer round-trip test, scripts/check-chapter1-text-parity.mjs
 * and scripts/seed/gen-chapter1-repair-subsubsection-paragraphs.mjs so all
 * three agree on what "the same text" means.
 *
 * Parity is defined on the SET of non-empty normalized text strings a section
 * contains: every `text`, `title`, `imgCap` and break-section `steps[]` entry,
 * walked recursively through paragraphs / subSection / subSubSection. The
 * `animation` sub-objects are skipped — their `title` comes from the
 * animations table on the DB side, not from text.json — and so is the
 * `title` of a fullscreen marker (see collectTexts).
 */

/** Strip tags, collapse all whitespace (incl. nbsp), trim. */
export function normalizeText(s) {
  return String(s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\s\u00a0]+/g, " ")
    .trim();
}

/**
 * Split a leading heading tag off a paragraph's HTML. The importer folds a
 * level-2 group title into the first row as a `heading` block, which
 * contentBlocksToHTML renders inline (`<h4 …>Title</h4>text`). Returning the
 * heading separately keeps the set semantics aligned with text.json, where
 * the title and the paragraph text are distinct strings.
 */
export function splitLeadingHeading(html) {
  const m = /^\s*<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/i.exec(String(html ?? ""));
  if (!m) return { heading: null, body: html };
  return { heading: m[2], body: String(html).slice(m[0].length) };
}

const TEXT_KEYS = ["title", "imgCap"];
const CHILD_KEYS = ["paragraphs", "subSection", "subSubSection"];

/**
 * Collect every text-bearing string from a paragraph tree (text.json shape
 * OR the reader's transformed shape — they are the same shape by contract).
 * Returns the ordered list of normalized non-empty strings (duplicates kept;
 * callers build Sets from it).
 */
export function collectTexts(nodes, out = []) {
  for (const node of nodes || []) {
    if (!node || typeof node !== "object") continue;

    if (typeof node.text === "string") {
      const { heading, body } = splitLeadingHeading(node.text);
      if (heading) pushNormalized(out, heading);
      pushNormalized(out, body);
    }
    for (const key of TEXT_KEYS) {
      // A fullscreen marker ({ animationFull, animationId, title }) never
      // renders its own title: FullScreenIllustration shows the animation
      // record's title (animations.json / animations table) instead, and the
      // importer stores only the animation_full block. Not a text item.
      if (key === "title" && node.animationFull) continue;
      if (typeof node[key] === "string") pushNormalized(out, node[key]);
    }
    if (Array.isArray(node.steps)) {
      for (const step of node.steps) {
        if (typeof step === "string") pushNormalized(out, step);
        else if (step && typeof step === "object") collectTexts([step], out);
      }
    }
    for (const key of CHILD_KEYS) {
      if (Array.isArray(node[key])) collectTexts(node[key], out);
    }
  }
  return out;
}

function pushNormalized(out, s) {
  const n = normalizeText(s);
  if (n) out.push(n);
}

/** Set difference helper: items of `want` (ordered) not present in `have`. */
export function missingFrom(want, have) {
  const haveSet = new Set(have);
  const seen = new Set();
  const missing = [];
  for (const w of want) {
    if (!haveSet.has(w) && !seen.has(w)) {
      missing.push(w);
      seen.add(w);
    }
  }
  return missing;
}

/** Short, readable label for a text item in reports. */
export function shortLabel(s, n = 72) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * Attach `animation_key` / `animation_title` to DB paragraph rows from the
 * animations table — mirrors useChapter.fetchChapter step 3b, which the
 * transform relies on to build the reader's animation objects.
 */
export function attachAnimationKeys(paragraphs, animations) {
  const byId = new Map((animations || []).map((a) => [a.id, a]));
  for (const p of paragraphs || []) {
    const a = p.animation_id && byId.get(p.animation_id);
    if (a) {
      p.animation_key = a.animation_key;
      p.animation_title = a.title || "";
    }
  }
  return paragraphs;
}
